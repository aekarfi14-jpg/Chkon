import React, { useState } from 'react';
import { Person, Relationship, CustomFact, Gender, LifeStatus, RelationshipType } from '../../data/models/types';
import { Modal } from '../../shared/ui/Modal';
import { Zap, Check, Plus, HeartHandshake, Sparkles, MapPin, Briefcase } from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface QuickAddWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  allPeopleInGroup: Person[];
  onSavePerson: (person: Person) => void;
}

const PRESET_CITIES = [
  'الجزائر العاصمة',
  'وهران',
  'قسنطينة',
  'سطيف',
  'عنابة',
  'البليدة',
  'باتنة',
  'تلمسان',
  'الأغواط',
  'ورقلة',
  'بجاية',
  'تيزي وزو',
  'مستغانم',
  'بسكرة',
];

const PRESET_PROFESSIONS = [
  'مهندس برمجيات',
  'طبيب',
  'أستاذ / معلم',
  'طالب',
  'تاجر',
  'متقاعد',
  'محامي',
  'طباخ ماهر',
  'حرفي',
  'موظف',
];

const PRESET_FACTS = [
  'يلعب كرة القدم',
  'يحب القراءة',
  'يسافر كثيراً',
  'يرتدي نظارات',
  'ماهر في الطبخ',
  'يحب الزراعة',
  'تقني وهواتف',
  'معروف بالهدوء',
  'سريع البديهة',
  'يحب الشواء',
];

export const QuickAddWizardModal: React.FC<QuickAddWizardModalProps> = ({
  isOpen,
  onClose,
  groupId,
  allPeopleInGroup,
  onSavePerson,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [lifeStatus, setLifeStatus] = useState<LifeStatus>('alive');
  const [birthYear, setBirthYear] = useState<string>('');
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');

  // Quick Relationship
  const [relType, setRelType] = useState<RelationshipType>('father');
  const [relTargetId, setRelTargetId] = useState<string>('');

  // Selected facts
  const [selectedFacts, setSelectedFacts] = useState<string[]>([]);
  const [customFactInput, setCustomFactInput] = useState('');

  const resetFields = () => {
    setName('');
    setGender('male');
    setLifeStatus('alive');
    setBirthYear('');
    setCity('');
    setProfession('');
    setRelTargetId('');
    setSelectedFacts([]);
    setCustomFactInput('');
  };

  const handleToggleFact = (factText: string) => {
    audio.playClick(500);
    if (selectedFacts.includes(factText)) {
      setSelectedFacts(selectedFacts.filter((f) => f !== factText));
    } else {
      setSelectedFacts([...selectedFacts, factText]);
    }
  };

  const handleAddCustomFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFactInput.trim()) return;
    audio.playClick();
    if (!selectedFacts.includes(customFactInput.trim())) {
      setSelectedFacts([...selectedFacts, customFactInput.trim()]);
    }
    setCustomFactInput('');
  };

  const buildPerson = (): Person | null => {
    if (!name.trim()) return null;

    const rels: Relationship[] = [];
    if (relTargetId) {
      const target = allPeopleInGroup.find((p) => p.id === relTargetId);
      if (target) {
        rels.push({
          id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: relType,
          targetPersonId: target.id,
          targetPersonName: target.name,
          isCurrent: true,
          isInferred: false,
        });
      }
    }

    const facts: CustomFact[] = selectedFacts.map((fText, idx) => ({
      id: `fact_${Date.now()}_${idx}`,
      key: fText,
      value: true,
      validFrom: Date.now(),
      validUntil: null,
      recordedAt: Date.now(),
    }));

    return {
      id: `person_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      groupId,
      name: name.trim(),
      gender,
      lifeStatus,
      birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
      city: city.trim() || undefined,
      profession: profession.trim() || undefined,
      relationships: rels,
      facts,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastReviewedAt: Date.now(),
    };
  };

  const handleSaveAndClose = (e: React.FormEvent) => {
    e.preventDefault();
    const p = buildPerson();
    if (!p) return;
    onSavePerson(p);
    audio.playVictory();
    resetFields();
    onClose();
  };

  const handleSaveAndAddAnother = (e: React.FormEvent) => {
    e.preventDefault();
    const p = buildPerson();
    if (!p) return;
    onSavePerson(p);
    audio.playChirp();
    resetFields();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="الإضافة الخاطفة الذكية ⚡ (Quick-Add Wizard)"
      maxWidth="xl"
    >
      <form onSubmit={handleSaveAndClose} className="space-y-4 text-xs sm:text-sm">
        {/* Banner */}
        <div className="p-3 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-amber-200">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            أدخل الاسم وحدد الخصائص والقرابة بنقرة واحدة سريعة دون تعقيد!
          </span>
        </div>

        {/* 1. Name, Gender, Life Status */}
        <div className="space-y-2.5 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1">
              اسم الشخص <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: يوسف، فاطمة، عمي لخضر..."
              autoFocus
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm font-bold focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Gender Toggle */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 mb-1">الجنس</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    audio.playClick();
                    setGender('male');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    gender === 'male'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ذكر
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audio.playClick();
                    setGender('female');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    gender === 'female'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  أنثى
                </button>
              </div>
            </div>

            {/* Life Status Toggle */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 mb-1">الحالة</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    audio.playClick();
                    setLifeStatus('alive');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    lifeStatus === 'alive'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  حي
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audio.playClick();
                    setLifeStatus('deceased');
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    lifeStatus === 'deceased'
                      ? 'bg-slate-700 text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  متوفى
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Quick City Chips */}
        <div className="space-y-1.5 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>المدينة / الإقامة (انقر للاختيار):</span>
            </span>
            {city && (
              <span className="text-[11px] text-amber-400 font-bold">
                المحدد: {city}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {PRESET_CITIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  audio.playClick(520);
                  setCity(city === c ? '' : c);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                  city === c
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm scale-105'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Quick Profession Chips */}
        <div className="space-y-1.5 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>المهنة أو المجال:</span>
            </span>
            {profession && (
              <span className="text-[11px] text-cyan-300 font-bold">
                المحدد: {profession}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {PRESET_PROFESSIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  audio.playClick(540);
                  setProfession(profession === p ? '' : p);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                  profession === p
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm scale-105'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Quick Relationship Linker */}
        {allPeopleInGroup.length > 0 && (
          <div className="space-y-2 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
              <span>ربط قرابة سريعة مع شخص موجود:</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as RelationshipType)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="father">أب لهذا الشخص</option>
                <option value="mother">أم لهذا الشخص</option>
                <option value="spouse">زوج / زوجة</option>
                <option value="child">ابن / ابنة</option>
                <option value="sibling">أخ / أخت</option>
              </select>

              <select
                value={relTargetId}
                onChange={(e) => setRelTargetId(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- اختياري: اختر الشخص --</option>
                {allPeopleInGroup.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 5. Quick Hobbies & Facts Chips */}
        <div className="space-y-1.5 p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>خصائص وهوايات تميزه:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_FACTS.map((f) => {
              const isSelected = selectedFacts.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleToggleFact(f)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isSelected ? `✓ ${f}` : `+ ${f}`}
                </button>
              );
            })}
          </div>

          <div className="flex gap-1.5 pt-1">
            <input
              type="text"
              value={customFactInput}
              onChange={(e) => setCustomFactInput(e.target.value)}
              placeholder="خاصية مخصصة أخرى..."
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddCustomFact}
              disabled={!customFactInput.trim()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs disabled:opacity-40"
            >
              + إضافة
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 self-start sm:self-auto py-1"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveAndAddAnother}
              disabled={!name.trim()}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>حفظ وإضافة آخر ⚡</span>
            </button>

            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 font-heading"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>حفظ وإنهاء</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
