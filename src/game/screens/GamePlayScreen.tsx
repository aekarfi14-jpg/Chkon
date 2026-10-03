import React, { useState } from 'react';
import { GameState } from '../../core/deduction/deductionEngine';
import { Answer } from '../../data/models/types';
import { Check, X, HelpCircle, RotateCcw, History, ChevronDown, ChevronUp } from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

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
  const currentQuestion = gameState.currentQuestion;
  const questionNumber = gameState.history.length + 1;
  const totalPeople = gameState.allPeople.length;
  const remainingCount = gameState.candidates.length;

  const handleAnswerClick = (answer: Answer) => {
    if (answer === 'YES') audio.playAnswer('yes');
    else if (answer === 'NO') audio.playAnswer('no');
    else audio.playAnswer('unknown');

    onAnswer(answer);
  };

  // Phase labels
  const phaseLabel = {
    discovery: 'مرحلة الاستكشاف · أسئلة عامة',
    narrowing: 'مرحلة التضييق · تضييق الدائرة',
    reveal: 'مرحلة الحسم · معلومات دقيقة',
    guessing: 'تخمين الشخصية',
    victory: 'تم التخمين',
    exhausted: 'انتهت الأسئلة',
  }[gameState.phase];

  // Category labels
  const categoryLabel: Record<string, string> = {
    gender: 'الجنس',
    age: 'العمر والجيل',
    location: 'الإقامة والسكن',
    profession: 'المهنة أو الدراسة',
    family: 'الحالة العائلية',
    relationship: 'شجرة العلاقات',
    custom_fact: 'سمة مخصصة',
  };

  return (
    <div className="flex flex-col justify-between min-h-[80vh] max-w-xl mx-auto px-4 py-2">
      {/* Top Status Area */}
      <div className="space-y-3">
        {/* Progress & Candidates Gauge */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
          <span className="text-amber-400 font-bold">
            السؤال رقم {questionNumber}
          </span>
          <span className="text-slate-300">
            المرشحون المتبقون: <strong className="text-slate-100">{remainingCount}</strong> من {totalPeople}
          </span>
        </div>

        {/* Subtle Progress Bar */}
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300 rounded-full"
            style={{
              width: `${Math.max(10, Math.min(100, (1 - remainingCount / totalPeople) * 100))}%`,
            }}
          />
        </div>

        {/* Phase Indicator */}
        <div className="flex justify-center">
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-800/80 px-3 py-1 rounded-full">
            {phaseLabel}
          </span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="my-auto py-6">
        <div className="p-6 sm:p-8 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl space-y-4 text-center">
          {currentQuestion && (
            <span className="text-xs font-bold text-amber-400/90 tracking-wide">
              {categoryLabel[currentQuestion.category] || 'سؤال'}
            </span>
          )}

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 leading-relaxed font-heading">
            {currentQuestion ? currentQuestion.text : 'جاري تحليل الاحتمالات...'}
          </h2>
        </div>
      </div>

      {/* Answer Buttons & Tools */}
      <div className="space-y-4 pb-2">
        {/* The 3 Core Tactile Buttons */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* YES Button */}
          <button
            onClick={() => handleAnswerClick('YES')}
            className="h-16 sm:h-20 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg sm:text-xl rounded-2xl shadow-lg shadow-emerald-900/30 active:scale-[0.96] transition-all flex flex-col items-center justify-center gap-1"
          >
            <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
            <span>نعم</span>
          </button>

          {/* NO Button */}
          <button
            onClick={() => handleAnswerClick('NO')}
            className="h-16 sm:h-20 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg sm:text-xl rounded-2xl shadow-lg shadow-rose-900/30 active:scale-[0.96] transition-all flex flex-col items-center justify-center gap-1"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
            <span>لا</span>
          </button>

          {/* UNKNOWN Button */}
          <button
            onClick={() => handleAnswerClick('UNKNOWN')}
            className="h-16 sm:h-20 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm sm:text-base rounded-2xl border border-slate-700 active:scale-[0.96] transition-all flex flex-col items-center justify-center gap-1"
            title="لا أعلم - لن يتم استبعاد أي مرشح"
          >
            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 stroke-[2]" />
            <span>لا أعرف</span>
          </button>
        </div>

        {/* Toolbar: Undo, History, Restart */}
        <div className="flex items-center justify-between text-xs pt-1 px-1">
          <button
            onClick={() => {
              audio.playClick();
              onUndo();
            }}
            disabled={gameState.history.length === 0}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors py-1 px-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تراجع عن الإجابة</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setShowHistory(!showHistory);
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors py-1 px-2"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>الأسئلة السابقة ({gameState.history.length})</span>
            {showHistory ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={() => {
              audio.playClick();
              if (window.confirm('هل تريد إنهاء هذه الجولة والعودة للبداية؟')) {
                onRestart();
              }
            }}
            className="text-slate-500 hover:text-rose-400 transition-colors py-1 px-2"
          >
            إنهاء الجولة
          </button>
        </div>

        {/* Questions History Drawer */}
        {showHistory && gameState.history.length > 0 && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl max-h-48 overflow-y-auto space-y-2 animate-in fade-in text-xs">
            <span className="font-bold text-slate-400 block mb-1">سجل إجاباتك:</span>
            {gameState.history.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80"
              >
                <span className="text-slate-200 truncate flex-1 ml-2">
                  {idx + 1}. {item.question.text}
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md text-[11px] shrink-0 ${
                    item.answer === 'YES'
                      ? 'bg-emerald-950 text-emerald-300'
                      : item.answer === 'NO'
                      ? 'bg-rose-950 text-rose-300'
                      : 'bg-slate-800 text-amber-300'
                  }`}
                >
                  {item.answer === 'YES' ? 'نعم' : item.answer === 'NO' ? 'لا' : 'لا أعرف'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
