import React, { useEffect } from 'react';
import { Person } from '../../data/models/types';
import { Avatar } from '../../shared/ui/Avatar';
import { MascotCharacter } from '../../shared/character/MascotCharacter';
import { Check, X } from 'lucide-react';
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

  useEffect(() => {
    audio.playReveal();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === 'Enter') {
        e.preventDefault();
        audio.playVictory();
        onConfirmGuess();
      } else if (e.key === '2' || e.key === 'Escape') {
        e.preventDefault();
        audio.playClick();
        onRejectGuess();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConfirmGuess, onRejectGuess]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[84vh] px-4 max-w-md mx-auto text-center space-y-4 animate-in zoom-in-95 duration-200 select-none">
      {/* Top Atmosphere & Mascot in REVEAL state */}
      <div className="space-y-1.5 pt-2">
        <div className="text-xs text-[#d49b45] font-semibold tracking-wide">
          <span>لحظة الحسم والكشف</span>
          <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
          <span>{questionCount} أسئلة مستغرقة</span>
        </div>
        <MascotCharacter
          mood="REVEAL"
          size="md"
          showDialogue={true}
          dialogueOverride="وصلتُ إلى اليقين! هل هذا هو الشخص المنشود؟"
          interactive={true}
        />
      </div>

      {/* Dramatic Candidate Card */}
      <div className="w-full p-5 sm:p-6 bg-[#141b26] border border-[#2d3748] rounded-2xl shadow-xl flex flex-col items-center space-y-3 relative overflow-hidden">
        {/* Subtle gold hairline */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#d49b45]/70 to-transparent" />

        <Avatar
          name={person.name}
          image={person.image}
          size="xl"
          className="w-24 h-24 sm:w-28 sm:h-28 text-3xl shadow-lg border-2 border-[#d49b45]"
        />

        <div className="space-y-0.5">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 font-heading">
            {person.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            {person.profession || 'بدون مهنة محددة'}
            {person.city ? ` · ${person.city}` : ''}
            {age ? ` · ${age} سنة` : ''}
          </p>
        </div>

        {person.facts.length > 0 && (
          <div className="text-xs text-slate-400 pt-2 border-t border-[#232c3d] w-full flex flex-wrap justify-center gap-2">
            {person.facts.slice(0, 3).map((f, i) => (
              <span key={f.id} className="text-slate-300">
                {i > 0 && <span aria-hidden="true" className="text-slate-600 ml-2">·</span>}
                {f.key}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Actions */}
      <div className="w-full space-y-3 pb-3">
        <p className="text-xs sm:text-sm font-medium text-slate-300">
          هل هذا هو الشخص الذي كنت تفكر فيه؟
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Confirmed YES */}
          <button
            onClick={() => {
              audio.playVictory();
              onConfirmGuess();
            }}
            className="py-3.5 px-4 bg-[#174431] hover:bg-[#1d573f] active:bg-[#123627] text-emerald-100 font-bold text-base rounded-xl border border-[#2b8a64]/50 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
            <span>نعم، هو بالضبط! (1)</span>
          </button>

          {/* Rejected NO */}
          <button
            onClick={() => {
              audio.playClick();
              onRejectGuess();
            }}
            className="py-3.5 px-4 bg-[#1a2333] hover:bg-[#222d42] active:bg-[#141c2a] text-slate-300 font-semibold text-base rounded-xl border border-[#32415d]/50 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <X className="w-4 h-4 text-slate-400 stroke-[2.5]" />
            <span>لا، ليس هو (2)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
