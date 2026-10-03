import React, { useState, useEffect } from 'react';
import { Person, Relationship, CustomFact, Gender, RelationshipType } from '../../data/models/types';
import { Modal } from '../../shared/ui/Modal';
import { Avatar } from '../../shared/ui/Avatar';
import { compressImage } from '../../shared/image/imageCompressor';
import { validatePerson } from '../../core/validation/dataValidator';
import { getEnrichedRelationships } from '../../core/inference/relationshipInference';
import { Upload, Trash2, Plus, AlertTriangle, Sparkles, HeartHandshake } from 'lucide-react';
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
  const [birthYear, setBirthYear] = useState<number | undefined>(undefined);
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [facts, setFacts] = useState<CustomFact[]>([]);
  const [newFactText, setNewFactText] = useState('');

  // Relationship adding inputs
  const [relTargetId, setRelTargetId] = useState<string>('');
  const [relType, setRelType] = useState<RelationshipType>('father');

  // Load existing person data or reset
  useEffect(() => {
    if (personToEdit) {
      setName(personToEdit.name);
      setImage(personToEdit.image);
      setGender(personToEdit.gender || 'male');
      setBirthYear(personToEdit.birthYear);
      setCity(personToEdit.city || '');
      setProfession(personToEdit.profession || '');
      setRelationships(personToEdit.relationships ? [...personToEdit.relationships] : []);
      setFacts(personToEdit.facts ? [...personToEdit.facts] : []);
    } else {
      setName('');
      setImage(undefined);
      setGender('male');
      setBirthYear(undefined);
      setCity('');
      setProfession('');
      setRelationships([]);
      setFacts([]);
    }
    setNewFactText('');
    setRelTargetId('');
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

    // Check if relationship already exists
    if (relationships.some((r) => r.type === relType && r.targetPersonId === relTargetId)) {
      return;
    }

    const newRel: Relationship = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: relType,
      targetPersonId: relTargetId,
      targetPersonName: targetPerson.name,
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
    const trimmed = newFactText.trim();
    if (!trimmed) return;
    if (facts.some((f) => f.key.toLowerCase() === trimmed.toLowerCase())) return;

    const newFact: CustomFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      key: trimmed,
      value: true,
      category: 'خصائص',
    };

    setFacts([...facts, newFact]);
    setNewFactText('');
    audio.playClick();
  };

  const handleRemoveFact = (factId: string) => {
    setFacts(facts.filter((f) => f.id !== factId));
    audio.playClick();
  };

  // Quick suggestions for custom facts
  const suggestedFacts = [
    'يلعب كرة القدم',
    'يحب الشخشوخة',
    'طباخ(ة) ماهر(ة)',
    'يحب السفر والرحلات',
    'مهووس بالتكنولوجيا',
    'يحب القراءة والمطالعة',
    'يسوق سيارة',
    'سريع الغضب وعصبي',
    'هادئ جداً',
  ].filter((s) => !facts.some((f) => f.key === s));

  // Current draft person for validation
  const currentDraftPerson: Person = {
    id: personToEdit?.id || 'temp_id',
    groupId,
    name,
    image,
    gender,
    birthYear,
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
      birthYear: birthYear || undefined,
      city: city.trim() || undefined,
      profession: profession.trim() || undefined,
      relationships,
      facts,
      createdAt: personToEdit?.createdAt || Date.now(),
      updatedAt: Date.now(),
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  المدينة / مكان الإقامة
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
                  المهنة أو الدراسة
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
          </div>
        </div>

        {/* Section 2: Smart Relationships */}
        <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-200">
              <HeartHandshake className="w-4 h-4 text-amber-400" />
              <span>العلاقات العائلية (Smart Relationships)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              النظام يستنتج العلاقات العكسية تلقائياً
            </span>
          </div>

          {/* Add relationship controls */}
          {otherCandidates.length > 0 ? (
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
                <option value="">اختر شخصاً من المجموعة...</option>
                {otherCandidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddRelationship}
                disabled={!relTargetId}
                className="px-3 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة علاقة</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              أضف أشخاصاً آخرين للمجموعة لتتمكن من ربط العلاقات بينهم.
            </p>
          )}

          {/* List of explicitly set relationships */}
          <div className="flex flex-wrap gap-2 pt-1">
            {relationships.map((rel) => {
              const labelMap: Record<RelationshipType, string> = {
                father: 'أب',
                mother: 'أم',
                spouse: 'زوج/ة',
                child: 'ابن/ة',
                sibling: 'أخ/ت',
              };
              return (
                <div
                  key={rel.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-xs"
                >
                  <span className="text-amber-400 font-semibold">{labelMap[rel.type]}:</span>
                  <span>{rel.targetPersonName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRelationship(rel.id)}
                    className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors mr-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Inferred relationships notice */}
          {inferredRels.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-emerald-400 block mb-1">
                علاقات تم استنتاجها تلقائياً بواسطة المحرك الذكي:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {inferredRels.map((rel) => (
                  <span
                    key={rel.id}
                    className="px-2.5 py-1 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 rounded-lg text-[11px]"
                  >
                    {rel.type === 'child' ? 'ابن/ة' : rel.type === 'spouse' ? 'زوج/ة' : rel.type === 'sibling' ? 'أخ/ت' : rel.type}: {rel.targetPersonName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Custom Facts & Attributes */}
        <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-200">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>الخصائص والحقائق المخصصة (Custom Facts)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              تساعد المحرك على طرح أسئلة ذكية وممتعة
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
              placeholder="مثال: يلعب كرة القدم، يحب الشخشوخة، معجب بـ..."
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddFact}
              disabled={!newFactText.trim()}
              className="px-3.5 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </div>

          {/* Quick suggestions */}
          {suggestedFacts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-slate-400 self-center">اقتراحات سريعة:</span>
              {suggestedFacts.slice(0, 4).map((sugg) => (
                <button
                  key={sugg}
                  type="button"
                  onClick={() => {
                    setFacts([
                      ...facts,
                      {
                        id: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        key: sugg,
                        value: true,
                        category: 'خصائص',
                      },
                    ]);
                    audio.playClick();
                  }}
                  className="px-2 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] rounded-lg transition-colors"
                >
                  + {sugg}
                </button>
              ))}
            </div>
          )}

          {/* List of current facts */}
          <div className="flex flex-wrap gap-2 pt-1">
            {facts.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-xs"
              >
                <span>{f.key}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFact(f.id)}
                  className="p-0.5 text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {facts.length === 0 && (
              <p className="text-xs text-slate-500">لا توجد خصائص مضافة بعد.</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={errors.length > 0 || !name.trim()}
            className="px-6 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl hover:bg-amber-400 shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            حفظ الشخص
          </button>
        </div>
      </form>
    </Modal>
  );
};
