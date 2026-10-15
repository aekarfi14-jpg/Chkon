import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Person, AnswerHistoryItem } from '../../data/models/types';
import { Avatar } from '../../shared/ui/Avatar';
import { MascotCharacter } from '../../shared/character/MascotCharacter';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface VictoryScreenProps {
  person: Person;
  history: AnswerHistoryItem[];
  onPlayAgain: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  person,
  history,
  onPlayAgain,
}) => {
  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 55,
        origin: { y: 0.55 },
        colors: ['#d49b45', '#2b8a64', '#e2e8f0'],
      });
    } catch {
      // ignore
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        audio.playClick();
        onPlayAgain();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayAgain]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[84vh] px-4 max-w-md mx-auto text-center space-y-4 animate-in fade-in duration-200 select-none">
      {/* Top Victory Celebration */}
      <div className="space-y-1 pt-2">
        <div className="text-xs text-[#d49b45] font-semibold tracking-wide">
          <span>انتصار الفراسة والاستنتاج</span>
          <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
          <span>{history.length} أسئلة</span>
        </div>
        <h2 className="text-3xl font-black text-slate-100 font-heading">
          تم التخمين بنجاح!
        </h2>
        <MascotCharacter
          mood="CONFIDENT"
          size="sm"
          showDialogue={true}
          dialogueOverride={`عرفتُه في ${history.length} أسئلة! فراستي لم تخب قط.`}
          interactive={true}
        />
      </div>

      {/* Target Person Card */}
      <div className="w-full p-4 bg-[#141b26] border border-[#2d3748] rounded-2xl shadow-xl flex items-center gap-4 text-right">
        <Avatar name={person.name} image={person.image} size="lg" className="border-2 border-[#d49b45]" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4 className="text-lg font-bold text-slate-100 truncate font-heading">{person.name}</h4>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {person.profession || 'بدون مهنة محددة'}
            {person.city ? ` · ${person.city}` : ''}
          </p>
        </div>
      </div>

      {/* Deduction Pathway Recap */}
      <div className="w-full p-3.5 bg-[#141b26] border border-[#2d3748] rounded-xl text-right space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
          <span>مسار الاستنتاج:</span>
          <span>{history.length} إجابات</span>
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-xs">
          {history.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-lg bg-[#0c1017] border border-[#232c3d]"
            >
              <span className="text-slate-300 truncate ml-2">
                {i + 1}. {h.question.text}
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[10px] shrink-0 ${
                  h.answer === 'YES'
                    ? 'text-emerald-300 bg-[#174431]'
                    : h.answer === 'NO'
                    ? 'text-rose-300 bg-[#4c1d1d]'
                    : h.answer === 'PROBABLY'
                    ? 'text-amber-300 bg-[#392917]'
                    : 'text-slate-300 bg-[#1a2333]'
                }`}
              >
                {h.answer === 'YES'
                  ? 'أكيد'
                  : h.answer === 'NO'
                  ? 'لا'
                  : h.answer === 'PROBABLY'
                  ? 'غالباً'
                  : 'ما نعرفش'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Play Again Primary Button */}
      <div className="w-full pb-3">
        <button
          onClick={() => {
            audio.playClick();
            onPlayAgain();
          }}
          className="w-full py-3.5 bg-[#d49b45] hover:bg-[#e0a852] active:bg-[#c38a36] text-slate-950 font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer font-heading active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>تحدٍ جديد مع شخص آخر (Enter)</span>
        </button>
      </div>
    </div>
  );
};
