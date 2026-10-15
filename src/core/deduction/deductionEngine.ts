/**
 * Deduction and Question Selection Engine
 * Integrates Information Gain (Entropy Reduction) with game pacing phases
 * and robust handling of UNKNOWN answers and candidate updates.
 */

import {
  Person,
  Question,
  Answer,
  GamePhase,
  AnswerHistoryItem,
  CharacterMood,
} from '../../data/models/types';
import { generateQuestionPool } from '../question-engine/questionPool';
import { storage } from '../../data/storage/storageDriver';

export const RECENT_OPENINGS_KEY = 'shkoun_recent_openings';

export interface GameState {
  allPeople: Person[];
  candidates: Person[];
  askedQuestionIds: Set<string>;
  history: AnswerHistoryItem[];
  currentQuestion: Question | null;
  phase: GamePhase;
  guessedPerson: Person | null;
  consecutiveUnknownCount: number;
}

export class DeductionEngine {
  private allPeople: Person[];
  private questionPool: Question[];

  constructor(people: Person[]) {
    this.allPeople = people;
    this.questionPool = generateQuestionPool(people);
  }

  /**
   * Initializes a fresh game state
   */
  initGame(): GameState {
    const state: GameState = {
      allPeople: [...this.allPeople],
      candidates: [...this.allPeople],
      askedQuestionIds: new Set<string>(),
      history: [],
      currentQuestion: null,
      phase: 'discovery',
      guessedPerson: null,
      consecutiveUnknownCount: 0,
    };

    state.currentQuestion = this.selectNextQuestion(state);
    state.phase = this.determinePhase(state);
    return state;
  }

  /**
   * Determines current game phase based on remaining candidates ratio and question count
   */
  determinePhase(state: GameState): GamePhase {
    const total = state.allPeople.length;
    const current = state.candidates.length;

    if (current <= 1) {
      return 'guessing';
    }

    if (current <= 3) {
      return 'reveal';
    }

    const ratio = total > 0 ? current / total : 1;
    if (ratio > 0.6 && state.history.length < 3) {
      return 'discovery';
    }

    return 'narrowing';
  }

  /**
   * Selects the next best question using Information Gain modulated by Game Phase Pacing
   */
  selectNextQuestion(state: GameState): Question | null {
    const { candidates, askedQuestionIds } = state;

    if (candidates.length <= 1) {
      return null;
    }

    const phase = this.determinePhase(state);
    const historyCount = state.history.length;

    // Smart Multi-Tier Pacing Curve:
    // 1. Broad Discovery (q1-q2): 0.18 - 0.25 (gender, life status, generation tier)
    // 2. Structural Narrowing (q3-q4): 0.35 - 0.45 (family structure, age thresholds, broad cities)
    // 3. Attribute Narrowing (q5-q6): 0.48 - 0.58 (professions, specific cities, habits)
    // 4. Relational & Deep Clues (q7+): 0.60 - 0.75 (father's job, spouse traits, hobbies)
    // 5. Endgame Reveal (candidates <= 3): 0.88 - 0.95 (unique custom facts, named reveal)
    let targetSpecificity = 0.22;
    if (candidates.length <= 3) {
      targetSpecificity = 0.90;
    } else if (historyCount >= 6) {
      targetSpecificity = 0.68;
    } else if (historyCount >= 4) {
      targetSpecificity = 0.52;
    } else if (historyCount >= 2) {
      targetSpecificity = 0.38;
    }

    let bestQuestion: Question | null = null;
    let highestScore = -Infinity;

    // Track semantic families already asked in current game
    const askedFamilies = new Set<string>();
    state.history.forEach((h) => {
      const fam = h.question.family || h.question.category;
      if (fam) askedFamilies.add(fam);
    });

    // Opening Question Rotation: retrieve recent openings from storage
    const recentOpenings =
      historyCount === 0
        ? storage.getItem<string[]>(RECENT_OPENINGS_KEY, [])
        : [];

    for (const q of this.questionPool) {
      if (askedQuestionIds.has(q.id)) {
        continue;
      }

      const qFamily = q.family || q.category;

      // Semantic duplicate check:
      // Single-shot families like gender, life_status, and marital_status shouldn't be asked twice
      if (
        (qFamily === 'gender' || qFamily === 'life_status' || qFamily === 'marital_status') &&
        askedFamilies.has(qFamily)
      ) {
        continue;
      }

      // Count candidate answers
      let yesCount = 0;
      let noCount = 0;
      let unknownCount = 0;

      for (const c of candidates) {
        const res = q.predicate(c, this.allPeople);
        if (res === true) yesCount++;
        else if (res === false) noCount++;
        else unknownCount++;
      }

      // If all candidates have the same answer or no one answers, this question cannot discriminate
      if (yesCount === 0 || noCount === 0) {
        continue;
      }

      const totalKnown = yesCount + noCount;
      if (totalKnown === 0) continue;

      // 1. Raw Information Gain (Entropy Reduction)
      const balanceRatio = Math.min(yesCount, noCount) / Math.max(yesCount, noCount);
      const entropyGain = balanceRatio; // in [0, 1]

      // 2. Known vs Unknown Completeness
      const completenessFactor = totalKnown / candidates.length;

      // 3. Pacing Curve Alignment
      const specificityDiff = Math.abs(q.specificity - targetSpecificity);
      const pacingScore = Math.max(0.1, 1.0 - specificityDiff);

      // 4. Early-Game Singleton Penalty
      let singletonPenalty = 1.0;
      if (phase === 'discovery' && (yesCount === 1 || noCount === 1) && candidates.length > 3) {
        singletonPenalty = 0.15;
      }

      // 5. Named Question Suppression (Rule #8: Names are for Endgame Reveal only)
      let namedMultiplier = 1.0;
      if (qFamily === 'named_reveal') {
        if (candidates.length > 3) {
          namedMultiplier = 0.05; // heavily suppress in Discovery & early Narrowing
        } else {
          namedMultiplier = 1.6; // bonus near the end for dramatic final reveal
        }
      }

      // 6. Relational Attribute Bonus (Rule #7: Prefer paths to attributes)
      let relationalBonus = 1.0;
      if (q.category.startsWith('relational_') && (historyCount >= 3 || phase === 'reveal')) {
        relationalBonus = 1.3;
      }

      // 7. Semantic Redundancy Penalty (if family was already asked in history)
      let redundancyPenalty = 1.0;
      if (askedFamilies.has(qFamily)) {
        redundancyPenalty = 0.65;
      }

      // 8. Session Variety / Anti-Repetition Bonus
      // If this is question #1, heavily penalize questions used as openings in recent games
      let openingVarietyPenalty = 1.0;
      if (historyCount === 0 && recentOpenings.length > 0) {
        const recentIndex = recentOpenings.indexOf(q.id);
        if (recentIndex === 0) {
          openingVarietyPenalty = 0.12; // used in very last game!
        } else if (recentIndex > 0) {
          openingVarietyPenalty = 0.35; // used recently
        }
      }

      // Composite Score
      const totalScore =
        (entropyGain * 0.35 + pacingScore * 0.35 + completenessFactor * 0.3) *
        singletonPenalty *
        namedMultiplier *
        relationalBonus *
        redundancyPenalty *
        openingVarietyPenalty;

      if (totalScore > highestScore) {
        highestScore = totalScore;
        bestQuestion = q;
      }
    }

    // Persist opening question so next game rotates to another axis
    if (bestQuestion && historyCount === 0) {
      const updatedOpenings = [
        bestQuestion.id,
        ...recentOpenings.filter((id) => id !== bestQuestion!.id),
      ].slice(0, 5);
      storage.setItem(RECENT_OPENINGS_KEY, updatedOpenings);
    }

    return bestQuestion;
  }

  /**
   * Applies an answer (YES, NO, UNKNOWN) and advances the game state
   */
  processAnswer(currentState: GameState, answer: Answer): GameState {
    const question = currentState.currentQuestion;
    if (!question) {
      return currentState;
    }

    const newAskedIds = new Set(currentState.askedQuestionIds);
    newAskedIds.add(question.id);

    let nextCandidates = [...currentState.candidates];

    if (answer === 'YES') {
      // Keep candidates where predicate is true, or if unknown, treat with caution
      nextCandidates = nextCandidates.filter((c) => {
        const res = question.predicate(c, this.allPeople);
        return res === true;
      });
      // Safety fallback: if strict filter eliminated all, allow unknown matches
      if (nextCandidates.length === 0) {
        nextCandidates = currentState.candidates.filter((c) => {
          const res = question.predicate(c, this.allPeople);
          return res !== false;
        });
      }
    } else if (answer === 'PROBABLY') {
      // PROBABLY / غالباً: Soft filter keeping true and unknown, eliminating strict false
      const filtered = nextCandidates.filter((c) => {
        const res = question.predicate(c, this.allPeople);
        return res !== false;
      });
      if (filtered.length > 0) {
        nextCandidates = filtered;
      }
    } else if (answer === 'NO') {
      // Keep candidates where predicate is false
      nextCandidates = nextCandidates.filter((c) => {
        const res = question.predicate(c, this.allPeople);
        return res === false;
      });
      // Safety fallback: if strict filter eliminated all, allow unknown matches
      if (nextCandidates.length === 0) {
        nextCandidates = currentState.candidates.filter((c) => {
          const res = question.predicate(c, this.allPeople);
          return res !== true;
        });
      }
    } else {
      // UNKNOWN: Rule: Never eliminate candidates on unknown
      // Keep all candidates! Just increment consecutive unknown count to avoid deadlock.
    }

    const historyItem: AnswerHistoryItem = {
      question,
      answer,
      remainingCandidatesCount: nextCandidates.length,
      timestamp: Date.now(),
    };

    const nextState: GameState = {
      ...currentState,
      candidates: nextCandidates,
      askedQuestionIds: newAskedIds,
      history: [...currentState.history, historyItem],
      consecutiveUnknownCount:
        answer === 'UNKNOWN' ? currentState.consecutiveUnknownCount + 1 : 0,
      currentQuestion: null,
      guessedPerson: null,
      phase: 'narrowing',
    };

    // Check if we should guess
    if (nextCandidates.length === 1) {
      nextState.phase = 'guessing';
      nextState.guessedPerson = nextCandidates[0];
      return nextState;
    }

    // Try finding next question
    const nextQ = this.selectNextQuestion(nextState);

    if (nextQ) {
      nextState.currentQuestion = nextQ;
      nextState.phase = this.determinePhase(nextState);
    } else {
      // No more distinguishing questions available
      if (nextCandidates.length > 0) {
        // Guess the top candidate or move to guessing / exhausted
        nextState.phase = 'guessing';
        nextState.guessedPerson = nextCandidates[0];
      } else {
        nextState.phase = 'exhausted';
      }
    }

    return nextState;
  }

  /**
   * Rejects a guess ("لا، ليس هذا الشخص")
   * Rule #22: "لا تنهِ اللعبة بمجرد تخمين خاطئ. حاول استكمال الاستنتاج باستخدام المرشحين المتبقين."
   */
  rejectGuess(currentState: GameState): GameState {
    const wrongPerson = currentState.guessedPerson;
    const remainingCandidates = currentState.candidates.filter(
      (c) => c.id !== wrongPerson?.id
    );

    const nextState: GameState = {
      ...currentState,
      candidates: remainingCandidates,
      guessedPerson: null,
      currentQuestion: null,
    };

    if (remainingCandidates.length === 1) {
      nextState.phase = 'guessing';
      nextState.guessedPerson = remainingCandidates[0];
      return nextState;
    }

    if (remainingCandidates.length === 0) {
      nextState.phase = 'exhausted';
      return nextState;
    }

    const nextQ = this.selectNextQuestion(nextState);
    if (nextQ) {
      nextState.currentQuestion = nextQ;
      nextState.phase = this.determinePhase(nextState);
    } else {
      nextState.phase = 'guessing';
      nextState.guessedPerson = remainingCandidates[0];
    }

    return nextState;
  }

  /**
   * Undoes the last answered question
   */
  undoLastAnswer(currentState: GameState): GameState {
    if (currentState.history.length === 0) return currentState;

    const newHistory = [...currentState.history];
    const lastItem = newHistory.pop()!;

    // Rebuild candidates from scratch by replaying history
    let replayState: GameState = {
      allPeople: [...this.allPeople],
      candidates: [...this.allPeople],
      askedQuestionIds: new Set<string>(),
      history: [],
      currentQuestion: null,
      phase: 'discovery',
      guessedPerson: null,
      consecutiveUnknownCount: 0,
    };

    for (const h of newHistory) {
      replayState.currentQuestion = h.question;
      replayState = this.processAnswer(replayState, h.answer);
    }

    replayState.currentQuestion = lastItem.question;
    replayState.phase = this.determinePhase(replayState);
    return replayState;
  }
}

/**
 * Derives the mascot's behavioral expression and body posture from engine state
 */
export function calculateCharacterMood(
  state: GameState | null,
  transientMood?: CharacterMood | null
): CharacterMood {
  if (transientMood) {
    return transientMood;
  }
  if (!state) {
    return 'IDLE';
  }
  if (state.phase === 'guessing' || state.guessedPerson) {
    return 'REVEAL';
  }
  if (state.consecutiveUnknownCount >= 2) {
    return 'UNCERTAIN';
  }
  if (state.candidates.length <= 3) {
    return 'CONFIDENT';
  }
  if (state.candidates.length <= 5) {
    return 'FOCUSED';
  }
  if (state.phase === 'discovery' || state.history.length <= 1) {
    return 'CURIOUS';
  }
  return 'THINKING';
}

