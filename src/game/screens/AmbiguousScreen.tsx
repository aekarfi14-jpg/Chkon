import React from 'react';
import { Person, AnswerHistoryItem } from '../../data/models/types';
import { Avatar } from '../../shared/ui/Avatar';
import { HelpCircle, RotateCcw, Check } from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface AmbiguousScreenProps {
  candidates: Person[];
  history: AnswerHistoryItem[];
  onSelectCandidate: (person: Person) => void;
  onPlayAgain: () => void;
}

export const AmbiguousScreen: React.FC<AmbiguousScreenProps> = ({
  candidates,
  onSelectCandidate,
  onPlayAgain,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[78vh] px-4 max-w-md mx-auto text-center space-y-6 animate-in fade-in duration-300">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
        <HelpCircle className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-heading">
          عندي أكثر من احتمال!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          بناءً على إجاباتك، هذه أبرز الشخصيات المحتملة:
        </p>
      </div>

      {/* Candidate Cards Grid */}
      <div className="w-full space-y-2.5">
        {candidates.map((person) => (
          <div
            key={person.id}
            className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-right hover:border-amber-500/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={person.name} image={person.image} size="md" />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-100 truncate">{person.name}</h4>
                <p className="text-xs text-slate-400 truncate">
                  {person.profession || 'بدون مهنة'}
                  {person.city ? ` · ${person.city}` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playVictory();
                onSelectCandidate(person);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>هو هذا!</span>
            </button>
          </div>
        ))}

        {candidates.length === 0 && (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 text-sm space-y-2">
            <p>لم أستطع التعرف على الشخصية في قاعدة بيانات المجموعة.</p>
            <p className="text-xs text-slate-500">
              ربما كانت إحدى الإجابات غير دقيقة أو أن الشخص تنقصه بعض الخصائص.
            </p>
          </div>
        )}
      </div>

      {/* Restart Button */}
      <button
        onClick={() => {
          audio.playClick();
          onPlayAgain();
        }}
        className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-base rounded-2xl transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        <span>جرب مرة أخرى</span>
      </button>
    </div>
  );
};
