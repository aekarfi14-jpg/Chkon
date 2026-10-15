import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { audio } from '../sound/audioService';
import { storage } from '../../data/storage/storageDriver';
import { Volume2, VolumeX, Smartphone, Eye, RotateCcw, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataReset,
}) => {
  const [muted, setMuted] = useState(audio.getMuted());
  const [haptics, setHaptics] = useState(audio.getHaptics());
  const [reducedMotion, setReducedMotion] = useState(
    storage.getItem<boolean>('reduced_motion', false)
  );

  const toggleSound = () => {
    const isMuted = audio.toggleMute();
    setMuted(isMuted);
    if (!isMuted) audio.playClick();
  };

  const toggleHaptics = () => {
    const isHaptic = audio.toggleHaptics();
    setHaptics(isHaptic);
    if (isHaptic) audio.triggerHaptic(20);
  };

  const toggleMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    storage.setItem('reduced_motion', next);
    audio.playClick();
    if (next) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      'تحذير: هل أنت متأكد من استعادة ضبط المصنع؟ سيتم إعادة تهيئة المجموعة التجريبية وحذف المجموعات المضافة محلياً.'
    );
    if (!confirmed) return;

    storage.clear();
    audio.playClick();
    if (onDataReset) onDataReset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إعدادات اللعبة" maxWidth="sm">
      <div className="space-y-4 text-xs">
        {/* Audio Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-[#0c1017] border border-[#232c3d] rounded-xl">
          <div className="flex items-center gap-2.5">
            {muted ? (
              <VolumeX className="w-5 h-5 text-slate-500" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#d49b45]" />
            )}
            <div>
              <span className="font-bold text-slate-200 block">المؤثرات الصوتية</span>
              <span className="text-[11px] text-slate-400">أصوات تخليقية تعمل دون إنترنت</span>
            </div>
          </div>
          <button
            onClick={toggleSound}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              !muted ? 'bg-[#d49b45]' : 'bg-[#1e2738]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                !muted ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
        </div>

        {/* Haptics Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-[#0c1017] border border-[#232c3d] rounded-xl">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-[#d49b45]" />
            <div>
              <span className="font-bold text-slate-200 block">الاهتزاز اللمسي (Haptics)</span>
              <span className="text-[11px] text-slate-400">ردود فعل لمسية عند الضغط على الأزرار</span>
            </div>
          </div>
          <button
            onClick={toggleHaptics}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              haptics ? 'bg-[#d49b45]' : 'bg-[#1e2738]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                haptics ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
        </div>

        {/* Reduced Motion Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-[#0c1017] border border-[#232c3d] rounded-xl">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-[#d49b45]" />
            <div>
              <span className="font-bold text-slate-200 block">تقليل الأنيميشن والحركة</span>
              <span className="text-[11px] text-slate-400">تسريع الواجهة وتوفير البطارية</span>
            </div>
          </div>
          <button
            onClick={toggleMotion}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              reducedMotion ? 'bg-[#d49b45]' : 'bg-[#1e2738]'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                reducedMotion ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
        </div>

        {/* Offline & Privacy Assurance */}
        <div className="p-3 bg-[#0c1017] border border-[#232c3d] rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            اللعبة تعمل بنسبة 100% دون إنترنت. جميع الأشخاص والعلاقات محفوظة في الذاكرة المحلية لجهازك فقط ولا يتم إرسال أي معلومة إلى أي خادم خارجي.
          </span>
        </div>

        {/* Reset Factory Data */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            onClick={handleReset}
            className="w-full py-2.5 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-900/50 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين البيانات الافتراضية</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
