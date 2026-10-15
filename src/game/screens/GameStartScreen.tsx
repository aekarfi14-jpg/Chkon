import React, { useEffect } from 'react';
import { Group, Person } from '../../data/models/types';
import { MascotCharacter } from '../../shared/character/MascotCharacter';
import { audio } from '../../shared/sound/audioService';
import { Play, Globe, Wrench, Settings } from 'lucide-react';

interface GameStartScreenProps {
  activeGroup: Group;
  people: Person[];
  onStartGame: () => void;
  onOpenWorlds: () => void;
  onOpenCreator: () => void;
  onOpenSettings: () => void;
}

export const GameStartScreen: React.FC<GameStartScreenProps> = ({
  activeGroup,
  people,
  onStartGame,
  onOpenWorlds,
  onOpenCreator,
  onOpenSettings,
}) => {
  const canPlay = people.length >= 2;

  const handleStart = () => {
    if (!canPlay) return;
    audio.playClick();
    onStartGame();
  };

  // Keyboard shortcut: Press Enter or Space to quickly start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canPlay) {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canPlay]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[84vh] px-4 max-w-md mx-auto text-center select-none animate-in fade-in duration-200">
      {/* Top Atmosphere: Title & Natural Unboxed Metadata (Zero-Pill Rule) */}
      <div className="pt-3 space-y-1.5">
        <div className="text-xs text-slate-400 font-medium">
          <span className="text-[#d49b45] font-semibold">استنتاج وتخمين</span>
          <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
          <span>100% دون إنترنت</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-slate-100 tracking-tight font-heading">
          شكون؟
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xs mx-auto">
          فكر في أي شخص في بالك... والحكيم سيكتشفه بذكاء وفراسة
        </p>
      </div>

      {/* Center Stage: Interactive Mascot Character */}
      <div className="my-auto py-2">
        <MascotCharacter mood="IDLE" size="lg" showDialogue={true} interactive={true} />
      </div>

      {/* Bottom Controls Area */}
      <div className="w-full space-y-3 pb-3">
        {/* Active World Card */}
        <div
          onClick={() => {
            audio.playClick();
            onOpenWorlds();
          }}
          className="w-full p-3.5 bg-[#141b26] hover:bg-[#1a2332] border border-[#2d3748] hover:border-[#d49b45]/50 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-150"
        >
          <div className="text-right min-w-0">
            <span className="text-[10px] text-slate-500 block font-medium">العالم النشط</span>
            <h4 className="text-sm font-bold text-slate-100 truncate">
              {activeGroup.name}
            </h4>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#d49b45] shrink-0">
            <span>{people.length} أشخاص</span>
            <span className="text-slate-500">◀</span>
          </div>
        </div>

        {/* Primary Play Button */}
        {canPlay ? (
          <button
            onClick={handleStart}
            className="w-full py-4 bg-[#d49b45] hover:bg-[#e0a852] active:bg-[#c38a36] text-slate-950 font-bold text-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer font-heading active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ابدأ التحدي (Enter)</span>
          </button>
        ) : (
          <button
            onClick={() => {
              audio.playClick();
              onOpenCreator();
            }}
            className="w-full py-3.5 bg-[#141b26] border border-[#d49b45]/40 text-[#d49b45] font-semibold text-sm rounded-xl transition-all"
          >
            أضف شخصين على الأقل في صانع العوالم للعب
          </button>
        )}

        {/* Secondary Hub Actions: Worlds · Creator · Settings */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <button
            onClick={() => {
              audio.playClick();
              onOpenWorlds();
            }}
            className="py-2.5 px-2 bg-[#141b26] hover:bg-[#1a2332] border border-[#2d3748] rounded-xl text-slate-300 hover:text-slate-100 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>العوالم</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onOpenCreator();
            }}
            className="py-2.5 px-2 bg-[#141b26] hover:bg-[#1a2332] border border-[#2d3748] rounded-xl text-slate-300 hover:text-slate-100 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-[#d49b45]" />
            <span>صانع العوالم</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onOpenSettings();
            }}
            className="py-2.5 px-2 bg-[#141b26] hover:bg-[#1a2332] border border-[#2d3748] rounded-xl text-slate-300 hover:text-slate-100 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>الإعدادات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
