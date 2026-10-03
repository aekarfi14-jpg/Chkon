import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Database } from 'lucide-react';
import { audio } from '../sound/audioService';

interface HeaderProps {
  currentMode: 'game' | 'creator';
  onModeChange: (mode: 'game' | 'creator') => void;
  activeGroupName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  activeGroupName,
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
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-lg shadow-sm">
            ؟
          </div>
          <span className="text-xl font-black tracking-tight text-slate-100 font-heading">
            شكون؟
          </span>
          {activeGroupName && (
            <span className="hidden sm:inline text-xs text-slate-400 border-r border-slate-800 pr-2 mr-1 truncate max-w-[140px]">
              {activeGroupName}
            </span>
          )}
        </div>

        {/* Zone 2: Navigation Switcher */}
        <nav className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800/80 rounded-2xl">
          <button
            onClick={() => {
              audio.playClick();
              onModeChange('game');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              currentMode === 'game'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>اللعب</span>
          </button>
          <button
            onClick={() => {
              audio.playClick();
              onModeChange('creator');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              currentMode === 'creator'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>إدارة الأشخاص</span>
          </button>
        </nav>

        {/* Zone 3: Actions (Sound toggle) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleSound}
            className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center justify-center transition-colors"
            title={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
            aria-label={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
