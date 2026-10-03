import { describe, it, expect } from 'vitest';
import { Person } from '../../data/models/types';
import { DeductionEngine } from '../deduction/deductionEngine';
import { generateQuestionPool } from '../question-engine/questionPool';
import { getEnrichedRelationships } from '../inference/relationshipInference';
import { validatePerson } from '../validation/dataValidator';
import { calculateDataHealth } from '../validation/dataHealth';

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
});
