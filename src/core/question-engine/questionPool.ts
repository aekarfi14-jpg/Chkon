/**
 * Dynamic Question Pool Generator
 * Inspects all people in the group and creates clean, direct Arabic questions
 * with varying specificity for the deduction engine.
 */

import { Person, Question, QuestionCategory } from '../../data/models/types';
import { getEnrichedRelationships } from '../inference/relationshipInference';

export function generateQuestionPool(allPeople: Person[]): Question[] {
  const questions: Question[] = [];
  const currentYear = new Date().getFullYear();

  // Helper to register unique question
  const addQuestion = (
    id: string,
    text: string,
    category: QuestionCategory,
    specificity: number,
    predicate: (p: Person, all: Person[]) => boolean | 'unknown'
  ) => {
    if (!questions.some((q) => q.id === id)) {
      questions.push({
        id,
        text,
        category,
        specificity,
        predicate,
      });
    }
  };

  // 1. GENDER QUESTIONS (Specificity: 0.1 - Discovery)
  const hasMales = allPeople.some((p) => p.gender === 'male');
  const hasFemales = allPeople.some((p) => p.gender === 'female');

  if (hasMales && hasFemales) {
    addQuestion('gender_male', 'هل الشخص ذكر؟', 'gender', 0.1, (p) => {
      if (!p.gender) return 'unknown';
      return p.gender === 'male';
    });
  }

  // 2. AGE & GENERATION (Specificity: 0.2 - 0.35 - Discovery / Early Narrowing)
  const peopleWithAges = allPeople.filter((p) => p.birthYear !== undefined);
  if (peopleWithAges.length >= 2) {
    const ages = peopleWithAges.map((p) => currentYear - p.birthYear!);

    // Check under 30
    const hasUnder30 = ages.some((a) => a < 30);
    const hasOver30 = ages.some((a) => a >= 30);
    if (hasUnder30 && hasOver30) {
      addQuestion('age_under_30', 'هل عمر الشخص أقل من 30 سنة؟', 'age', 0.25, (p) => {
        if (!p.birthYear) return 'unknown';
        return currentYear - p.birthYear < 30;
      });
    }

    // Check over 50
    const hasOver50 = ages.some((a) => a >= 50);
    const hasUnder50 = ages.some((a) => a < 50);
    if (hasOver50 && hasUnder50) {
      addQuestion('age_over_50', 'هل عمر الشخص 50 سنة أو أكثر؟', 'age', 0.3, (p) => {
        if (!p.birthYear) return 'unknown';
        return currentYear - p.birthYear >= 50;
      });
    }

    // Generation 2000s
    const bornAfter2000 = allPeople.some((p) => p.birthYear && p.birthYear >= 2000);
    const bornBefore2000 = allPeople.some((p) => p.birthYear && p.birthYear < 2000);
    if (bornAfter2000 && bornBefore2000) {
      addQuestion('born_after_2000', 'هل ولد الشخص في عام 2000 أو بعده؟', 'age', 0.3, (p) => {
        if (!p.birthYear) return 'unknown';
        return p.birthYear >= 2000;
      });
    }
  }

  // 3. LOCATION / CITIES (Specificity: 0.4 - Narrowing)
  const cities = new Set<string>();
  allPeople.forEach((p) => {
    if (p.city && p.city.trim().length > 0) {
      cities.add(p.city.trim());
    }
  });

  cities.forEach((city) => {
    addQuestion(`city_${city}`, `هل يسكن (أو يقيم) في ${city}؟`, 'location', 0.4, (p) => {
      if (!p.city) return 'unknown';
      return p.city.trim().toLowerCase() === city.toLowerCase();
    });
  });

  // 4. PROFESSIONS & OCCUPATIONS (Specificity: 0.45 - 0.55 - Narrowing)
  const professions = new Set<string>();
  allPeople.forEach((p) => {
    if (p.profession && p.profession.trim().length > 0) {
      professions.add(p.profession.trim());
    }
  });

  professions.forEach((prof) => {
    addQuestion(`prof_${prof}`, `هل يعمل أو يدرس في مجال: ${prof}؟`, 'profession', 0.5, (p) => {
      if (!p.profession) return 'unknown';
      return p.profession.trim().toLowerCase() === prof.toLowerCase();
    });
  });

  // 5. MARITAL & PARENTING STATUS (Specificity: 0.35 - 0.45)
  addQuestion('status_married', 'هل الشخص متزوج(ة)؟', 'family', 0.35, (p, all) => {
    const rels = getEnrichedRelationships(p, all);
    const hasSpouse = rels.some((r) => r.type === 'spouse');
    return hasSpouse;
  });

  addQuestion('status_has_children', 'هل لدى الشخص أطفال أو أبناء؟', 'family', 0.38, (p, all) => {
    const rels = getEnrichedRelationships(p, all);
    const hasChild = rels.some((r) => r.type === 'child');
    return hasChild;
  });

  addQuestion('status_has_siblings', 'هل لدى الشخص إخوة أو أخوات؟', 'family', 0.35, (p, all) => {
    const rels = getEnrichedRelationships(p, all);
    const hasSibling = rels.some((r) => r.type === 'sibling');
    return hasSibling;
  });

  // 6. DIRECT RELATIONSHIPS (Specificity: 0.65 - 0.85 - Narrowing to Reveal)
  // Check for parents
  const parents = allPeople.filter((p) => {
    return allPeople.some((child) => {
      const rels = getEnrichedRelationships(child, allPeople);
      return rels.some((r) => (r.type === 'father' || r.type === 'mother') && r.targetPersonId === p.id);
    });
  });

  parents.forEach((parent) => {
    const relLabel = parent.gender === 'female' ? 'ابن/ابنة' : 'ابن/ابنة';
    addQuestion(
      `parent_of_${parent.id}`,
      `هل الشخص هو ${relLabel} ${parent.name}؟`,
      'relationship',
      0.75,
      (p, all) => {
        const rels = getEnrichedRelationships(p, all);
        return rels.some(
          (r) => (r.type === 'father' || r.type === 'mother') && r.targetPersonId === parent.id
        );
      }
    );
  });

  // Check for spouses
  const spouses = allPeople.filter((p) => {
    const rels = getEnrichedRelationships(p, allPeople);
    return rels.some((r) => r.type === 'spouse');
  });

  spouses.forEach((spouse) => {
    addQuestion(
      `spouse_of_${spouse.id}`,
      `هل الشخص متزوج من ${spouse.name}؟`,
      'relationship',
      0.8,
      (p, all) => {
        const rels = getEnrichedRelationships(p, all);
        return rels.some((r) => r.type === 'spouse' && r.targetPersonId === spouse.id);
      }
    );
  });

  // 7. CUSTOM FACTS (Specificity: 0.5 for shared, up to 0.9 for unique facts)
  const factKeys = new Map<string, number>();
  allPeople.forEach((p) => {
    (p.facts || []).forEach((f) => {
      if (f.key && f.key.trim().length > 0) {
        const cleanKey = f.key.trim();
        factKeys.set(cleanKey, (factKeys.get(cleanKey) || 0) + 1);
      }
    });
  });

  factKeys.forEach((count, key) => {
    // If only 1 person has this fact, it's a high-specificity Reveal clue (0.9)
    // If multiple people share it, it's a Narrowing clue (0.55)
    const specificity = count === 1 ? 0.9 : 0.55;
    const cleanText = key.startsWith('هل') ? key : `هل ${key}؟`;

    addQuestion(`fact_${encodeURIComponent(key)}`, cleanText, 'custom_fact', specificity, (p) => {
      const fact = (p.facts || []).find((f) => f.key.trim().toLowerCase() === key.toLowerCase());
      if (!fact) return false;
      return fact.value === true || (typeof fact.value === 'string' && fact.value.length > 0);
    });
  });

  return questions;
}
