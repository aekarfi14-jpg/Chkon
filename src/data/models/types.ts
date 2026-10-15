/**
 * Data models and interfaces for "Shkoun? — شكون؟"
 * Incorporates Temporal Knowledge, Static vs Dynamic Attributes,
 * and Time-Aware Relationship Semantics.
 */

export type Gender = 'male' | 'female' | 'other';

export type LifeStatus = 'alive' | 'deceased' | 'unknown';

export type RelationshipType = 'father' | 'mother' | 'spouse' | 'child' | 'sibling';

export interface TemporalRecord<T = string> {
  id: string;
  value: T;
  validFrom?: number;         // Year or epoch ms
  validUntil?: number | null; // null if currently active
  recordedAt: number;
  source?: 'user' | 'inferred';
  notes?: string;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  targetPersonId: string;
  targetPersonName?: string;
  validFrom?: number;
  validUntil?: number | null; // null indicates active relationship
  isCurrent?: boolean;        // Convenience flag (defaults to true if validUntil is null/undefined)
  endedReason?: 'divorce' | 'death' | 'other';
  isInferred?: boolean;       // True if inferred automatically by the engine
}

export interface CustomFact {
  id: string;
  key: string;                // e.g. "يلعب كرة القدم", "يحب الشخشوخة"
  value: boolean | string;
  category?: string;          // e.g. "هوايات", "عادات", "ألقاب", "سكن"
  validFrom?: number;
  validUntil?: number | null; // null if currently active
  recordedAt?: number;
}

export interface Person {
  // A) STATIC / STABLE ATTRIBUTES
  id: string;
  groupId: string;
  name: string;
  image?: string;             // Base64 data URL (compressed)
  gender?: Gender;
  birthYear?: number;
  createdAt: number;
  updatedAt: number;
  notes?: string;

  // B) TEMPORAL / CHANGEABLE ATTRIBUTES
  lifeStatus?: LifeStatus;
  deathYear?: number;
  city?: string;              // Current / Legacy convenience field
  profession?: string;        // Current / Legacy convenience field
  cityHistory?: TemporalRecord<string>[];
  professionHistory?: TemporalRecord<string>[];
  relationships: Relationship[];
  facts: CustomFact[];
  lastReviewedAt?: number;    // Epoch ms for Data Freshness tracking
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

export type Answer = 'YES' | 'PROBABLY' | 'UNKNOWN' | 'NO';

export type CharacterMood =
  | 'IDLE'
  | 'CURIOUS'
  | 'THINKING'
  | 'FOCUSED'
  | 'UNCERTAIN'
  | 'SURPRISED'
  | 'CONFIDENT'
  | 'REVEAL';

export type QuestionCategory =
  | 'gender'
  | 'life_status'
  | 'age'
  | 'generation'
  | 'location'
  | 'profession'
  | 'marital_status'
  | 'parenthood'
  | 'siblings'
  | 'family' // legacy compatibility
  | 'family_position'
  | 'relationship' // legacy compatibility
  | 'relational_father'
  | 'relational_mother'
  | 'relational_spouse'
  | 'relational_sibling'
  | 'relational_child'
  | 'custom_fact'
  | 'named_reveal';

export interface Question {
  id: string;
  text: string;
  category: QuestionCategory;
  family?: QuestionCategory;
  temporalScope?: 'current' | 'historical';
  targetField?: string;
  targetValue?: unknown;
  targetEntityId?: string;
  specificity: number; // 0 (broad, e.g. gender) to 1.0 (very specific, e.g. named parent)
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
  staleProfilesCount: number;
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

/**
 * =======================================================
 * DYNAMIC TEMPORAL ACCESSORS (With Sensible Legacy Defaults)
 * =======================================================
 */

export function getCurrentLifeStatus(person: Person): LifeStatus {
  if (person.lifeStatus) return person.lifeStatus;
  if (person.deathYear !== undefined) return 'deceased';
  return 'alive'; // Sensible default for active knowledge bases
}

export function getCurrentCity(person: Person): string | undefined {
  if (person.cityHistory && person.cityHistory.length > 0) {
    const active = person.cityHistory.find((r) => r.validUntil === null || r.validUntil === undefined);
    if (active) return active.value;
  }
  return person.city && person.city.trim().length > 0 ? person.city.trim() : undefined;
}

export function getCurrentProfession(person: Person): string | undefined {
  if (person.professionHistory && person.professionHistory.length > 0) {
    const active = person.professionHistory.find((r) => r.validUntil === null || r.validUntil === undefined);
    if (active) return active.value;
  }
  return person.profession && person.profession.trim().length > 0 ? person.profession.trim() : undefined;
}

export function isRelationshipActive(rel: Relationship): boolean {
  // Parent/child are permanent biological historical relationships
  if (rel.type === 'father' || rel.type === 'mother' || rel.type === 'child') {
    return true;
  }
  // Spouse / residence: respects validUntil or isCurrent flag
  if (rel.isCurrent !== undefined) return rel.isCurrent;
  if (rel.validUntil !== null && rel.validUntil !== undefined) {
    return false; // has past end date
  }
  return true;
}

export function getCurrentRelationships(person: Person): Relationship[] {
  return (person.relationships || []).filter(isRelationshipActive);
}

export function getActiveFacts(person: Person): CustomFact[] {
  return (person.facts || []).filter(
    (f) => f.validUntil === null || f.validUntil === undefined
  );
}
