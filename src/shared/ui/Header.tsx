import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { audio } from '../sound/audioService';

interface HeaderProps {
  currentMode: 'game' | 'creator';
  onModeChange: (mode: 'game' | 'creator') => void;
  activeGroupName?: string;
  onOpenWorlds?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  activeGroupName,
  onOpenWorlds,
  onOpenSettings,
}) => {
  const [isMuted, setIsMuted] = useState(audio.getMuted());

  const handleToggleSound = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      audio.playClick();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0c1017]/90 backdrop-blur-md border-b border-[#232c3d] px-4 sm:px-8 py-3 select-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element in display face) */}
        <a
          href="#game"
          onClick={(e) => {
            e.preventDefault();
            audio.playClick();
            onModeChange('game');
          }}
          className="text-xl font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 font-heading hover:text-[#d49b45] transition-colors"
        >
          شكون؟
        </a>

        {/* Zone 2: 3-4 clean single-line navigation controls */}
        <nav className="flex items-center gap-1 sm:gap-2 p-1 bg-[#141b26] border border-[#232c3d] rounded-lg">
          <button
            onClick={() => {
              audio.playClick();
              onModeChange('game');
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentMode === 'game'
                ? 'bg-[#1e2738] text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            اللعب
          </button>

          <button
            onClick={() => {
              audio.playClick();
              onModeChange('creator');
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentMode === 'creator'
                ? 'bg-[#1e2738] text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            صانع العوالم
          </button>

          {onOpenWorlds && (
            <button
              onClick={() => {
                audio.playClick();
                onOpenWorlds();
              }}
              className="hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-md text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              العوالم
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={() => {
                audio.playClick();
                onOpenSettings();
              }}
              className="hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-md text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              الإعدادات
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action or sound affordance */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleSound}
            className="w-8 h-8 rounded-lg border border-[#232c3d] bg-[#141b26] text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
            aria-label={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#d49b45]" />}
          </button>
        </div>
      </div>
    </header>
  );
};
