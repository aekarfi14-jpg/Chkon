import React, { useState } from 'react';
import { Group, Person } from '../../data/models/types';
import { db } from '../../data/repository/database';
import { Avatar } from '../../shared/ui/Avatar';
import { PersonEditorModal } from './PersonEditorModal';
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
  AlertTriangle,
  FolderPlus,
  Users,
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
      id: `grp_${Date.now()}`,
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
      alert('لا يمكنك حذف المجموعة الوحيدة المتبقية.');
      return;
    }
    const confirmDelete = window.confirm(
      `هل أنت متأكد من حذف مجموعة "${group.name}" وجميع الأشخاص التابعين لها؟`
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
    const confirmDel = window.confirm(`هل أنت متأكد من حذف "${person.name}" من المجموعة؟`);
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
    <div className="space-y-6 pb-20">
      {/* Group Selector and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800/80 rounded-3xl">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 shrink-0">المجموعة:</span>
          {groups.map((grp) => (
            <button
              key={grp.id}
              onClick={() => {
                audio.playClick();
                onSelectGroup(grp);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                grp.id === activeGroup.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{grp.name}</span>
            </button>
          ))}
          <button
            onClick={() => {
              audio.playClick();
              setIsNewGroupOpen(true);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="إنشاء مجموعة جديدة"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => {
              audio.playClick();
              setIsHealthOpen(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              healthReport.conflictsCount > 0
                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>صحة البيانات ({healthReport.healthScore}%)</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setIsImportExportOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span>تصدير / استيراد</span>
          </button>
        </div>
      </div>

      {/* Demo dataset banner if active */}
      {activeGroup.isDemo && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-300">
          <span>هذه &quot;مجموعة تجريبية&quot; افتراضية للاختبار فقط. لا تحتوي على أي بيانات حقيقية.</span>
          <button
            onClick={() => handleDeleteGroup(activeGroup)}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-lg transition-colors font-bold shrink-0 ml-2"
          >
            حذف المجموعة التجريبية
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
            className="w-full pl-4 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <button
          onClick={() => {
            audio.playClick();
            setPersonToEdit(null);
            setIsEditorOpen(true);
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة شخص جديد</span>
        </button>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPeople.map((person) => {
          const currentYear = new Date().getFullYear();
          const age = person.birthYear ? currentYear - person.birthYear : undefined;

          return (
            <div
              key={person.id}
              className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-3xl hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start gap-3">
                <Avatar name={person.name} image={person.image} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-slate-100 truncate">
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
                <div className="flex items-center gap-2 text-slate-400">
                  <span>العلاقات: {person.relationships.length}</span>
                  <span>·</span>
                  <span>الخصائص: {person.facts.length}</span>
                </div>

                {person.facts.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {person.facts.slice(0, 3).map((f) => (
                      <span
                        key={f.id}
                        className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] truncate max-w-[120px]"
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
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    audio.playClick();
                    setPersonToEdit(person);
                    setIsEditorOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>تعديل</span>
                </button>

                <button
                  onClick={() => handleDeletePerson(person)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
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
            <Users className="w-8 h-8 mx-auto opacity-40 text-amber-400" />
            <p className="text-sm">لا يوجد أشخاص يطابقون البحث في هذه المجموعة.</p>
            <button
              onClick={() => {
                audio.playClick();
                setPersonToEdit(null);
                setIsEditorOpen(true);
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              + إضافة أول شخص للمجموعة
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
            <h3 className="text-base font-bold text-slate-100">إنشاء مجموعة جديدة</h3>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                اسم المجموعة <span className="text-rose-400">*</span>
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
                placeholder="وصف مختصر للمجموعة"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewGroupOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors"
              >
                إنشاء المجموعة
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
