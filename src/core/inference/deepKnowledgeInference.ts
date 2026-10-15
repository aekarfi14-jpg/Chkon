/**
 * Deep Knowledge & Multi-Hop Ontological Inference Engine
 * Deducts hidden relational, generational, age, and geographic facts
 * from minimal user input so the engine reasons with maximum intelligence.
 */

import { Person, getCurrentCity, isRelationshipActive } from '../../data/models/types';
import { getCurrentEnrichedRelationships } from './relationshipInference';

export interface DeepInferredProfile {
  generationTier: 'elder' | 'middle' | 'youth' | 'unknown';
  estimatedMinAge: number;
  estimatedMaxAge: number;
  hasChildren: boolean;
  hasGrandchildren: boolean;
  hasGrandparents: boolean;
  hasNiecesOrNephews: boolean;
  inferredCity?: string;
  isMarriedOrParent: boolean;
  extendedFamilySize: number;
}

const currentYear = new Date().getFullYear();

/**
 * Derives comprehensive facts about a person even if fields are omitted
 */
export function deriveDeepProfile(
  person: Person,
  allPeople: Person[]
): DeepInferredProfile {
  const peopleMap = new Map<string, Person>();
  allPeople.forEach((p) => peopleMap.set(p.id, p));

  const rels = getCurrentEnrichedRelationships(person, allPeople);
  const children = rels.filter((r) => r.type === 'child');
  const parents = rels.filter((r) => r.type === 'father' || r.type === 'mother');
  const siblings = rels.filter((r) => r.type === 'sibling');
  const spouses = rels.filter((r) => r.type === 'spouse');

  // 1. Grandchildren (2-hop descendant)
  let hasGrandchildren = false;
  for (const c of children) {
    const childPerson = peopleMap.get(c.targetPersonId);
    if (childPerson) {
      const childRels = getCurrentEnrichedRelationships(childPerson, allPeople);
      if (childRels.some((r) => r.type === 'child')) {
        hasGrandchildren = true;
        break;
      }
    }
  }

  // 2. Grandparents (2-hop ancestor)
  let hasGrandparents = false;
  for (const p of parents) {
    const parentPerson = peopleMap.get(p.targetPersonId);
    if (parentPerson) {
      const pRels = getCurrentEnrichedRelationships(parentPerson, allPeople);
      if (pRels.some((r) => r.type === 'father' || r.type === 'mother')) {
        hasGrandparents = true;
        break;
      }
    }
  }

  // 3. Nieces or Nephews (Sibling -> Child)
  let hasNiecesOrNephews = false;
  for (const s of siblings) {
    const siblingPerson = peopleMap.get(s.targetPersonId);
    if (siblingPerson) {
      const sRels = getCurrentEnrichedRelationships(siblingPerson, allPeople);
      if (sRels.some((r) => r.type === 'child')) {
        hasNiecesOrNephews = true;
        break;
      }
    }
  }

  // 4. Age Estimation Correlative Reasoning
  let minAge = 0;
  let maxAge = 120;

  if (person.birthYear) {
    minAge = currentYear - person.birthYear;
    maxAge = minAge;
  } else {
    // If person has children, person must be at least ~18-20 years older than oldest child
    const childAges: number[] = [];
    children.forEach((c) => {
      const cp = peopleMap.get(c.targetPersonId);
      if (cp?.birthYear) childAges.push(currentYear - cp.birthYear);
    });
    if (childAges.length > 0) {
      const oldestChildAge = Math.max(...childAges);
      minAge = Math.max(minAge, oldestChildAge + 18);
    }

    // If person has grandchildren, minimum age is likely 40+
    if (hasGrandchildren) {
      minAge = Math.max(minAge, 42);
    }

    // If person has parents, person must be younger than parents
    const parentAges: number[] = [];
    parents.forEach((p) => {
      const pp = peopleMap.get(p.targetPersonId);
      if (pp?.birthYear) parentAges.push(currentYear - pp.birthYear);
    });
    if (parentAges.length > 0) {
      const youngestParentAge = Math.min(...parentAges);
      maxAge = Math.min(maxAge, youngestParentAge - 15);
    }

    // If person has grandparents, person is likely under 50
    if (hasGrandparents) {
      maxAge = Math.min(maxAge, 45);
    }

    // Sibling age clustering
    const siblingAges: number[] = [];
    siblings.forEach((s) => {
      const sp = peopleMap.get(s.targetPersonId);
      if (sp?.birthYear) siblingAges.push(currentYear - sp.birthYear);
    });
    if (siblingAges.length > 0) {
      const avgSiblingAge =
        siblingAges.reduce((a, b) => a + b, 0) / siblingAges.length;
      minAge = Math.max(minAge, Math.floor(avgSiblingAge - 14));
      maxAge = Math.min(maxAge, Math.ceil(avgSiblingAge + 14));
    }
  }

  // 5. Generation Tier
  let generationTier: 'elder' | 'middle' | 'youth' | 'unknown' = 'unknown';
  if (hasGrandchildren || minAge >= 55) {
    generationTier = 'elder';
  } else if (children.length > 0 || (minAge >= 30 && maxAge <= 65)) {
    generationTier = 'middle';
  } else if (hasGrandparents || maxAge < 30) {
    generationTier = 'youth';
  }

  // 6. Inferred City / Geographic Clustering
  let inferredCity = getCurrentCity(person);
  if (!inferredCity) {
    // Check spouse
    for (const s of spouses) {
      const sp = peopleMap.get(s.targetPersonId);
      const sc = sp ? getCurrentCity(sp) : undefined;
      if (sc) {
        inferredCity = sc;
        break;
      }
    }
  }
  if (!inferredCity && parents.length > 0) {
    // Check parents
    for (const p of parents) {
      const pp = peopleMap.get(p.targetPersonId);
      const pc = pp ? getCurrentCity(pp) : undefined;
      if (pc) {
        inferredCity = pc;
        break;
      }
    }
  }

  return {
    generationTier,
    estimatedMinAge: minAge,
    estimatedMaxAge: maxAge,
    hasChildren: children.length > 0,
    hasGrandchildren,
    hasGrandparents,
    hasNiecesOrNephews,
    inferredCity,
    isMarriedOrParent: spouses.length > 0 || children.length > 0,
    extendedFamilySize: rels.length,
  };
}
