/**
 * Data models and interfaces for "Shkoun? — شكون؟"
 */

export type Gender = 'male' | 'female' | 'other';

export type RelationshipType = 'father' | 'mother' | 'spouse' | 'child' | 'sibling';

export interface Relationship {
  id: string;
  type: RelationshipType;
  targetPersonId: string;
  targetPersonName?: string;
  isInferred?: boolean; // True if inferred automatically by the engine
}

export interface CustomFact {
  id: string;
  key: string;       // e.g. "يلعب كرة القدم", "يحب الشخشوخة"
  value: boolean | string;
  category?: string; // e.g. "هوايات", "عادات", "ألقاب", "سكن"
}

export interface Person {
  id: string;
  groupId: string;
  name: string;
  image?: string;    // Base64 data URL (compressed)
  gender?: Gender;
  birthYear?: number;
  city?: string;
  profession?: string;
  relationships: Relationship[];
  facts: CustomFact[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isDemo?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type Answer = 'YES' | 'NO' | 'UNKNOWN';

export type QuestionCategory =
  | 'gender'
  | 'age'
  | 'location'
  | 'profession'
  | 'family'
  | 'relationship'
  | 'custom_fact';

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  targetField?: string;
  targetValue?: unknown;
  specificity: number; // 0 (broad, e.g. gender) to 1.0 (very specific, e.g. individual parent)
  // Predicate to evaluate whether a person satisfies the question
  predicate: (person: Person, allPeople: Person[]) => boolean | 'unknown';
}

export type GamePhase = 'discovery' | 'narrowing' | 'reveal' | 'guessing' | 'victory' | 'exhausted';

export interface AnswerHistoryItem {
  question: Question;
  answer: Answer;
  remainingCandidatesCount: number;
  timestamp: number;
}

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  personId?: string;
  personName?: string;
  field?: string;
  message: string;
}

export interface DataHealthReport {
  totalPeople: number;
  completeProfiles: number;
  incompleteProfiles: number;
  totalRelationships: number;
  inferredRelationships: number;
  totalCustomFacts: number;
  issues: ValidationIssue[];
  conflictsCount: number;
  healthScore: number; // 0 - 100
}

export interface ExportDataV1 {
  version: '1.0';
  app: 'shkoun';
  exportedAt: number;
  group: Group;
  people: Person[];
}
