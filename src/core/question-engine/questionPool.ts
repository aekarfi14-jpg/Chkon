/**
 * Time-Aware Dynamic Question Pool Generator
 * Inspects all people in the group, evaluates their CURRENT valid temporal states,
 * and generates clean, natural Arabic questions covering:
 * - Stable core attributes (Gender, Age ranges, Generation)
 * - Temporal current states (Life status, Current city, Current profession, Current marital status)
 * - Relational Attribute Paths (Candidate -> Relative -> Relative's Current Attribute)
 * - Custom facts (Active facts)
 * - Named Reveal Questions (Reserved for final deduction stages)
 */

import {
  Person,
  Question,
  QuestionCategory,
  getCurrentLifeStatus,
  getCurrentCity,
  getCurrentProfession,
  getActiveFacts,
} from '../../data/models/types';
import { getCurrentEnrichedRelationships } from '../inference/relationshipInference';
import { deriveDeepProfile } from '../inference/deepKnowledgeInference';

export function generateQuestionPool(allPeople: Person[]): Question[] {
  const questions: Question[] = [];
  const currentYear = new Date().getFullYear();
  const peopleMap = new Map<string, Person>();
  allPeople.forEach((p) => peopleMap.set(p.id, p));

  // Helper to register unique question
  const addQuestion = (
    id: string,
    text: string,
    category: QuestionCategory,
    specificity: number,
    predicate: (p: Person, all: Person[]) => boolean | 'unknown',
    family: QuestionCategory = category,
    targetEntityId?: string
  ) => {
    if (!questions.some((q) => q.id === id)) {
      questions.push({
        id,
        text,
        category,
        family,
        specificity,
        predicate,
        targetEntityId,
        temporalScope: 'current',
      });
    }
  };

  // =========================================================================
  // 1. LIFE STATUS (Temporal Current State - Specificity: 0.15 - Discovery)
  // =========================================================================
  const hasAlive = allPeople.some((p) => getCurrentLifeStatus(p) === 'alive');
  const hasDeceased = allPeople.some((p) => getCurrentLifeStatus(p) === 'deceased');

  if (hasAlive && hasDeceased) {
    addQuestion(
      'life_status_alive',
      'هل الشخص على قيد الحياة؟',
      'life_status',
      0.15,
      (p) => {
        const status = getCurrentLifeStatus(p);
        if (status === 'unknown') return 'unknown';
        return status === 'alive';
      },
      'life_status'
    );
  }

  // =========================================================================
  // 2. GENDER (Static - Specificity: 0.1 - Discovery)
  // =========================================================================
  const hasMales = allPeople.some((p) => p.gender === 'male');
  const hasFemales = allPeople.some((p) => p.gender === 'female');

  if (hasMales && hasFemales) {
    addQuestion(
      'gender_male',
      'هل الشخص ذكر؟',
      'gender',
      0.1,
      (p) => {
        if (!p.gender) return 'unknown';
        return p.gender === 'male';
      },
      'gender'
    );
  }

  // =========================================================================
  // 3. AGE & GENERATION (Specificity: 0.2 - 0.35 - Discovery / Early Narrowing)
  // =========================================================================
  const peopleWithAges = allPeople.filter((p) => p.birthYear !== undefined);
  if (peopleWithAges.length >= 2) {
    const ages = peopleWithAges.map((p) => currentYear - p.birthYear!);

    // Under 30
    if (ages.some((a) => a < 30) && ages.some((a) => a >= 30)) {
      addQuestion(
        'age_under_30',
        'هل عمر الشخص أقل من 30 سنة؟',
        'age',
        0.25,
        (p) => {
          if (!p.birthYear) return 'unknown';
          return currentYear - p.birthYear < 30;
        },
        'age'
      );
    }

    // Over 50
    if (ages.some((a) => a >= 50) && ages.some((a) => a < 50)) {
      addQuestion(
        'age_over_50',
        'هل عمر الشخص 50 سنة أو أكثر؟',
        'age',
        0.3,
        (p) => {
          if (!p.birthYear) return 'unknown';
          return currentYear - p.birthYear >= 50;
        },
        'age'
      );
    }

    // Generation 2000s
    if (
      allPeople.some((p) => p.birthYear && p.birthYear >= 2000) &&
      allPeople.some((p) => p.birthYear && p.birthYear < 2000)
    ) {
      addQuestion(
        'born_after_2000',
        'هل ولد الشخص في عام 2000 أو بعده؟',
        'generation',
        0.3,
        (p) => {
          if (!p.birthYear) return 'unknown';
          return p.birthYear >= 2000;
        },
        'generation'
      );
    }
  }

  // =========================================================================
  // 4. CURRENT LOCATION / RESIDENCE (Specificity: 0.4 - Narrowing)
  // =========================================================================
  const currentCities = new Set<string>();
  allPeople.forEach((p) => {
    const city = getCurrentCity(p);
    if (city) currentCities.add(city);
  });

  currentCities.forEach((city) => {
    addQuestion(
      `current_city_${city}`,
      `هل يسكن (أو يقيم حالياً) في ${city}؟`,
      'location',
      0.4,
      (p) => {
        const c = getCurrentCity(p);
        if (!c) return 'unknown';
        return c.toLowerCase() === city.toLowerCase();
      },
      'location'
    );
  });

  // =========================================================================
  // 5. CURRENT PROFESSION (Specificity: 0.45 - 0.55 - Narrowing)
  // =========================================================================
  const currentProfessions = new Set<string>();
  allPeople.forEach((p) => {
    const prof = getCurrentProfession(p);
    if (prof) currentProfessions.add(prof);
  });

  currentProfessions.forEach((prof) => {
    addQuestion(
      `current_prof_${prof}`,
      `هل يعمل أو يمارس حالياً مهنة: ${prof}؟`,
      'profession',
      0.48,
      (p) => {
        const pr = getCurrentProfession(p);
        if (!pr) return 'unknown';
        return pr.toLowerCase() === prof.toLowerCase();
      },
      'profession'
    );
  });

  // =========================================================================
  // 6. CURRENT MARITAL & FAMILY STRUCTURE (Specificity: 0.35 - 0.42)
  // =========================================================================
  addQuestion(
    'status_married_current',
    'هل الشخص متزوج حالياً؟',
    'marital_status',
    0.35,
    (p, all) => {
      const activeRels = getCurrentEnrichedRelationships(p, all);
      const hasActiveSpouse = activeRels.some((r) => r.type === 'spouse');
      return hasActiveSpouse;
    },
    'marital_status'
  );

  addQuestion(
    'status_has_children',
    'هل لدى الشخص أطفال أو أبناء؟',
    'parenthood',
    0.38,
    (p, all) => {
      const activeRels = getCurrentEnrichedRelationships(p, all);
      return activeRels.some((r) => r.type === 'child');
    },
    'parenthood'
  );

  addQuestion(
    'status_has_siblings',
    'هل لدى الشخص إخوة أو أخوات؟',
    'siblings',
    0.35,
    (p, all) => {
      const activeRels = getCurrentEnrichedRelationships(p, all);
      return activeRels.some((r) => r.type === 'sibling');
    },
    'siblings'
  );

  // =========================================================================
  // 6.b DEEP MULTI-HOP ONTOLOGY & GENERATIONAL INFERENCE
  // =========================================================================
  const deepProfiles = new Map<string, ReturnType<typeof deriveDeepProfile>>();
  allPeople.forEach((p) => deepProfiles.set(p.id, deriveDeepProfile(p, allPeople)));

  const hasElder = allPeople.some((p) => deepProfiles.get(p.id)?.generationTier === 'elder');
  const hasYouth = allPeople.some((p) => deepProfiles.get(p.id)?.generationTier === 'youth');
  if (hasElder && hasYouth) {
    addQuestion(
      'generation_tier_youth',
      'هل الشخص من جيل الشباب أو الأبناء (أقل من 35 سنة تقريباً)؟',
      'generation',
      0.26,
      (p, all) => {
        const prof = deepProfiles.get(p.id) || deriveDeepProfile(p, all);
        if (prof.generationTier === 'unknown') return 'unknown';
        return prof.generationTier === 'youth';
      },
      'generation'
    );

    addQuestion(
      'generation_tier_elder',
      'هل الشخص من جيل الأجداد أو كبار العائلة؟',
      'generation',
      0.30,
      (p, all) => {
        const prof = deepProfiles.get(p.id) || deriveDeepProfile(p, all);
        if (prof.generationTier === 'unknown') return 'unknown';
        return prof.generationTier === 'elder';
      },
      'generation'
    );
  }

  // Grandchildren
  const anyHasGrandchildren = allPeople.some((p) => deepProfiles.get(p.id)?.hasGrandchildren);
  const anyNoGrandchildren = allPeople.some((p) => !deepProfiles.get(p.id)?.hasGrandchildren);
  if (anyHasGrandchildren && anyNoGrandchildren) {
    addQuestion(
      'status_has_grandchildren',
      'هل لدى الشخص أحفاد في هذه العائلة؟',
      'parenthood',
      0.34,
      (p, all) => {
        const prof = deepProfiles.get(p.id) || deriveDeepProfile(p, all);
        return prof.hasGrandchildren;
      },
      'parenthood'
    );
  }

  // Nieces / Nephews
  const anyHasNieces = allPeople.some((p) => deepProfiles.get(p.id)?.hasNiecesOrNephews);
  const anyNoNieces = allPeople.some((p) => !deepProfiles.get(p.id)?.hasNiecesOrNephews);
  if (anyHasNieces && anyNoNieces) {
    addQuestion(
      'status_has_nieces',
      'هل للشخص أبناء إخوة أو أخوات (أعمام/عمات أو أخوال/خالات)؟',
      'siblings',
      0.37,
      (p, all) => {
        const prof = deepProfiles.get(p.id) || deriveDeepProfile(p, all);
        return prof.hasNiecesOrNephews;
      },
      'siblings'
    );
  }

  // =========================================================================
  // 7. RELATIONAL ATTRIBUTE QUESTIONS (Paths to attributes - High Game Value!)
  // =========================================================================

  // A) Father's current profession (Candidate -> Father -> Father's Profession)
  const fatherProfessions = new Set<string>();
  allPeople.forEach((p) => {
    const activeRels = getCurrentEnrichedRelationships(p, allPeople);
    const fatherRel = activeRels.find((r) => r.type === 'father');
    if (fatherRel) {
      const father = peopleMap.get(fatherRel.targetPersonId);
      if (father) {
        const fp = getCurrentProfession(father);
        if (fp) fatherProfessions.add(fp);
      }
    }
  });

  fatherProfessions.forEach((prof) => {
    addQuestion(
      `rel_father_prof_${prof}`,
      `هل والده يعمل (أو كان يعمل) في مجال: ${prof}؟`,
      'relational_father',
      0.55,
      (p, all) => {
        const activeRels = getCurrentEnrichedRelationships(p, all);
        const fatherRel = activeRels.find((r) => r.type === 'father');
        if (!fatherRel) return 'unknown';
        const father = peopleMap.get(fatherRel.targetPersonId);
        if (!father) return 'unknown';
        const fp = getCurrentProfession(father);
        if (!fp) return 'unknown';
        return fp.toLowerCase() === prof.toLowerCase();
      },
      'relational_father'
    );
  });

  // B) Father's age threshold (> 60 years)
  addQuestion(
    'rel_father_age_over_60',
    'هل والده يبلغ من العمر 60 سنة أو أكثر؟',
    'relational_father',
    0.5,
    (p, all) => {
      const activeRels = getCurrentEnrichedRelationships(p, all);
      const fatherRel = activeRels.find((r) => r.type === 'father');
      if (!fatherRel) return 'unknown';
      const father = peopleMap.get(fatherRel.targetPersonId);
      if (!father || !father.birthYear) return 'unknown';
      return currentYear - father.birthYear >= 60;
    },
    'relational_father'
  );

  // C) Mother's current city (Candidate -> Mother -> Mother's City)
  const motherCities = new Set<string>();
  allPeople.forEach((p) => {
    const activeRels = getCurrentEnrichedRelationships(p, allPeople);
    const motherRel = activeRels.find((r) => r.type === 'mother');
    if (motherRel) {
      const mother = peopleMap.get(motherRel.targetPersonId);
      if (mother) {
        const mc = getCurrentCity(mother);
        if (mc) motherCities.add(mc);
      }
    }
  });

  motherCities.forEach((city) => {
    addQuestion(
      `rel_mother_city_${city}`,
      `هل والدته تعيش (أو تقيم) في ${city}؟`,
      'relational_mother',
      0.55,
      (p, all) => {
        const activeRels = getCurrentEnrichedRelationships(p, all);
        const motherRel = activeRels.find((r) => r.type === 'mother');
        if (!motherRel) return 'unknown';
        const mother = peopleMap.get(motherRel.targetPersonId);
        if (!mother) return 'unknown';
        const mc = getCurrentCity(mother);
        if (!mc) return 'unknown';
        return mc.toLowerCase() === city.toLowerCase();
      },
      'relational_mother'
    );
  });

  // D) Spouse's current profession (Candidate -> Active Spouse -> Spouse's Profession)
  const spouseProfessions = new Set<string>();
  allPeople.forEach((p) => {
    const activeRels = getCurrentEnrichedRelationships(p, allPeople);
    const spouseRel = activeRels.find((r) => r.type === 'spouse');
    if (spouseRel) {
      const spouse = peopleMap.get(spouseRel.targetPersonId);
      if (spouse) {
        const sp = getCurrentProfession(spouse);
        if (sp) spouseProfessions.add(sp);
      }
    }
  });

  spouseProfessions.forEach((prof) => {
    addQuestion(
      `rel_spouse_prof_${prof}`,
      `هل زوجه أو زوجته تعمل في مجال: ${prof}؟`,
      'relational_spouse',
      0.6,
      (p, all) => {
        const activeRels = getCurrentEnrichedRelationships(p, all);
        const spouseRel = activeRels.find((r) => r.type === 'spouse');
        if (!spouseRel) return false;
        const spouse = peopleMap.get(spouseRel.targetPersonId);
        if (!spouse) return 'unknown';
        const sp = getCurrentProfession(spouse);
        if (!sp) return 'unknown';
        return sp.toLowerCase() === prof.toLowerCase();
      },
      'relational_spouse'
    );
  });

  // E) Sibling with active hobby / fact
  addQuestion(
    'rel_sibling_has_football',
    'هل لدى الشخص أخ أو أخت يحب أو يلعب كرة القدم؟',
    'relational_sibling',
    0.58,
    (p, all) => {
      const activeRels = getCurrentEnrichedRelationships(p, all);
      const siblingRels = activeRels.filter((r) => r.type === 'sibling');
      if (siblingRels.length === 0) return false;

      const hasMatch = siblingRels.some((sr) => {
        const sibling = peopleMap.get(sr.targetPersonId);
        if (!sibling) return false;
        return getActiveFacts(sibling).some(
          (f) => f.key.includes('كرة القدم') && f.value !== false
        );
      });
      return hasMatch;
    },
    'relational_sibling'
  );

  // =========================================================================
  // 8. ACTIVE CUSTOM FACTS (Specificity: 0.5 for shared, up to 0.85 for unique)
  // =========================================================================
  const activeFactKeys = new Map<string, number>();
  allPeople.forEach((p) => {
    getActiveFacts(p).forEach((f) => {
      if (f.key && f.key.trim().length > 0) {
        const cleanKey = f.key.trim();
        activeFactKeys.set(cleanKey, (activeFactKeys.get(cleanKey) || 0) + 1);
      }
    });
  });

  activeFactKeys.forEach((count, key) => {
    const specificity = count === 1 ? 0.85 : 0.52;
    const cleanText = key.startsWith('هل') ? key : `هل ${key}؟`;

    addQuestion(
      `fact_${encodeURIComponent(key)}`,
      cleanText,
      'custom_fact',
      specificity,
      (p) => {
        const fact = getActiveFacts(p).find(
          (f) => f.key.trim().toLowerCase() === key.toLowerCase()
        );
        if (!fact) return false;
        return fact.value === true || (typeof fact.value === 'string' && fact.value.length > 0);
      },
      'custom_fact'
    );
  });

  // =========================================================================
  // 9. STRUCTURAL KINSHIP & FAMILY POSITION (No Direct Names - High Intellectual Deduction)
  // Specificity: 0.60 - 0.75
  // =========================================================================

  // A) Marital status & Children presence
  const hasSpouses = allPeople.some((p) => {
    const rels = getCurrentEnrichedRelationships(p, allPeople);
    return rels.some((r) => r.type === 'spouse' && (r.isCurrent !== false));
  });
  const hasUnmarried = allPeople.some((p) => {
    const rels = getCurrentEnrichedRelationships(p, allPeople);
    return !rels.some((r) => r.type === 'spouse' && (r.isCurrent !== false));
  });

  if (hasSpouses && hasUnmarried) {
    addQuestion(
      'structural_is_married',
      'هل الشخص متزوج حالياً (أو لديه شريك حياة)؟',
      'marital_status',
      0.45,
      (p, all) => {
        const rels = getCurrentEnrichedRelationships(p, all);
        return rels.some((r) => r.type === 'spouse' && (r.isCurrent !== false));
      },
      'marital_status'
    );
  }

  // B) Eldest child / First-born
  const peopleWithSiblings = allPeople.filter((p) => {
    const rels = getCurrentEnrichedRelationships(p, allPeople);
    return rels.some((r) => r.type === 'sibling');
  });

  if (peopleWithSiblings.length >= 2) {
    addQuestion(
      'structural_is_eldest_sibling',
      'هل الشخص هو الأكبر سناً بين إخوته وأخواته (الابن البكر)؟',
      'family_position',
      0.65,
      (p, all) => {
        if (!p.birthYear) return 'unknown';
        const rels = getCurrentEnrichedRelationships(p, all);
        const siblingRels = rels.filter((r) => r.type === 'sibling');
        if (siblingRels.length === 0) return 'unknown';

        let isEldest = true;
        for (const sr of siblingRels) {
          const sib = peopleMap.get(sr.targetPersonId);
          if (sib?.birthYear && sib.birthYear < p.birthYear) {
            isEldest = false;
            break;
          }
        }
        return isEldest;
      },
      'family_position'
    );
  }

  // C) Lives in same city as parents
  addQuestion(
    'structural_lives_same_city_parents',
    'هل يقيم الشخص في نفس المدينة مع والديه أو عائلته؟',
    'family_position',
    0.6,
    (p, all) => {
      const pCity = getCurrentCity(p);
      if (!pCity) return 'unknown';
      const rels = getCurrentEnrichedRelationships(p, all);
      const parentRels = rels.filter((r) => r.type === 'father' || r.type === 'mother');
      if (parentRels.length === 0) return 'unknown';

      const parentCities = parentRels
        .map((pr) => {
          const parent = peopleMap.get(pr.targetPersonId);
          return parent ? getCurrentCity(parent) : null;
        })
        .filter(Boolean);

      if (parentCities.length === 0) return 'unknown';
      return parentCities.some((c) => c?.toLowerCase() === pCity.toLowerCase());
    },
    'family_position'
  );

  return questions;
}
