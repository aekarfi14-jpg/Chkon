/**
 * Data Health Calculator
 * Computes health score, completeness metrics, and issues summary for a group.
 */

import { Person, DataHealthReport, ValidationIssue } from '../../data/models/types';
import { validatePerson } from './dataValidator';
import { getEnrichedRelationships } from '../inference/relationshipInference';

export function calculateDataHealth(people: Person[]): DataHealthReport {
  const issues: ValidationIssue[] = [];
  let completeProfiles = 0;
  let totalExplicitRels = 0;
  let totalInferredRels = 0;
  let totalCustomFacts = 0;

  people.forEach((p) => {
    // Collect issues
    const personIssues = validatePerson(p, people);
    personIssues.forEach((issue) => {
      issues.push({
        ...issue,
        personId: p.id,
        personName: p.name,
      });
    });

    // Completeness check
    const hasImage = !!p.image;
    const hasGender = !!p.gender;
    const hasAge = p.birthYear !== undefined;
    const hasCity = !!p.city && p.city.trim().length > 0;
    const hasProfession = !!p.profession && p.profession.trim().length > 0;
    const hasFacts = (p.facts || []).length > 0;
    const hasRels = (p.relationships || []).length > 0;

    // A profile is complete if it has gender, (age or city or profession), and at least some fact or relation
    const scorePoints =
      (hasGender ? 25 : 0) +
      (hasAge ? 20 : 0) +
      (hasCity ? 15 : 0) +
      (hasProfession ? 15 : 0) +
      (hasFacts || hasRels ? 20 : 0) +
      (hasImage ? 5 : 0);

    if (scorePoints >= 70) {
      completeProfiles++;
    }

    // Counts
    totalExplicitRels += (p.relationships || []).length;
    totalCustomFacts += (p.facts || []).length;

    // Enriched relationships count
    const enriched = getEnrichedRelationships(p, people);
    const inferredCount = enriched.filter((r) => r.isInferred).length;
    totalInferredRels += inferredCount;
  });

  const conflictsCount = issues.filter((i) => i.type === 'error').length;
  const warningsCount = issues.filter((i) => i.type === 'warning').length;

  // Calculate overall Health Score (0 - 100)
  let healthScore = 100;
  if (people.length === 0) {
    healthScore = 100;
  } else {
    // Penalty for errors: -15 per error
    healthScore -= conflictsCount * 15;
    // Penalty for warnings: -4 per warning
    healthScore -= warningsCount * 4;
    // Bonus for completeness ratio
    const completenessRatio = people.length > 0 ? completeProfiles / people.length : 1;
    healthScore = Math.round(Math.max(10, Math.min(100, healthScore * (0.6 + 0.4 * completenessRatio))));
  }

  return {
    totalPeople: people.length,
    completeProfiles,
    incompleteProfiles: people.length - completeProfiles,
    totalRelationships: totalExplicitRels + totalInferredRels,
    inferredRelationships: totalInferredRels,
    totalCustomFacts,
    issues,
    conflictsCount,
    healthScore,
  };
}
