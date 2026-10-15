import React from 'react';
import { Person, AnswerHistoryItem } from '../../data/models/types';
import { Avatar } from '../../shared/ui/Avatar';
import { MascotCharacter } from '../../shared/character/MascotCharacter';
import { RotateCcw, Check } from 'lucide-react';
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
    <div className="flex flex-col items-center justify-between min-h-[84vh] px-4 max-w-md mx-auto text-center space-y-4 animate-in fade-in duration-200 select-none">
      {/* Top Section with Mascot in UNCERTAIN mood */}
      <div className="space-y-1.5 pt-2">
        <MascotCharacter
          mood="UNCERTAIN"
          size="md"
          showDialogue={true}
          dialogueOverride="تداخلت الخيوط وتشابهت الصفات! لدي أكثر من احتمال محتمل..."
          interactive={true}
        />
        <h2 className="text-2xl font-bold text-slate-100 font-heading">
          عندي أكثر من احتمال!
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          بناءً على إجاباتك، هؤلاء هم أقرب المرشحين:
        </p>
      </div>

      {/* Candidate Cards Grid */}
      <div className="w-full space-y-2 max-h-[46vh] overflow-y-auto pr-1">
        {candidates.map((person) => (
          <div
            key={person.id}
            className="p-3 bg-[#141b26] border border-[#2d3748] rounded-xl flex items-center justify-between gap-3 text-right hover:border-[#d49b45]/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={person.name} image={person.image} size="md" />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-100 truncate font-heading">{person.name}</h4>
                <p className="text-xs text-slate-400 truncate">
                  {person.profession || 'بدون مهنة محددة'}
                  {person.city ? ` · ${person.city}` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playVictory();
                onSelectCandidate(person);
              }}
              className="px-3 py-1.5 bg-[#174431] hover:bg-[#1d573f] text-emerald-100 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer border border-[#2b8a64]/40 active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>هو هذا!</span>
            </button>
          </div>
        ))}

        {candidates.length === 0 && (
          <div className="p-6 bg-[#141b26] border border-[#2d3748] rounded-2xl text-slate-400 text-xs space-y-1.5">
            <p className="font-semibold text-slate-200">لم أجد أي شخص يطابق هذه الإجابات.</p>
            <p className="text-slate-500">
              ربما كانت إحدى الإجابات غير دقيقة أو أن الشخص تنقصه بعض التفاصيل في هذا العالم.
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="w-full pb-3">
        <button
          onClick={() => {
            audio.playClick();
            onPlayAgain();
          }}
          className="w-full py-3.5 bg-[#141b26] hover:bg-[#1e2738] text-slate-200 border border-[#2d3748] font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>المحاولة مرة أخرى</span>
        </button>
      </div>
    </div>
  );
};
