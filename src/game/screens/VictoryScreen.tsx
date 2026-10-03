import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Person, AnswerHistoryItem } from '../../data/models/types';
import { Avatar } from '../../shared/ui/Avatar';
import { Trophy, RotateCcw, CheckCircle2 } from 'lucide-react';
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
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[78vh] px-4 max-w-md mx-auto text-center space-y-6 animate-in fade-in duration-300">
      {/* Victory Badge */}
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
        <Trophy className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h2 className="text-3xl font-black text-slate-100 font-heading">
          تم التخمين بنجاح!
        </h2>
        <p className="text-sm text-slate-300">
          استطاع المحرك التعرف على الشخصية في <strong className="text-amber-400">{history.length}</strong> أسئلة فقط.
        </p>
      </div>

      {/* Target Person Card */}
      <div className="w-full p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex items-center gap-4 text-right">
        <Avatar name={person.name} image={person.image} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4 className="text-lg font-bold text-slate-100 truncate">{person.name}</h4>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {person.profession || 'بدون مهنة محددة'}
            {person.city ? ` · ${person.city}` : ''}
          </p>
        </div>
      </div>

      {/* Deduction Pathway Recap */}
      <div className="w-full p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-right space-y-2">
        <span className="text-xs font-bold text-slate-400 block mb-1">
          مسار الاستنتاج (أسئلة الجولة):
        </span>
        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
          {history.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80"
            >
              <span className="text-slate-300 truncate ml-2">
                {i + 1}. {h.question.text}
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] shrink-0 ${
                  h.answer === 'YES'
                    ? 'text-emerald-300'
                    : h.answer === 'NO'
                    ? 'text-rose-300'
                    : 'text-amber-300'
                }`}
              >
                {h.answer === 'YES' ? 'نعم' : h.answer === 'NO' ? 'لا' : 'لا أعرف'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Play Again Button */}
      <button
        onClick={() => {
          audio.playClick();
          onPlayAgain();
        }}
        className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-5 h-5" />
        <span>العب جولة جديدة</span>
      </button>
    </div>
  );
};
