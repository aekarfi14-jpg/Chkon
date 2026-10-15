import React, { useState } from 'react';
import { Group, Person } from '../../data/models/types';
import { db } from '../../data/repository/database';
import { Avatar } from '../../shared/ui/Avatar';
import { PersonEditorModal } from './PersonEditorModal';
import { QuickAddWizardModal } from './QuickAddWizardModal';
import { DataHealthModal } from './DataHealthModal';
import { ImportExportModal } from './ImportExportModal';
import { calculateDataHealth } from '../../core/validation/dataHealth';
import {
  Plus,
  Search,
  Activity,
  ArrowUpDown,
  Edit2,
  Trash2,
  FolderPlus,
  Globe,
  Sparkles,
  HeartHandshake,
  UserCheck,
  Zap,
} from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface CreatorDashboardProps {
  groups: Group[];
  activeGroup: Group;
  people: Person[];
  onSelectGroup: (group: Group) => void;
  onRefreshData: () => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  groups,
  activeGroup,
  people,
  onSelectGroup,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Calculate health snapshot
  const healthReport = calculateDataHealth(people);

  // Filtered people
  const filteredPeople = people.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.profession && p.profession.toLowerCase().includes(q)) ||
      p.facts.some((f) => f.key.toLowerCase().includes(q))
    );
  });

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup: Group = {
      id: `world_${Date.now()}`,
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || undefined,
      isDemo: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.saveGroup(newGroup);
    onRefreshData();
    onSelectGroup(newGroup);
    setIsNewGroupOpen(false);
    setNewGroupName('');
    setNewGroupDesc('');
    audio.playVictory();
  };

  const handleDeleteGroup = (group: Group) => {
    if (groups.length <= 1) {
      alert('لا يمكنك حذف العالم الوحيد المتبقي.');
      return;
    }
    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف عالم "${group.name}" وجميع الأشخاص داخله؟`
    );
    if (!confirmDelete) return;

    db.deleteGroup(group.id);
    onRefreshData();
    const remaining = groups.filter((g) => g.id !== group.id);
    if (remaining.length > 0) {
      onSelectGroup(remaining[0]);
    }
    audio.playClick();
  };

  const handleDeletePerson = (person: Person) => {
    const confirmDel = window.confirm(`هل أنت متأكد من حذف "${person.name}"؟`);
    if (!confirmDel) return;

    db.deletePerson(person.id);
    onRefreshData();
    audio.playClick();
  };

  const handleSavePerson = (person: Person) => {
    db.savePerson(person);
    onRefreshData();
  };

  return (
    <div className="space-y-5 pb-20 select-none">
      {/* Title & Worlds Bar */}
      <div className="p-4 bg-[#141b26] border border-[#232c3d] rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Active World Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1c2332] border border-[#2d3748] flex items-center justify-center text-[#d49b45]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 font-heading">
                  {activeGroup.name}
                </h3>
                {activeGroup.isDemo && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#392917] text-amber-300 font-semibold border border-[#8f6229]/40">
                    تجريبي
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {activeGroup.description || 'عالم مخصص للأشخاص والعلاقات'}
              </p>
            </div>
          </div>

          {/* Quick World Tools */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => {
                audio.playClick();
                setIsHealthOpen(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                healthReport.conflictsCount > 0
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : 'bg-[#1c2332] border-[#2d3748] text-slate-200 hover:bg-[#253043]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#d49b45]" />
              <span>صحة البيانات ({healthReport.healthScore}%)</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setIsImportExportOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1c2332] hover:bg-[#253043] text-slate-200 border border-[#2d3748] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#d49b45]" />
              <span>استيراد / تصدير</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setIsNewGroupOpen(true);
              }}
              className="p-1.5 rounded-lg bg-[#1c2332] hover:bg-[#253043] border border-[#2d3748] text-slate-200 transition-colors cursor-pointer"
              title="إنشاء عالم جديد"
            >
              <FolderPlus className="w-4 h-4 text-[#d49b45]" />
            </button>
          </div>
        </div>

        {/* Worlds Switcher Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-[#232c3d] scrollbar-none">
          <span className="text-[11px] font-medium text-slate-400 shrink-0">العوالم:</span>
          {groups.map((grp) => (
            <button
              key={grp.id}
              onClick={() => {
                audio.playClick();
                onSelectGroup(grp);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                grp.id === activeGroup.id
                  ? 'bg-[#d49b45] text-slate-950 shadow-sm'
                  : 'bg-[#0c1017] text-slate-400 hover:text-slate-200 hover:bg-[#1a2332] border border-[#232c3d]'
              }`}
            >
              {grp.name}
            </button>
          ))}
        </div>
      </div>

      {/* Demo Warning Banner if active */}
      {activeGroup.isDemo && (
        <div className="p-3 bg-[#1e1b14] border border-[#8f6229]/40 rounded-xl flex items-center justify-between text-xs text-amber-200">
          <span>هذا &quot;عالم تجريبي&quot; لاختبار اللعبة، يمكنك حذفه وإنشاء عالم حقيقي.</span>
          <button
            onClick={() => handleDeleteGroup(activeGroup)}
            className="px-2.5 py-1 bg-[#4a3418] hover:bg-[#5e431f] text-amber-200 rounded-lg transition-colors font-semibold shrink-0 ml-2 cursor-pointer"
          >
            حذف العالم التجريبي
          </button>
        </div>
      )}

      {/* Search and Add Person Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، المدينة، المهنة أو الخصائص..."
            className="w-full pl-4 pr-10 py-2.5 bg-[#141b26] border border-[#232c3d] rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#d49b45] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audio.playChirp();
              setIsQuickAddOpen(true);
            }}
            className="px-4 py-2.5 bg-[#d49b45] hover:bg-[#e0a852] active:bg-[#c38a36] text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer font-heading shadow-sm"
          >
            <Zap className="w-4 h-4 fill-slate-950 stroke-[2.5]" />
            <span>إضافة خاطفة ⚡</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setPersonToEdit(null);
              setIsEditorOpen(true);
            }}
            className="px-3.5 py-2.5 bg-[#141b26] hover:bg-[#1a2332] text-slate-200 border border-[#2d3748] font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>تفصيلي</span>
          </button>
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPeople.map((person) => {
          const currentYear = new Date().getFullYear();
          const age = person.birthYear ? currentYear - person.birthYear : undefined;

          return (
            <div
              key={person.id}
              className="p-4 bg-[#141b26] border border-[#232c3d] hover:border-[#384760] rounded-xl transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start gap-3">
                <Avatar name={person.name} image={person.image} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-slate-100 truncate font-heading">
                      {person.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {person.gender === 'female' ? 'أنثى' : 'ذكر'}
                      {age ? ` · ${age} سنة` : ''}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {person.profession || 'بدون مهنة محددة'}
                    {person.city ? ` · ${person.city}` : ''}
                  </div>
                </div>
              </div>

              {/* Facts & Relationships preview */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-3 text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <HeartHandshake className="w-3.5 h-3.5 text-blue-400" />
                    <span>{person.relationships.length} علاقات</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#d49b45]" />
                    <span>{person.facts.length} خصائص</span>
                  </span>
                </div>

                {person.facts.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {person.facts.slice(0, 3).map((f) => (
                      <span
                        key={f.id}
                        className="px-2 py-0.5 bg-[#0c1017] text-slate-300 rounded text-[10px] truncate max-w-[120px] border border-[#232c3d]"
                      >
                        {f.key}
                      </span>
                    ))}
                    {person.facts.length > 3 && (
                      <span className="text-slate-500 self-center text-[10px]">
                        +{person.facts.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#232c3d]">
                <button
                  onClick={() => {
                    audio.playClick();
                    setPersonToEdit(person);
                    setIsEditorOpen(true);
                  }}
                  className="px-3 py-1.5 bg-[#1c2332] hover:bg-[#253043] text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-[#2d3748]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#d49b45]" />
                  <span>تعديل</span>
                </button>

                <button
                  onClick={() => handleDeletePerson(person)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  title="حذف الشخص"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredPeople.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 space-y-2">
            <UserCheck className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
            <p className="text-sm font-semibold">لا يوجد أشخاص مسجلين بعد في هذا العالم.</p>
            <button
              onClick={() => {
                audio.playClick();
                setPersonToEdit(null);
                setIsEditorOpen(true);
              }}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              + إضافة أول شخص لهذا العالم
            </button>
          </div>
        )}
      </div>

      {/* New Group Modal */}
      {isNewGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateGroup}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-100 font-heading">إنشاء عالم جديد</h3>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                اسم العالم <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="مثال: عائلتي، أصدقاء الحي..."
                required
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                وصف اختياري
              </label>
              <input
                type="text"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="وصف مختصر للعالم"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewGroupOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
              >
                إنشاء العالم
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Person Editor Modal */}
      {isEditorOpen && (
        <PersonEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          personToEdit={personToEdit}
          groupId={activeGroup.id}
          allPeopleInGroup={people}
          onSave={handleSavePerson}
        />
      )}

      {/* Quick Add Wizard Modal */}
      {isQuickAddOpen && (
        <QuickAddWizardModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          groupId={activeGroup.id}
          allPeopleInGroup={people}
          onSavePerson={handleSavePerson}
        />
      )}

      {/* Data Health Modal */}
      {isHealthOpen && (
        <DataHealthModal
          isOpen={isHealthOpen}
          onClose={() => setIsHealthOpen(false)}
          people={people}
          onEditPerson={(p) => {
            setPersonToEdit(p);
            setIsEditorOpen(true);
          }}
        />
      )}

      {/* Import / Export Modal */}
      {isImportExportOpen && (
        <ImportExportModal
          isOpen={isImportExportOpen}
          onClose={() => setIsImportExportOpen(false)}
          activeGroup={activeGroup}
          onDataChanged={onRefreshData}
        />
      )}
    </div>
  );
};
