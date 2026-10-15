import React, { useState } from 'react';
import { Group, Person } from '../../data/models/types';
import { Modal } from '../ui/Modal';
import { db } from '../../data/repository/database';
import { calculateDataHealth } from '../../core/validation/dataHealth';
import { audio } from '../sound/audioService';
import {
  Users,
  Compass,
  Sparkles,
  BookOpen,
  Plus,
  Check,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface WorldSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  activeGroupId: string;
  onSelectGroup: (group: Group) => void;
  onRefreshData: () => void;
  onOpenCreator: () => void;
}

export const WorldSelectorModal: React.FC<WorldSelectorModalProps> = ({
  isOpen,
  onClose,
  groups,
  activeGroupId,
  onSelectGroup,
  onRefreshData,
  onOpenCreator,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newWorldName, setNewWorldName] = useState('');
  const [newWorldDesc, setNewWorldDesc] = useState('');

  // Icon symbol based on world name
  const getWorldIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('عائل') || lower.includes('family')) {
      return <Users className="w-5 h-5 text-amber-400" />;
    }
    if (lower.includes('صديق') || lower.includes('أصدقاء') || lower.includes('friends')) {
      return <Compass className="w-5 h-5 text-emerald-400" />;
    }
    if (lower.includes('عمل') || lower.includes('زملاء') || lower.includes('دراسة')) {
      return <BookOpen className="w-5 h-5 text-cyan-400" />;
    }
    return <Sparkles className="w-5 h-5 text-purple-400" />;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorldName.trim()) return;

    const newGroup: Group = {
      id: `world_${Date.now()}`,
      name: newWorldName.trim(),
      description: newWorldDesc.trim() || undefined,
      isDemo: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.saveGroup(newGroup);
    onRefreshData();
    onSelectGroup(newGroup);
    setIsCreating(false);
    setNewWorldName('');
    setNewWorldDesc('');
    audio.playVictory();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="عوالم التخمين (Playable Worlds)"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Subtitle */}
        <p className="text-xs text-slate-400">
          اختر العالم الذي ترغب في تحدي الحكيم شكون فيه، أو أنشئ عالماً جديداً:
        </p>

        {/* Worlds Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
          {groups.map((grp) => {
            const isSelected = grp.id === activeGroupId;
            const worldPeople: Person[] = db.getPeople(grp.id);
            const health = calculateDataHealth(worldPeople);

            return (
              <div
                key={grp.id}
                onClick={() => {
                  audio.playClick();
                  onSelectGroup(grp);
                  onClose();
                }}
                className={`group relative p-4 rounded-xl border text-right cursor-pointer transition-all duration-150 flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-[#1a2332] border-[#d49b45] shadow-md'
                    : 'bg-[#141b26] border-[#232c3d] hover:border-[#384760] hover:bg-[#18202d]'
                }`}
              >
                {/* Active check indicator */}
                {isSelected && (
                  <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-[#d49b45] text-slate-950 flex items-center justify-center font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getWorldIcon(grp.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-100 truncate">
                        {grp.name}
                      </h4>
                      {grp.isDemo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold shrink-0">
                          تجريبي
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {grp.description || 'عالم مخصص للأشخاص'}
                    </p>
                  </div>
                </div>

                {/* Stats Footer */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                  <span className="text-slate-300 font-semibold tabular-nums">
                    {worldPeople.length} أشخاص
                  </span>
                  <div className="flex items-center gap-1">
                    {health.conflictsCount === 0 ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>جاهز</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-0.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>يحتاج تدقيق</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create World Form */}
        {isCreating ? (
          <form
            onSubmit={handleCreate}
            className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 animate-in fade-in"
          >
            <h5 className="text-xs font-bold text-slate-200">إنشاء عالم جديد</h5>
            <input
              type="text"
              value={newWorldName}
              onChange={(e) => setNewWorldName(e.target.value)}
              placeholder="اسم العالم (مثال: أصدقاء النادي، عائلة الأخوال...)"
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={newWorldDesc}
              onChange={(e) => setNewWorldDesc(e.target.value)}
              placeholder="وصف مختصر اختياري"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!newWorldName.trim()}
                className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 disabled:opacity-40"
              >
                إنشاء العالم
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <button
              onClick={() => {
                audio.playClick();
                setIsCreating(true);
              }}
              className="px-3 py-2 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء عالم جديد</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                onClose();
                onOpenCreator();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 rounded-xl transition-colors"
            >
              إدارة الأشخاص في العالم
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
