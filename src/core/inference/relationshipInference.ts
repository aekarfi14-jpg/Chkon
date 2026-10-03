/**
 * Smart Relationship Inference Engine
 * Deduces reciprocal and transitive relationships without requiring double data entry.
 * Explicitly marks derived relationships with isInferred: true.
 */

import { Person, Relationship } from '../../data/models/types';

/**
 * Returns all relationships for a person, combining their explicitly declared relationships
 * with relationships inferred logically from other people in the group.
 */
export function getEnrichedRelationships(
  person: Person,
  allPeople: Person[]
): Relationship[] {
  const explicit = person.relationships || [];
  const inferred: Relationship[] = [];
  const personMap = new Map<string, Person>();
  allPeople.forEach((p) => personMap.set(p.id, p));

  // Helper to check if a relationship already exists
  const hasRelationship = (type: Relationship['type'], targetId: string) => {
    return (
      explicit.some((r) => r.type === type && r.targetPersonId === targetId) ||
      inferred.some((r) => r.type === type && r.targetPersonId === targetId)
    );
  };

  // 1. Inspect other people's relationships pointing to this person
  for (const other of allPeople) {
    if (other.id === person.id) continue;

    for (const rel of other.relationships || []) {
      if (rel.targetPersonId !== person.id) continue;

      // If other says "person is my father/mother" => other is child of person
      if (rel.type === 'father' || rel.type === 'mother') {
        if (!hasRelationship('child', other.id)) {
          inferred.push({
            id: `inferred_child_${other.id}_${person.id}`,
            type: 'child',
            targetPersonId: other.id,
            targetPersonName: other.name,
            isInferred: true,
          });
        }
      }

      // If other says "person is my child" => person is parent of other
      if (rel.type === 'child') {
        const parentType = person.gender === 'female' ? 'mother' : 'father';
        if (!hasRelationship(parentType, other.id)) {
          inferred.push({
            id: `inferred_parent_${other.id}_${person.id}`,
            type: parentType,
            targetPersonId: other.id,
            targetPersonName: other.name,
            isInferred: true,
          });
        }
      }

      // If other says "person is my spouse" => spouse is reciprocal
      if (rel.type === 'spouse') {
        if (!hasRelationship('spouse', other.id)) {
          inferred.push({
            id: `inferred_spouse_${other.id}_${person.id}`,
            type: 'spouse',
            targetPersonId: other.id,
            targetPersonName: other.name,
            isInferred: true,
          });
        }
      }

      // If other says "person is my sibling" => sibling is reciprocal
      if (rel.type === 'sibling') {
        if (!hasRelationship('sibling', other.id)) {
          inferred.push({
            id: `inferred_sibling_${other.id}_${person.id}`,
            type: 'sibling',
            targetPersonId: other.id,
            targetPersonName: other.name,
            isInferred: true,
          });
        }
      }
    }
  }

  // 2. Transitive Siblings: If person has parent P, and other has parent P (and person !== other)
  const myParents = new Set<string>();
  // from explicit
  explicit.forEach((r) => {
    if (r.type === 'father' || r.type === 'mother') {
      myParents.add(r.targetPersonId);
    }
  });
  // from others who declared person as child
  allPeople.forEach((p) => {
    if (p.relationships?.some((r) => r.type === 'child' && r.targetPersonId === person.id)) {
      myParents.add(p.id);
    }
  });

  if (myParents.size > 0) {
    for (const other of allPeople) {
      if (other.id === person.id) continue;
      // check other's parents
      const otherParents = new Set<string>();
      (other.relationships || []).forEach((r) => {
        if (r.type === 'father' || r.type === 'mother') {
          otherParents.add(r.targetPersonId);
        }
        if (r.type === 'child' && r.targetPersonId === other.id) {
          // not relevant
        }
      });
      allPeople.forEach((p) => {
        if (p.relationships?.some((r) => r.type === 'child' && r.targetPersonId === other.id)) {
          otherParents.add(p.id);
        }
      });

      // If they share at least one parent
      const sharesParent = Array.from(myParents).some((parentId) => otherParents.has(parentId));
      if (sharesParent && !hasRelationship('sibling', other.id)) {
        inferred.push({
          id: `inferred_sharedparent_sibling_${other.id}_${person.id}`,
          type: 'sibling',
          targetPersonId: other.id,
          targetPersonName: other.name,
          isInferred: true,
        });
      }
    }
  }

  // Populate names if missing
  const combined = [...explicit, ...inferred];
  return combined.map((rel) => {
    if (!rel.targetPersonName) {
      const target = personMap.get(rel.targetPersonId);
      return { ...rel, targetPersonName: target?.name || 'غير معروف' };
    }
    return rel;
  });
}

/**
 * Returns a clone of the person with fully enriched relationships
 */
export function enrichPerson(person: Person, allPeople: Person[]): Person {
  return {
    ...person,
    relationships: getEnrichedRelationships(person, allPeople),
  };
}
