import React from 'react';
import { Person } from '../../data/models/types';
import { Avatar } from '../../shared/ui/Avatar';
import { Check, X, Sparkles } from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface GuessScreenProps {
  person: Person;
  questionCount: number;
  onConfirmGuess: () => void;
  onRejectGuess: () => void;
}

export const GuessScreen: React.FC<GuessScreenProps> = ({
  person,
  questionCount,
  onConfirmGuess,
  onRejectGuess,
}) => {
  const currentYear = new Date().getFullYear();
  const age = person.birthYear ? currentYear - person.birthYear : undefined;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 max-w-md mx-auto text-center space-y-6 animate-in zoom-in-95 duration-200">
      {/* Badge / Announcement */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs sm:text-sm font-bold">
        <Sparkles className="w-4 h-4" />
        <span>أظن أنني توصلت للشخصية!</span>
      </div>

      {/* Big Visual Person Card */}
      <div className="w-full p-6 sm:p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center space-y-4">
        <Avatar
          name={person.name}
          image={person.image}
          size="xl"
          className="w-28 h-28 sm:w-32 sm:h-32 text-3xl shadow-lg border-2 border-amber-500/30"
        />

        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-heading">
            {person.name}
          </h2>
          <p className="text-sm text-slate-400">
            {person.profession || 'بدون مهنة محددة'}
            {person.city ? ` · ${person.city}` : ''}
            {age ? ` · ${age} سنة` : ''}
          </p>
        </div>

        {/* Clue Highlights */}
        {person.facts.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 pt-2 border-t border-slate-800/80 w-full">
            {person.facts.slice(0, 3).map((f) => (
              <span
                key={f.id}
                className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                {f.key}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Verification Prompt */}
      <div className="space-y-1">
        <h3 className="text-lg sm:text-xl font-bold text-slate-100">
          هل هذا هو الشخص الذي كنت تفكر فيه؟
        </h3>
        <p className="text-xs text-slate-400">
          تم التوصل إليه بعد {questionCount} أسئلة
        </p>
      </div>

      {/* Decision Buttons */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Confirmed */}
        <button
          onClick={() => {
            audio.playVictory();
            onConfirmGuess();
          }}
          className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>نعم، هو بالضبط!</span>
        </button>

        {/* Rejected */}
        <button
          onClick={() => {
            audio.playClick();
            onRejectGuess();
          }}
          className="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-base rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5 text-rose-400 stroke-[3]" />
          <span>لا، شخص آخر</span>
        </button>
      </div>
    </div>
  );
};
