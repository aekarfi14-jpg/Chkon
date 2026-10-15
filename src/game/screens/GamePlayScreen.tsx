import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, calculateCharacterMood } from '../../core/deduction/deductionEngine';
import { Answer, CharacterMood } from '../../data/models/types';
import { MascotCharacter } from '../../shared/character/MascotCharacter';
import { audio } from '../../shared/sound/audioService';
import {
  RotateCcw,
  History,
  X,
  ChevronDown,
  Check,
  HelpCircle,
  ThumbsUp,
} from 'lucide-react';

interface GamePlayScreenProps {
  gameState: GameState;
  onAnswer: (answer: Answer) => void;
  onUndo: () => void;
  onRestart: () => void;
}

export const GamePlayScreen: React.FC<GamePlayScreenProps> = ({
  gameState,
  onAnswer,
  onUndo,
  onRestart,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [transientMood, setTransientMood] = useState<CharacterMood | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasImpact, setHasImpact] = useState(false);

  const prevCandidatesRef = useRef(gameState.candidates.length);
  const currentQuestion = gameState.currentQuestion;
  const questionNumber = gameState.history.length + 1;
  const totalPeople = gameState.allPeople.length;
  const remainingCount = gameState.candidates.length;

  // Deduction progress percentage
  const deductionProgress = Math.max(
    10,
    Math.min(100, Math.round((1 - (remainingCount - 1) / Math.max(1, totalPeople - 1)) * 100))
  );

  // Check if candidate pool dropped significantly
  useEffect(() => {
    const prev = prevCandidatesRef.current;
    if (prev > remainingCount && prev - remainingCount >= Math.max(1, Math.floor(prev * 0.25))) {
      setHasImpact(true);
      audio.playPunch();
      const timer = setTimeout(() => setHasImpact(false), 400);
      return () => clearTimeout(timer);
    }
    prevCandidatesRef.current = remainingCount;
  }, [remainingCount]);

  // Mascot dynamic expression
  const mascotMood = calculateCharacterMood(gameState, transientMood);

  // Execute answer with zero-latency audio and feedback
  const handleAnswerClick = useCallback(
    (answer: Answer) => {
      if (isTransitioning) return;

      // Audio & Haptic feedback
      if (answer === 'YES') audio.playAnswer('yes');
      else if (answer === 'PROBABLY') audio.playAnswer('probably');
      else if (answer === 'NO') audio.playAnswer('no');
      else audio.playAnswer('unknown');

      // Mascot micro-expression
      if (answer === 'YES') {
        setTransientMood(remainingCount <= 3 ? 'CONFIDENT' : 'FOCUSED');
      } else if (answer === 'PROBABLY') {
        setTransientMood('THINKING');
      } else if (answer === 'NO') {
        setTransientMood(remainingCount <= 4 ? 'SURPRISED' : 'FOCUSED');
      } else {
        setTransientMood('UNCERTAIN');
      }

      setIsTransitioning(true);
      onAnswer(answer);

      setTimeout(() => {
        setTransientMood(null);
        setIsTransitioning(false);
      }, 260);
    },
    [isTransitioning, remainingCount, onAnswer]
  );

  // Keyboard shortcut listener for lightning-fast input mechanics
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or modal
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        showHistory
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === '1' || key === 'y' || key === 'arrowright') {
        e.preventDefault();
        handleAnswerClick('YES');
      } else if (key === '2' || key === 'n' || key === 'arrowleft') {
        e.preventDefault();
        handleAnswerClick('NO');
      } else if (key === '3' || key === 'p' || key === 'arrowup') {
        e.preventDefault();
        handleAnswerClick('PROBABLY');
      } else if (key === '4' || key === 'u' || key === 'arrowdown' || key === ' ') {
        e.preventDefault();
        handleAnswerClick('UNKNOWN');
      } else if ((key === 'z' || key === 'backspace') && gameState.history.length > 0) {
        e.preventDefault();
        audio.playClick();
        onUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswerClick, gameState.history.length, onUndo, showHistory]);

  // Storytelling Narrative Chapters (تدرج قصصي متوازن)
  const narrativeChapter = useMemo(() => {
    if (remainingCount <= 3) {
      return {
        title: 'الفصل الحاسم',
        subtitle: 'لحظة التجلي واستحضار الشخص',
      };
    }
    if (questionNumber <= 2) {
      return {
        title: 'الفصل الأول',
        subtitle: 'رصد الأثر والهوية الأساسية',
      };
    }
    if (questionNumber <= 4) {
      return {
        title: 'الفصل الثاني',
        subtitle: 'تقصي المسار والمحيط الجغرافي',
      };
    }
    if (questionNumber <= 6) {
      return {
        title: 'الفصل الثالث',
        subtitle: 'استكشاف نسيج الروابط والأسرة',
      };
    }
    return {
      title: 'الفصل الرابع',
      subtitle: 'كشف خفايا الشخصية والطباع',
    };
  }, [questionNumber, remainingCount]);

  return (
    <div
      className={`flex flex-col justify-between min-h-[86vh] max-w-lg mx-auto px-3.5 py-1 select-none transition-transform duration-200 ${
        hasImpact ? 'scale-[1.01]' : 'scale-100'
      }`}
    >
      {/* 1. Narrative Chapter Header & Unboxed Metadata (Zero-Pill Discipline) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-[#d49b45] font-semibold">{narrativeChapter.title}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300 font-heading">السؤال {questionNumber}</span>
          </div>

          <div className="flex items-center gap-1.5 tabular-nums text-xs">
            <span className="text-slate-400">باقٍ:</span>
            <span className="font-bold text-[#d49b45]">{remainingCount}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{totalPeople}</span>
          </div>
        </div>

        {/* Narrative Subtitle */}
        <p className="text-[11px] text-slate-400 text-right font-medium">
          {narrativeChapter.subtitle}
        </p>

        {/* Minimalist Deduction Gauge */}
        <div className="w-full h-1.5 bg-[#141b26] rounded-full overflow-hidden border border-[#232c3d]">
          <div
            className="h-full bg-[#d49b45] transition-all duration-300 ease-out rounded-full"
            style={{ width: `${deductionProgress}%` }}
          />
        </div>
      </div>

      {/* 2. Interactive Mascot Stage */}
      <div className="flex-1 flex flex-col items-center justify-center my-1 py-1">
        <MascotCharacter mood={mascotMood} size="md" showDialogue={true} interactive={true} />
      </div>

      {/* 3. The Question Surface (Antique parchment / Obsidian card) */}
      <div className="my-2">
        <div
          key={questionNumber}
          className={`animate-card-pop p-5 sm:p-6 bg-[#141b26] border border-[#2d3748] rounded-2xl shadow-xl text-center space-y-2 relative overflow-hidden transition-all duration-200 ${
            isTransitioning ? 'opacity-70 scale-[0.99]' : 'opacity-100 scale-100'
          }`}
        >
          {/* Subtle top hairline divider */}
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#d49b45]/60 to-transparent" />

          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug font-heading">
            {currentQuestion ? currentQuestion.text : 'أتدبر في مسارات الصفات والأثر...'}
          </h2>
        </div>
      </div>

      {/* 4. Fast Tactical Answer Dock with Keyboard & Touch Acceleration */}
      <div className="space-y-2.5 pb-2">
        <div className="grid grid-cols-2 gap-2.5">
          {/* YES / نعم (أكيد) */}
          <button
            onClick={() => handleAnswerClick('YES')}
            disabled={isTransitioning}
            className="relative h-14 sm:h-15 bg-[#174431] hover:bg-[#1d573f] active:bg-[#123627] text-emerald-100 font-bold text-base rounded-xl border border-[#2b8a64]/50 shadow-sm flex items-center justify-between px-3.5 transition-all cursor-pointer select-none active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
              <span>نعم (أكيد)</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300/80 border border-emerald-700/40">
              1
            </kbd>
          </button>

          {/* NO / لا (أبداً) */}
          <button
            onClick={() => handleAnswerClick('NO')}
            disabled={isTransitioning}
            className="relative h-14 sm:h-15 bg-[#4c1d1d] hover:bg-[#5f2525] active:bg-[#3c1717] text-rose-100 font-bold text-base rounded-xl border border-[#8a3838]/50 shadow-sm flex items-center justify-between px-3.5 transition-all cursor-pointer select-none active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <X className="w-4 h-4 text-rose-300 stroke-[3]" />
              <span>لا (أبداً)</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300/80 border border-rose-700/40">
              2
            </kbd>
          </button>

          {/* PROBABLY / غالباً (على الأرجح) */}
          <button
            onClick={() => handleAnswerClick('PROBABLY')}
            disabled={isTransitioning}
            className="relative h-13 sm:h-14 bg-[#392917] hover:bg-[#4a361e] active:bg-[#2d2012] text-amber-200 font-semibold text-sm sm:text-base rounded-xl border border-[#8f6229]/50 shadow-sm flex items-center justify-between px-3.5 transition-all cursor-pointer select-none active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-amber-300" />
              <span>غالباً (على الأرجح)</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300/80 border border-amber-700/40">
              3
            </kbd>
          </button>

          {/* UNKNOWN / ما نعرفش (لا أعلم) */}
          <button
            onClick={() => handleAnswerClick('UNKNOWN')}
            disabled={isTransitioning}
            className="relative h-13 sm:h-14 bg-[#1a2333] hover:bg-[#222d42] active:bg-[#141c2a] text-slate-300 font-semibold text-sm sm:text-base rounded-xl border border-[#32415d]/50 shadow-sm flex items-center justify-between px-3.5 transition-all cursor-pointer select-none active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>ما نعرفش (لا أعلم)</span>
            </div>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 border border-slate-700/50">
              4
            </kbd>
          </button>
        </div>

        {/* Tactical Sub-Bar: Undo, History, Restart */}
        <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-400 font-medium">
          <button
            onClick={() => {
              audio.playClick();
              onUndo();
            }}
            disabled={gameState.history.length === 0}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors py-1 cursor-pointer"
            title="تراجع عن السؤال الأخير [Z]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تراجع [Z]</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setShowHistory(!showHistory);
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل الإجابات ({gameState.history.length})</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onRestart();
            }}
            className="text-slate-500 hover:text-rose-400 transition-colors py-1 cursor-pointer"
          >
            إنهاء الجولة
          </button>
        </div>
      </div>

      {/* Answer History Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-[#141b26] border border-[#2d3748] w-full max-w-md rounded-2xl max-h-[75vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#2d3748]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#d49b45]" />
                <h3 className="font-bold text-slate-100 text-sm font-heading">
                  سجل الأسئلة والإجابات
                </h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 rounded-lg bg-[#1c2332] text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2.5 divide-y divide-[#232c3d]">
              {gameState.history.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">
                  لم يتم الإجابة عن أي سؤال بعد في هذه الجولة.
                </p>
              ) : (
                gameState.history.map((item, idx) => (
                  <div key={idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-right">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 font-medium">#{idx + 1}</span>
                      <p className="text-xs font-semibold text-slate-200 leading-snug">
                        {item.question.text}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-bold shrink-0 px-2.5 py-1 rounded-lg ${
                        item.answer === 'YES'
                          ? 'bg-[#174431] text-emerald-200 border border-[#2b8a64]/40'
                          : item.answer === 'NO'
                          ? 'bg-[#4c1d1d] text-rose-200 border border-[#8a3838]/40'
                          : item.answer === 'PROBABLY'
                          ? 'bg-[#392917] text-amber-200 border border-[#8f6229]/40'
                          : 'bg-[#1a2333] text-slate-300 border border-[#32415d]/40'
                      }`}
                    >
                      {item.answer === 'YES'
                        ? 'نعم'
                        : item.answer === 'NO'
                        ? 'لا'
                        : item.answer === 'PROBABLY'
                        ? 'غالباً'
                        : 'لا أعلم'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
