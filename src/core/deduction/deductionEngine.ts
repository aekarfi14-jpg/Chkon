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
} from '../../data/models/types';
import { generateQuestionPool } from '../question-engine/questionPool';

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

    // Target specificity for the current phase
    // Discovery: prefers low specificity (0.1 - 0.35)
    // Narrowing: prefers medium specificity (0.35 - 0.65)
    // Reveal: prefers high specificity (0.65 - 1.0)
    let targetSpecificity = 0.25;
    if (phase === 'narrowing') targetSpecificity = 0.5;
    if (phase === 'reveal') targetSpecificity = 0.85;

    let bestQuestion: Question | null = null;
    let highestScore = -Infinity;

    for (const q of this.questionPool) {
      if (askedQuestionIds.has(q.id)) {
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
      // Ideal split is 50/50 -> balanceScore = 1.0
      // Worst split is (N-1)/1 -> balanceScore is close to 0
      const balanceRatio = Math.min(yesCount, noCount) / Math.max(yesCount, noCount);
      const entropyGain = balanceRatio; // in [0, 1]

      // 2. Known vs Unknown Penalty
      // Prefer questions where candidates have clear known facts
      const completenessFactor = totalKnown / candidates.length;

      // 3. Pacing Curve Alignment
      // Calculate how close the question's specificity is to our desired phase target
      const specificityDiff = Math.abs(q.specificity - targetSpecificity);
      const pacingScore = 1.0 - specificityDiff; // higher is better aligned

      // 4. Early-Game Singleton Penalty
      // If we are in discovery phase, heavily penalize questions where yesCount === 1
      // (so we don't accidentally reveal the person in question 1 or 2)
      let singletonPenalty = 1.0;
      if (phase === 'discovery' && (yesCount === 1 || noCount === 1) && candidates.length > 3) {
        singletonPenalty = 0.15; // severe penalty
      }

      // Composite Score
      const totalScore =
        (entropyGain * 0.4 + pacingScore * 0.4 + completenessFactor * 0.2) * singletonPenalty;

      if (totalScore > highestScore) {
        highestScore = totalScore;
        bestQuestion = q;
      }
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
      // UNKNOWN: Rule #11: "لا تعتبر الإجابة 'لا'. اعتبرها: Unknown ولا تستبعد الأشخاص بناءً عليها."
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
