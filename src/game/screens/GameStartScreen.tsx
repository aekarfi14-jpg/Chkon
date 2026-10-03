import React from 'react';
import { Group, Person } from '../../data/models/types';
import { Play, Users, PlusCircle } from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface GameStartScreenProps {
  groups: Group[];
  activeGroup: Group;
  people: Person[];
  onSelectGroup: (group: Group) => void;
  onStartGame: () => void;
  onGoToCreator: () => void;
}

export const GameStartScreen: React.FC<GameStartScreenProps> = ({
  groups,
  activeGroup,
  people,
  onSelectGroup,
  onStartGame,
  onGoToCreator,
}) => {
  const canPlay = people.length >= 2;

  const handleStart = () => {
    if (!canPlay) return;
    audio.playClick();
    onStartGame();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[78vh] px-4 max-w-xl mx-auto text-center space-y-6 animate-in fade-in duration-300">
      {/* Visual Identity Logo & Mark */}
      <div className="relative">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-slate-900 border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/5 mx-auto">
          <span className="text-5xl sm:text-6xl font-black text-amber-400 font-heading">
            ؟
          </span>
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-100 font-heading">
          شكون؟ — Shkoun
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed">
          فكر في أي شخص من عائلتك أو أصدقائك، وسأطرح عليك أسئلة ذكية لأتعرف عليه!
        </p>
      </div>

      {/* Group Selector Card */}
      <div className="w-full p-4 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
          <span>اختر المجموعة:</span>
          <span>{people.length} أشخاص مسجلين</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {groups.map((grp) => {
            const isSelected = grp.id === activeGroup.id;
            return (
              <button
                key={grp.id}
                onClick={() => {
                  audio.playClick();
                  onSelectGroup(grp);
                }}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate w-full text-center">{grp.name}</span>
              </button>
            );
          })}
        </div>

        {activeGroup.description && (
          <p className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-800/80">
            {activeGroup.description}
          </p>
        )}
      </div>

      {/* Primary Play Button or Warning */}
      {canPlay ? (
        <button
          onClick={handleStart}
          className="w-full sm:w-80 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-lg sm:text-xl rounded-2xl shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>ابدأ التخمين الآن</span>
        </button>
      ) : (
        <div className="w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
          <p className="text-xs text-amber-300">
            تحتاج المجموعة إلى شخصين على الأقل لبدء اللعبة. أضف بعض الأشخاص أولاً.
          </p>
          <button
            onClick={() => {
              audio.playClick();
              onGoToCreator();
            }}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إضافة أشخاص للمجموعة</span>
          </button>
        </div>
      )}

      {/* Offline Assurance note */}
      <div className="text-[11px] text-slate-500">
        100% Offline · لا يحتاج إنترنت · بياناتك خاصة ومحفوظة على جهازك فقط
      </div>
    </div>
  );
};
