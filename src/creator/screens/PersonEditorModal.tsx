import React, { useState, useEffect } from 'react';
import {
  Person,
  Relationship,
  CustomFact,
  Gender,
  LifeStatus,
  RelationshipType,
  getCurrentLifeStatus,
} from '../../data/models/types';
import { Modal } from '../../shared/ui/Modal';
import { Avatar } from '../../shared/ui/Avatar';
import { compressImage } from '../../shared/image/imageCompressor';
import { validatePerson } from '../../core/validation/dataValidator';
import { getEnrichedRelationships } from '../../core/inference/relationshipInference';
import {
  Upload,
  Trash2,
  Plus,
  AlertTriangle,
  Sparkles,
  HeartHandshake,
  History,
} from 'lucide-react';
import { audio } from '../../shared/sound/audioService';

interface PersonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  personToEdit?: Person | null;
  groupId: string;
  allPeopleInGroup: Person[];
  onSave: (person: Person) => void;
}

export const PersonEditorModal: React.FC<PersonEditorModalProps> = ({
  isOpen,
  onClose,
  personToEdit,
  groupId,
  allPeopleInGroup,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [gender, setGender] = useState<Gender | undefined>('male');
  const [lifeStatus, setLifeStatus] = useState<LifeStatus>('alive');
  const [birthYear, setBirthYear] = useState<number | undefined>(undefined);
  const [deathYear, setDeathYear] = useState<number | undefined>(undefined);
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [facts, setFacts] = useState<CustomFact[]>([]);
  const [newFactText, setNewFactText] = useState('');

  // Relationship adding inputs
  const [relTargetId, setRelTargetId] = useState<string>('');
  const [relType, setRelType] = useState<RelationshipType>('father');
  const [isSpouseCurrent, setIsSpouseCurrent] = useState<boolean>(true);

  // Load existing person data or reset
  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name);
      setImage(personToEdit.image);
      setGender(personToEdit.gender || 'male');
      setLifeStatus(getCurrentLifeStatus(personToEdit));
      setBirthYear(personToEdit.birthYear);
      setDeathYear(personToEdit.deathYear);
      setCity(personToEdit.city || '');
      setProfession(personToEdit.profession || '');
      setRelationships(personToEdit.relationships ? [...personToEdit.relationships] : []);
      setFacts(personToEdit.facts ? [...personToEdit.facts] : []);
    } else {
      setName('');
      setImage(undefined);
      setGender('male');
      setLifeStatus('alive');
      setBirthYear(undefined);
      setDeathYear(undefined);
      setCity('');
      setProfession('');
      setRelationships([]);
      setFacts([]);
    }
    setNewFactText('');
    setRelTargetId('');
    setIsSpouseCurrent(true);
  }, [personToEdit, isOpen]);

  const otherCandidates = allPeopleInGroup.filter((p) => p.id !== personToEdit?.id);

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
      audio.playClick();
    } catch (err) {
      console.error('Image upload failed', err);
    }
  };

  // Add Relationship
  const handleAddRelationship = () => {
    if (!relTargetId) return;
    const targetPerson = allPeopleInGroup.find((p) => p.id === relTargetId);
    if (!targetPerson) return;

    // Check duplicate
    if (relationships.some((r) => r.type === relType && r.targetPersonId === relTargetId)) {
      return;
    }

    const newRel: Relationship = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: relType,
      targetPersonId: relTargetId,
      targetPersonName: targetPerson.name,
      isCurrent: relType === 'spouse' ? isSpouseCurrent : true,
      isInferred: false,
    };

    setRelationships([...relationships, newRel]);
    setRelTargetId('');
    audio.playClick();
  };

  const handleRemoveRelationship = (relId: string) => {
    setRelationships(relationships.filter((r) => r.id !== relId));
    audio.playClick();
  };

  // Add Custom Fact
  const handleAddFact = () => {
    if (!newFactText.trim()) return;
    const newFact: CustomFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      key: newFactText.trim(),
      value: true,
      category: 'عام',
      validFrom: Date.now(),
      validUntil: null,
      recordedAt: Date.now(),
    };

    setFacts([...facts, newFact]);
    setNewFactText('');
    audio.playClick();
  };

  const handleRemoveFact = (factId: string) => {
    setFacts(facts.filter((f) => f.id !== factId));
    audio.playClick();
  };

  // Live validation
  const currentDraftPerson: Person = {
    id: personToEdit?.id || 'draft',
    groupId,
    name,
    image,
    gender,
    lifeStatus,
    birthYear,
    deathYear: lifeStatus === 'deceased' ? deathYear : undefined,
    city,
    profession,
    relationships,
    facts,
    createdAt: personToEdit?.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  const validationIssues = validatePerson(currentDraftPerson, allPeopleInGroup);
  const errors = validationIssues.filter((i) => i.type === 'error');

  // Inferred relationships for display
  const enrichedRels = getEnrichedRelationships(currentDraftPerson, allPeopleInGroup);
  const inferredRels = enrichedRels.filter((r) => r.isInferred);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0 || !name.trim()) return;

    const savedPerson: Person = {
      id: personToEdit?.id || `person_${Date.now()}`,
      groupId,
      name: name.trim(),
      image,
      gender,
      lifeStatus,
      birthYear: birthYear || undefined,
      deathYear: lifeStatus === 'deceased' ? deathYear || undefined : undefined,
      city: city.trim() || undefined,
      profession: profession.trim() || undefined,
      cityHistory: personToEdit?.cityHistory,
      professionHistory: personToEdit?.professionHistory,
      relationships,
      facts,
      createdAt: personToEdit?.createdAt || Date.now(),
      updatedAt: Date.now(),
      lastReviewedAt: Date.now(),
    };

    onSave(savedPerson);
    audio.playClick();
    onClose();
  };

  const currentYear = new Date().getFullYear();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={personToEdit ? 'تعديل بيانات الشخص' : 'إضافة شخص جديد'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Errors banner */}
        {errors.length > 0 && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-rose-200 text-xs sm:text-sm space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>يوجد أخطاء في البيانات تمنع الحفظ:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pr-2">
              {errors.map((err) => (
                <li key={err.id}>{err.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Section 1: Main Info & Photo */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <Avatar name={name || 'ش'} image={image} size="xl" />
            <div className="flex items-center gap-1">
              <label className="cursor-pointer px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>{image ? 'تغيير' : 'صورة'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {image && (
                <button
                  type="button"
                  onClick={() => setImage(undefined)}
                  className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors"
                  title="حذف الصورة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 w-full space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                الاسم الكامل <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أحمد، سليم، فاطمة..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الجنس
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                  <option value="other">آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الحالة الحياتية
                </label>
                <select
                  value={lifeStatus}
                  onChange={(e) => setLifeStatus(e.target.value as LifeStatus)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value="alive">على قيد الحياة</option>
                  <option value="deceased">متوفى (رحمه الله)</option>
                  <option value="unknown">غير محدد</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  سنة الميلاد {birthYear ? `(العمر: ~${currentYear - birthYear})` : ''}
                </label>
                <input
                  type="number"
                  min="1900"
                  max={currentYear}
                  value={birthYear ?? ''}
                  onChange={(e) =>
                    setBirthYear(e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                  placeholder="مثال: 1995"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {lifeStatus === 'deceased' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    سنة الوفاة (اختياري)
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max={currentYear}
                    value={deathYear ?? ''}
                    onChange={(e) =>
                      setDeathYear(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    placeholder="مثال: 2021"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <div />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المدينة الحالية / مكان الإقامة
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: الجزائر العاصمة، وهران..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المهنة أو الدراسة الحالية
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="مثال: مهندس، طالب، طبيب..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Past Historical Attributes Indicator */}
            {((personToEdit?.cityHistory && personToEdit.cityHistory.length > 1) ||
              (personToEdit?.professionHistory && personToEdit.professionHistory.length > 1)) && (
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs space-y-1 text-slate-400">
                <span className="font-bold flex items-center gap-1 text-amber-400">
                  <History className="w-3.5 h-3.5" />
                  <span>السجل الزمني المحفوظ في قاعدة البيانات:</span>
                </span>
                {personToEdit?.cityHistory && personToEdit.cityHistory.length > 1 && (
                  <p className="text-[11px]">
                    مدن سابقة:{' '}
                    {personToEdit.cityHistory
                      .filter((r) => r.validUntil !== null && r.validUntil !== undefined)
                      .map((r) => r.value)
                      .join('، ')}
                  </p>
                )}
                {personToEdit?.professionHistory && personToEdit.professionHistory.length > 1 && (
                  <p className="text-[11px]">
                    مهن سابقة:{' '}
                    {personToEdit.professionHistory
                      .filter((r) => r.validUntil !== null && r.validUntil !== undefined)
                      .map((r) => r.value)
                      .join('، ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Smart Relationships */}
        <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-200">
              <HeartHandshake className="w-4 h-4 text-amber-400" />
              <span>العلاقات العائلية الذكية (Smart Relationships)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              النظام يستنتج العلاقات العكسية والزمنية تلقائياً
            </span>
          </div>

          {/* Add relationship controls */}
          {otherCandidates.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value as RelationshipType)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500 shrink-0"
                >
                  <option value="father">أب للشخص</option>
                  <option value="mother">أم للشخص</option>
                  <option value="spouse">زوج / زوجة</option>
                  <option value="child">ابن / ابنة</option>
                  <option value="sibling">أخ / أخت</option>
                </select>

                <select
                  value={relTargetId}
                  onChange={(e) => setRelTargetId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر الشخص المعني بالعلاقة --</option>
                  {otherCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddRelationship}
                  disabled={!relTargetId}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center justify-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>

              {relType === 'spouse' && (
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isSpouseCurrent}
                    onChange={(e) => setIsSpouseCurrent(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <span>زواج حالي نشط (إذا كان زواجاً سابقاً أو تم الطلاق، أزل التحديد)</span>
                </label>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              يجب إضافة أشخاص آخرين في هذا العالم لتتمكن من ربط العلاقات معهم.
            </p>
          )}

          {/* Explicit relationships list */}
          {relationships.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-slate-400 block">العلاقات المحددة:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <span className="text-slate-200">
                      {rel.type === 'father'
                        ? 'الوالد:'
                        : rel.type === 'mother'
                        ? 'الوالدة:'
                        : rel.type === 'spouse'
                        ? rel.isCurrent === false
                          ? 'زوج/ة سابق:'
                          : 'الزوج/ة:'
                        : rel.type === 'child'
                        ? 'الابن/ة:'
                        : 'الأخ/ت:'}{' '}
                      <strong className="text-amber-300 font-bold">{rel.targetPersonName}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRelationship(rel.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="حذف العلاقة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inferred relationships notice */}
          {inferredRels.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-amber-300 block">
                علاقات مستنتجة تلقائياً بواسطة المحرك الذكي:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 pr-1">
                {inferredRels.map((inf) => (
                  <li key={inf.id}>
                    {inf.type === 'child'
                      ? 'ابن/ابنة لـ'
                      : inf.type === 'father'
                      ? 'أب لـ'
                      : inf.type === 'mother'
                      ? 'أم لـ'
                      : inf.type === 'spouse'
                      ? 'زوج/ة لـ'
                      : 'أخ/أخت لـ'}{' '}
                    <strong className="text-amber-200">{inf.targetPersonName}</strong> (استنتاج عكسي)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Section 3: Custom Facts & Attributes */}
        <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-200">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>الخصائص والعادات والصفات المخصصة (Custom Facts)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              تتحول تلقائياً لأسئلة ذكية في اللعبة
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newFactText}
              onChange={(e) => setNewFactText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFact();
                }
              }}
              placeholder="مثال: يحب صيد السمك، يرتدي نظارات، سريع الغضب..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddFact}
              disabled={!newFactText.trim()}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs sm:text-sm hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خاصية</span>
            </button>
          </div>

          {facts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {facts.map((fact) => (
                <div
                  key={fact.id}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200"
                >
                  <span>{fact.key}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFact(fact.id)}
                    className="text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={errors.length > 0 || !name.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-all cursor-pointer font-heading"
          >
            {personToEdit ? 'حفظ التعديلات' : 'إضافة الشخص للعالم'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
