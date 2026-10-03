/**
 * Data Validation Engine
 * Detects circular dependencies, self-referencing, logical contradictions, and inconsistencies.
 */

import { Person, ValidationIssue, Relationship } from '../../data/models/types';

export function validatePerson(
  person: Partial<Person>,
  allPeople: Person[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const otherPeople = allPeople.filter((p) => p.id !== person.id);
  const otherPeopleMap = new Map<string, Person>();
  otherPeople.forEach((p) => otherPeopleMap.set(p.id, p));

  // 1. Name validation
  if (!person.name || person.name.trim().length === 0) {
    issues.push({
      id: 'name_empty',
      type: 'error',
      field: 'name',
      message: 'الاسم مطلوب ولا يمكن تركه فارغاً.',
    });
  } else {
    // Check duplicate names
    const duplicate = otherPeople.find(
      (p) => p.name.trim().toLowerCase() === person.name!.trim().toLowerCase()
    );
    if (duplicate) {
      issues.push({
        id: 'name_duplicate',
        type: 'warning',
        field: 'name',
        message: `يوجد شخص آخر بنفس الاسم: "${person.name}". يفضل إضافة تمييز لتفادي الخلط.`,
      });
    }
  }

  // 2. Gender check
  if (!person.gender) {
    issues.push({
      id: 'gender_missing',
      type: 'warning',
      field: 'gender',
      message: 'تحديد الجنس يساعد المحرك على صياغة الأسئلة بدقة.',
    });
  }

  // 3. Birth year / Age check
  const currentYear = new Date().getFullYear();
  if (person.birthYear !== undefined) {
    if (person.birthYear < 1900 || person.birthYear > currentYear) {
      issues.push({
        id: 'birth_year_unrealistic',
        type: 'error',
        field: 'birthYear',
        message: `سنة الميلاد (${person.birthYear}) غير واقعية.`,
      });
    }
  }

  // 4. Relationships validation
  const relationships = person.relationships || [];
  let fatherCount = 0;
  let motherCount = 0;

  for (const rel of relationships) {
    // Self-reference check
    if (rel.targetPersonId === person.id) {
      issues.push({
        id: `self_ref_${rel.type}`,
        type: 'error',
        message: `لا يمكن للشخص أن يكون ${getRelLabel(rel.type)} لنفسه.`,
      });
      continue;
    }

    const target = otherPeopleMap.get(rel.targetPersonId);
    if (!target) continue;

    if (rel.type === 'father') fatherCount++;
    if (rel.type === 'mother') motherCount++;

    // Check inverse contradiction
    const targetRels = target.relationships || [];
    const directContradiction = targetRels.find(
      (r) =>
        (r.targetPersonId === person.id &&
          ((rel.type === 'father' && r.type === 'father') ||
            (rel.type === 'mother' && r.type === 'mother') ||
            (rel.type === 'father' && r.type === 'mother') ||
            (rel.type === 'child' && r.type === 'child')))
    );

    if (directContradiction) {
      issues.push({
        id: `contradiction_${rel.targetPersonId}`,
        type: 'error',
        message: `تعارض مباشر في العلاقة مع "${target.name}": لا يمكن أن يكون كل منكما ${getRelLabel(rel.type)} للآخر.`,
      });
    }

    // Check age difference with parents
    if (
      person.birthYear !== undefined &&
      target.birthYear !== undefined
    ) {
      if (rel.type === 'father' || rel.type === 'mother') {
        if (target.birthYear >= person.birthYear) {
          issues.push({
            id: `parent_younger_${rel.targetPersonId}`,
            type: 'error',
            message: `سنة ميلاد الوالد (${target.birthYear}) بعد أو في نفس سنة ميلاد الابن (${person.birthYear}).`,
          });
        } else if (person.birthYear - target.birthYear < 12) {
          issues.push({
            id: `parent_age_gap_${rel.targetPersonId}`,
            type: 'warning',
            message: `فارق السن بين الوالد والابن (${person.birthYear - target.birthYear} سنة) صغير جداً.`,
          });
        }
      }

      if (rel.type === 'child') {
        if (target.birthYear <= person.birthYear) {
          issues.push({
            id: `child_older_${rel.targetPersonId}`,
            type: 'error',
            message: `سنة ميلاد الابن (${target.birthYear}) قبل أو في نفس سنة ميلاد الوالد (${person.birthYear}).`,
          });
        }
      }
    }
  }

  if (fatherCount > 1) {
    issues.push({
      id: 'multiple_fathers',
      type: 'warning',
      message: 'تم تحديد أكثر من أب للشخص الواحد.',
    });
  }

  if (motherCount > 1) {
    issues.push({
      id: 'multiple_mothers',
      type: 'warning',
      message: 'تم تحديد أكثر من أم للشخص الواحد.',
    });
  }

  // 5. Detect ancestor cycles (DFS)
  if (person.id && hasAncestorCycle(person.id, relationships, allPeople)) {
    issues.push({
      id: 'ancestor_cycle',
      type: 'error',
      message: 'يوجد حلقة دائرية مستحيلة في شجرة النسب (شخص سلف لنفسه).',
    });
  }

  return issues;
}

/**
 * Checks for cycles in parent relationships
 */
function hasAncestorCycle(
  startId: string,
  personRels: Relationship[],
  allPeople: Person[]
): boolean {
  const peopleMap = new Map<string, Person>();
  allPeople.forEach((p) => peopleMap.set(p.id, p));

  const visited = new Set<string>();

  function dfs(currId: string): boolean {
    if (currId === startId && visited.size > 0) return true;
    if (visited.has(currId)) return false;
    visited.add(currId);

    const currPerson = peopleMap.get(currId);
    const rels = currId === startId ? personRels : currPerson?.relationships || [];

    for (const r of rels) {
      if (r.type === 'father' || r.type === 'mother') {
        if (dfs(r.targetPersonId)) return true;
      }
    }

    return false;
  }

  for (const r of personRels) {
    if (r.type === 'father' || r.type === 'mother') {
      if (dfs(r.targetPersonId)) return true;
    }
  }

  return false;
}

function getRelLabel(type: Relationship['type']): string {
  switch (type) {
    case 'father': return 'أب';
    case 'mother': return 'أم';
    case 'spouse': return 'زوج/زوجة';
    case 'child': return 'ابن/ابنة';
    case 'sibling': return 'أخ/أخت';
    default: return type;
  }
}
