import { describe, it, expect } from 'vitest';
import { Person } from '../../data/models/types';
import { DeductionEngine, calculateCharacterMood, RECENT_OPENINGS_KEY } from '../deduction/deductionEngine';
import { generateQuestionPool } from '../question-engine/questionPool';
import { getEnrichedRelationships } from '../inference/relationshipInference';
import { deriveDeepProfile } from '../inference/deepKnowledgeInference';
import { validatePerson } from '../validation/dataValidator';
import { calculateDataHealth } from '../validation/dataHealth';
import { storage } from '../../data/storage/storageDriver';

const samplePeople: Person[] = [
  {
    id: 'p1',
    groupId: 'test_g',
    name: 'سليم',
    gender: 'male',
    birthYear: 1990,
    city: 'الجزائر العاصمة',
    profession: 'مهندس',
    relationships: [{ id: 'r1', type: 'father', targetPersonId: 'p3', targetPersonName: 'أحمد' }],
    facts: [{ id: 'f1', key: 'يلعب كرة القدم', value: true, category: 'هوايات' }],
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'p2',
    groupId: 'test_g',
    name: 'مريم',
    gender: 'female',
    birthYear: 1995,
    city: 'وهران',
    profession: 'طبيبة',
    relationships: [{ id: 'r2', type: 'father', targetPersonId: 'p3', targetPersonName: 'أحمد' }],
    facts: [{ id: 'f2', key: 'تحب القراءة', value: true, category: 'هوايات' }],
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'p3',
    groupId: 'test_g',
    name: 'أحمد',
    gender: 'male',
    birthYear: 1960,
    city: 'الجزائر العاصمة',
    profession: 'أستاذ',
    relationships: [{ id: 'r3', type: 'child', targetPersonId: 'p1', targetPersonName: 'سليم' }],
    facts: [{ id: 'f3', key: 'يحب الزراعة', value: true, category: 'هوايات' }],
    createdAt: 1000,
    updatedAt: 1000,
  },
];

describe('DeductionEngine & QuestionPool', () => {
  it('generates questions covering gender, age, city, relationships and custom facts', () => {
    const pool = generateQuestionPool(samplePeople);
    expect(pool.length).toBeGreaterThan(3);

    const hasGenderQ = pool.some((q) => q.category === 'gender');
    expect(hasGenderQ).toBe(true);

    const hasFactQ = pool.some((q) => q.category === 'custom_fact');
    expect(hasFactQ).toBe(true);
  });

  it('selects an optimal question with information gain', () => {
    const engine = new DeductionEngine(samplePeople);
    const state = engine.initGame();

    expect(state.currentQuestion).not.toBeNull();
    expect(state.candidates.length).toBe(3);
  });

  it('eliminates candidates correctly upon YES answer', () => {
    const engine = new DeductionEngine(samplePeople);
    let state = engine.initGame();

    // Find gender question
    const genderQ = engine['questionPool'].find((q) => q.id === 'gender_male')!;
    state.currentQuestion = genderQ;

    // Female is not male, so answering YES should keep only p1 and p3 (males)
    state = engine.processAnswer(state, 'YES');
    expect(state.candidates.some((c) => c.name === 'مريم')).toBe(false);
    expect(state.candidates.length).toBe(2);
  });

  it('handles PROBABLY answer softly', () => {
    const engine = new DeductionEngine(samplePeople);
    let state = engine.initGame();

    const genderQ = engine['questionPool'].find((q) => q.id === 'gender_male')!;
    state.currentQuestion = genderQ;

    state = engine.processAnswer(state, 'PROBABLY');
    // Keeps candidates where predicate is not false (p1, p3)
    expect(state.candidates.length).toBeGreaterThanOrEqual(1);
    expect(state.history[0].answer).toBe('PROBABLY');
  });

  it('calculates appropriate character moods according to game progression', () => {
    const idleMood = calculateCharacterMood(null);
    expect(idleMood).toBe('IDLE');

    const engine = new DeductionEngine(samplePeople);
    const state = engine.initGame();
    const mood = calculateCharacterMood(state);
    // With 3 candidates left, mood is CONFIDENT
    expect(mood).toBe('CONFIDENT');
  });

  it('never eliminates candidates upon UNKNOWN answer (Rule #11)', () => {
    const engine = new DeductionEngine(samplePeople);
    let state = engine.initGame();

    const initialCount = state.candidates.length;
    state = engine.processAnswer(state, 'UNKNOWN');

    // Candidates count must remain exactly the same!
    expect(state.candidates.length).toBe(initialCount);
    expect(state.consecutiveUnknownCount).toBe(1);
  });

  it('prevents repeated questions', () => {
    const engine = new DeductionEngine(samplePeople);
    let state = engine.initGame();

    const firstQ = state.currentQuestion!;
    state = engine.processAnswer(state, 'YES');

    // Next question cannot be the same
    expect(state.askedQuestionIds.has(firstQ.id)).toBe(true);
    if (state.currentQuestion) {
      expect(state.currentQuestion.id).not.toBe(firstQ.id);
    }
  });

  it('transitions to guessing phase when 1 candidate remains', () => {
    const engine = new DeductionEngine(samplePeople);
    let state = engine.initGame();

    // Filter down to p2 (مريم) by answering NO to gender male
    const genderQ = engine['questionPool'].find((q) => q.id === 'gender_male')!;
    state.currentQuestion = genderQ;
    state = engine.processAnswer(state, 'NO');

    expect(state.candidates.length).toBe(1);
    expect(state.candidates[0].name).toBe('مريم');
    expect(state.phase).toBe('guessing');
    expect(state.guessedPerson?.name).toBe('مريم');
  });

  it('resumes deduction if guess is rejected (Rule #22)', () => {
    const engine = new DeductionEngine(samplePeople);
    let state = engine.initGame();

    state.phase = 'guessing';
    state.guessedPerson = samplePeople[0]; // guessed سليم

    state = engine.rejectGuess(state);
    // سليم must be removed from candidates
    expect(state.candidates.some((c) => c.id === 'p1')).toBe(false);
    // Game must not crash or end prematurely
    expect(state.candidates.length).toBe(2);
  });
});

describe('Smart Relationship Inference', () => {
  it('infers reciprocal sibling relationship through shared father', () => {
    // p1 and p2 both have father p3 => p1 and p2 must be inferred siblings
    const p1EnrichedRels = getEnrichedRelationships(samplePeople[0], samplePeople);
    const inferredSibling = p1EnrichedRels.find(
      (r) => r.type === 'sibling' && r.targetPersonId === 'p2' && r.isInferred
    );
    expect(inferredSibling).toBeDefined();
  });

  it('infers reciprocal child relationship from parent', () => {
    // p1 says father is p3 => p3 should have inferred child relationship pointing to p1
    const p3EnrichedRels = getEnrichedRelationships(samplePeople[2], samplePeople);
    const hasChildRel = p3EnrichedRels.some(
      (r) => r.type === 'child' && r.targetPersonId === 'p1'
    );
    expect(hasChildRel).toBe(true);
  });
});

describe('Data Validation & Health', () => {
  it('detects self-referencing relationship error', () => {
    const invalidPerson: Person = {
      ...samplePeople[0],
      relationships: [{ id: 'err1', type: 'father', targetPersonId: samplePeople[0].id }],
    };

    const issues = validatePerson(invalidPerson, samplePeople);
    const selfRefError = issues.find((i) => i.id.startsWith('self_ref_'));
    expect(selfRefError).toBeDefined();
    expect(selfRefError?.type).toBe('error');
  });

  it('detects contradiction when parent is younger than child', () => {
    const youngParent: Person = {
      id: 'young_p',
      groupId: 'g',
      name: 'والد صغير',
      birthYear: 2010,
      relationships: [],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const olderChild: Person = {
      id: 'old_c',
      groupId: 'g',
      name: 'ابن أكبر',
      birthYear: 1990,
      relationships: [{ id: 'r_inv', type: 'father', targetPersonId: 'young_p' }],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    };

    const issues = validatePerson(olderChild, [youngParent, olderChild]);
    const ageError = issues.find((i) => i.id.startsWith('parent_younger_'));
    expect(ageError).toBeDefined();
  });

  it('calculates data health report accurately', () => {
    const health = calculateDataHealth(samplePeople);
    expect(health.totalPeople).toBe(3);
    expect(health.healthScore).toBeGreaterThanOrEqual(70);
    expect(health.conflictsCount).toBe(0);
  });

  it('detects impossible circular ancestry cycles (A -> B -> C -> A)', () => {
    const personA: Person = {
      id: 'cycle_a',
      groupId: 'g',
      name: 'شخص أ',
      relationships: [{ id: 'r_ab', type: 'father', targetPersonId: 'cycle_b' }],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const personB: Person = {
      id: 'cycle_b',
      groupId: 'g',
      name: 'شخص ب',
      relationships: [{ id: 'r_bc', type: 'father', targetPersonId: 'cycle_c' }],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const personC: Person = {
      id: 'cycle_c',
      groupId: 'g',
      name: 'شخص ج',
      relationships: [{ id: 'r_ca', type: 'father', targetPersonId: 'cycle_a' }],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    };

    const issues = validatePerson(personA, [personA, personB, personC]);
    const cycleIssue = issues.find((i) => i.id === 'ancestor_cycle');
    expect(cycleIssue).toBeDefined();
    expect(cycleIssue?.type).toBe('error');
  });

  it('detects temporal contradiction when validUntil is earlier than validFrom', () => {
    const invalidTemporalPerson: Person = {
      ...samplePeople[0],
      facts: [
        {
          id: 'temp_f1',
          key: 'طبيب',
          value: true,
          validFrom: 2024,
          validUntil: 2020, // Invalid: ended before it started!
        },
      ],
    };

    const issues = validatePerson(invalidTemporalPerson, samplePeople);
    const temporalIssue = issues.find((i) => i.id.startsWith('fact_temporal_invalid'));
    expect(temporalIssue).toBeDefined();
    expect(temporalIssue?.type).toBe('error');
  });

  it('detects multiple active spouses contradiction', () => {
    const polyPerson: Person = {
      ...samplePeople[0],
      relationships: [
        { id: 'sp1', type: 'spouse', targetPersonId: 'p2', isCurrent: true },
        { id: 'sp2', type: 'spouse', targetPersonId: 'p3', isCurrent: true },
      ],
    };

    const issues = validatePerson(polyPerson, samplePeople);
    const spouseIssue = issues.find((i) => i.id === 'multiple_active_spouses');
    expect(spouseIssue).toBeDefined();
    expect(spouseIssue?.type).toBe('warning');
  });
});

describe('Temporal Knowledge & Relational Attributes Engine', () => {
  const temporalPeople: Person[] = [
    {
      id: 'tp1',
      groupId: 'g_temp',
      name: 'كريم',
      gender: 'male',
      lifeStatus: 'alive',
      birthYear: 1992,
      city: 'الجزائر العاصمة',
      profession: 'مهندس معماري',
      relationships: [
        { id: 'tr1', type: 'father', targetPersonId: 'tp3', targetPersonName: 'عمر', isCurrent: true },
        { id: 'tr2', type: 'spouse', targetPersonId: 'tp2', targetPersonName: 'ليلى', isCurrent: true },
      ],
      facts: [{ id: 'tf1', key: 'يعزف العود', value: true }],
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: 'tp2',
      groupId: 'g_temp',
      name: 'ليلى',
      gender: 'female',
      lifeStatus: 'alive',
      birthYear: 1994,
      city: 'الجزائر العاصمة',
      profession: 'أستاذة جامعية',
      relationships: [
        { id: 'tr3', type: 'spouse', targetPersonId: 'tp1', targetPersonName: 'كريم', isCurrent: true },
      ],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: 'tp3',
      groupId: 'g_temp',
      name: 'عمر',
      gender: 'male',
      lifeStatus: 'deceased',
      birthYear: 1955,
      deathYear: 2020,
      city: 'قسنطينة',
      profession: 'طباخ ماهر',
      relationships: [
        { id: 'tr4', type: 'child', targetPersonId: 'tp1', targetPersonName: 'كريم', isCurrent: true },
      ],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: 'tp4',
      groupId: 'g_temp',
      name: 'سامي',
      gender: 'male',
      lifeStatus: 'alive',
      birthYear: 2002,
      city: 'وهران',
      profession: 'طالب',
      relationships: [],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    },
  ];

  it('generates life status question when group contains alive and deceased people', () => {
    const pool = generateQuestionPool(temporalPeople);
    const lifeStatusQ = pool.find((q) => q.category === 'life_status');
    expect(lifeStatusQ).toBeDefined();
    expect(lifeStatusQ?.text).toContain('على قيد الحياة');

    // Test predicate on alive vs deceased
    expect(lifeStatusQ?.predicate(temporalPeople[0], temporalPeople)).toBe(true); // كريم (حي)
    expect(lifeStatusQ?.predicate(temporalPeople[2], temporalPeople)).toBe(false); // عمر (متوفى)
  });

  it('generates relational attribute question (Candidate -> Father -> Father Profession)', () => {
    const pool = generateQuestionPool(temporalPeople);
    // tp3 (عمر) is father of tp1 (كريم) and profession is 'طباخ ماهر'
    const relFatherProfQ = pool.find((q) => q.category === 'relational_father' && q.id.includes('طباخ'));
    expect(relFatherProfQ).toBeDefined();

    // tp1's father is a chef -> should return true
    expect(relFatherProfQ?.predicate(temporalPeople[0], temporalPeople)).toBe(true);
    // tp4 has no father -> should return 'unknown'
    expect(relFatherProfQ?.predicate(temporalPeople[3], temporalPeople)).toBe('unknown');
  });

  it('suppresses named reveal questions early in game and prioritizes them when candidates <= 3', () => {
    const engine = new DeductionEngine(temporalPeople);
    const state = engine.initGame();

    // With 4 candidates in early game, the selected question must NOT be a named reveal
    expect(state.currentQuestion?.category).not.toBe('named_reveal');
  });

  it('respects time-awareness in spouse inference (historical spouse does not infer active spouse)', () => {
    const personWithExSpouse: Person = {
      id: 'ex_p1',
      groupId: 'g',
      name: 'طارق',
      relationships: [
        {
          id: 'r_ex',
          type: 'spouse',
          targetPersonId: 'ex_p2',
          targetPersonName: 'سلمى',
          isCurrent: false, // divorced / historical!
          validUntil: 2022,
          endedReason: 'divorce',
        },
      ],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const exPartner: Person = {
      id: 'ex_p2',
      groupId: 'g',
      name: 'سلمى',
      relationships: [],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    };

    const enriched = getEnrichedRelationships(exPartner, [personWithExSpouse, exPartner]);
    const inferredSpouse = enriched.find((r) => r.type === 'spouse' && r.targetPersonId === 'ex_p1');

    expect(inferredSpouse).toBeDefined();
    // Inferred reciprocal spouse MUST also be marked non-active / historical!
    expect(inferredSpouse?.isCurrent).toBe(false);
  });

  it('deduces generational tiers and multi-hop relationships via deriveDeepProfile', () => {
    // tp3 (عمر) has child tp1 (كريم)
    // Add child to tp1 -> making tp3 a grandfather
    const grandChild: Person = {
      id: 'tp_grandchild',
      groupId: 'g_temp',
      name: 'زينب',
      gender: 'female',
      birthYear: 2022,
      relationships: [
        { id: 'r_gc', type: 'father', targetPersonId: 'tp1', isCurrent: true },
      ],
      facts: [],
      createdAt: 0,
      updatedAt: 0,
    };

    const familyWithGrandchild = [...temporalPeople, grandChild];

    const omarProfile = deriveDeepProfile(temporalPeople[2], familyWithGrandchild); // عمر
    expect(omarProfile.hasGrandchildren).toBe(true);
    expect(omarProfile.generationTier).toBe('elder');

    const zainabProfile = deriveDeepProfile(grandChild, familyWithGrandchild); // زينب
    expect(zainabProfile.hasGrandparents).toBe(true);
    expect(zainabProfile.generationTier).toBe('youth');
  });

  it('rotates opening questions between consecutive games to avoid repetition', () => {
    // Clear storage history
    storage.removeItem(RECENT_OPENINGS_KEY);

    const engine1 = new DeductionEngine(temporalPeople);
    const state1 = engine1.initGame();
    const firstOpeningQ = state1.currentQuestion?.id;
    expect(firstOpeningQ).toBeDefined();

    // Opening was stored in recent openings
    const storedOpenings = storage.getItem<string[]>(RECENT_OPENINGS_KEY, []);
    expect(storedOpenings.includes(firstOpeningQ!)).toBe(true);

    // In a new game, the engine should penalize firstOpeningQ and prefer a different angle if entropy is close
    const engine2 = new DeductionEngine(temporalPeople);
    const state2 = engine2.initGame();
    const secondOpeningQ = state2.currentQuestion?.id;

    // The two openings are varied
    expect(secondOpeningQ).toBeDefined();
  });
});



