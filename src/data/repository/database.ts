/**
 * Data Repository Layer
 * Manages persistent storage, groups, people, temporal updates, and import/export.
 */

import { Group, Person, ExportDataV1 } from '../models/types';
import { storage } from '../storage/storageDriver';

const GROUPS_KEY = 'groups_v1';
const PEOPLE_KEY = 'people_v1';

export class DatabaseService {
  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    const groups = this.getGroups();
    if (groups.length === 0) {
      this.seedDemoData();
    }
  }

  // --- GROUPS ---

  getGroups(): Group[] {
    return storage.getItem<Group[]>(GROUPS_KEY, []);
  }

  getGroup(id: string): Group | undefined {
    return this.getGroups().find((g) => g.id === id);
  }

  saveGroup(group: Group): void {
    const groups = this.getGroups();
    const idx = groups.findIndex((g) => g.id === group.id);
    const updated = { ...group, updatedAt: Date.now() };

    if (idx >= 0) {
      groups[idx] = updated;
    } else {
      groups.push(updated);
    }
    storage.setItem(GROUPS_KEY, groups);
  }

  deleteGroup(groupId: string): void {
    const groups = this.getGroups().filter((g) => g.id !== groupId);
    storage.setItem(GROUPS_KEY, groups);

    // Delete associated people
    const people = this.getAllPeople().filter((p) => p.groupId !== groupId);
    storage.setItem(PEOPLE_KEY, people);
  }

  // --- PEOPLE ---

  getAllPeople(): Person[] {
    return storage.getItem<Person[]>(PEOPLE_KEY, []);
  }

  getPeople(groupId: string): Person[] {
    return this.getAllPeople().filter((p) => p.groupId === groupId);
  }

  getPerson(id: string): Person | undefined {
    return this.getAllPeople().find((p) => p.id === id);
  }

  savePerson(person: Person): void {
    const people = this.getAllPeople();
    const idx = people.findIndex((p) => p.id === person.id);
    const existing = idx >= 0 ? people[idx] : undefined;

    let updatedCityHistory = person.cityHistory ? [...person.cityHistory] : [];
    let updatedProfHistory = person.professionHistory ? [...person.professionHistory] : [];

    // Track city changes temporally without silent overwrite
    if (existing && existing.city && person.city && existing.city !== person.city) {
      updatedCityHistory = updatedCityHistory.map((r) =>
        r.validUntil === null || r.validUntil === undefined ? { ...r, validUntil: Date.now() } : r
      );
      if (!updatedCityHistory.some((r) => r.value === existing.city)) {
        updatedCityHistory.push({
          id: `city_hist_${Date.now() - 1}`,
          value: existing.city,
          validUntil: Date.now(),
          recordedAt: existing.updatedAt || Date.now() - 1000,
        });
      }
      updatedCityHistory.push({
        id: `city_active_${Date.now()}`,
        value: person.city,
        validFrom: Date.now(),
        validUntil: null,
        recordedAt: Date.now(),
      });
    }

    // Track profession changes temporally
    if (
      existing &&
      existing.profession &&
      person.profession &&
      existing.profession !== person.profession
    ) {
      updatedProfHistory = updatedProfHistory.map((r) =>
        r.validUntil === null || r.validUntil === undefined ? { ...r, validUntil: Date.now() } : r
      );
      if (!updatedProfHistory.some((r) => r.value === existing.profession)) {
        updatedProfHistory.push({
          id: `prof_hist_${Date.now() - 1}`,
          value: existing.profession,
          validUntil: Date.now(),
          recordedAt: existing.updatedAt || Date.now() - 1000,
        });
      }
      updatedProfHistory.push({
        id: `prof_active_${Date.now()}`,
        value: person.profession,
        validFrom: Date.now(),
        validUntil: null,
        recordedAt: Date.now(),
      });
    }

    const updated: Person = {
      ...person,
      cityHistory: updatedCityHistory.length > 0 ? updatedCityHistory : undefined,
      professionHistory: updatedProfHistory.length > 0 ? updatedProfHistory : undefined,
      lastReviewedAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (idx >= 0) {
      people[idx] = updated;
    } else {
      people.push(updated);
    }
    storage.setItem(PEOPLE_KEY, people);
  }

  deletePerson(personId: string): void {
    const people = this.getAllPeople();
    const filtered = people.filter((p) => p.id !== personId);
    const cleaned = filtered.map((p) => ({
      ...p,
      relationships: (p.relationships || []).filter((r) => r.targetPersonId !== personId),
    }));
    storage.setItem(PEOPLE_KEY, cleaned);
  }

  // --- IMPORT / EXPORT ---

  exportGroup(groupId: string): ExportDataV1 {
    const group = this.getGroup(groupId);
    if (!group) throw new Error('المجموعة غير موجودة');
    const people = this.getPeople(groupId);

    return {
      version: '1.0',
      app: 'shkoun',
      exportedAt: Date.now(),
      group,
      people,
    };
  }

  importGroup(
    payload: ExportDataV1,
    mode: 'replace' | 'merge' = 'merge'
  ): { success: boolean; message: string; importedCount: number; newGroupId?: string } {
    if (!payload || payload.app !== 'shkoun' || !payload.group || !Array.isArray(payload.people)) {
      throw new Error('ملف الاستيراد غير صالح أو غير متوافق مع صيغة شكون.');
    }

    const targetGroupId =
      mode === 'merge' ? `grp_imported_${Date.now()}` : payload.group.id;

    const importedGroup: Group = {
      ...payload.group,
      id: targetGroupId,
      name:
        mode === 'merge' ? `${payload.group.name} (نسخة مستوردة)` : payload.group.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveGroup(importedGroup);

    const idMap = new Map<string, string>();
    if (mode === 'merge') {
      payload.people.forEach((p, index) => {
        idMap.set(p.id, `person_${Date.now()}_${index}`);
      });
    }

    payload.people.forEach((p) => {
      const newPersonId = mode === 'merge' ? idMap.get(p.id)! : p.id;
      const updatedRelationships = (p.relationships || []).map((rel) => ({
        ...rel,
        targetPersonId:
          mode === 'merge' ? idMap.get(rel.targetPersonId) || rel.targetPersonId : rel.targetPersonId,
      }));

      const personToSave: Person = {
        ...p,
        id: newPersonId,
        groupId: importedGroup.id,
        relationships: updatedRelationships,
        updatedAt: Date.now(),
        lastReviewedAt: Date.now(),
      };
      this.savePerson(personToSave);
    });

    return {
      success: true,
      message: `تم استيراد المجموعة "${importedGroup.name}" بنجاح (${payload.people.length} أشخاص).`,
      importedCount: payload.people.length,
      newGroupId: importedGroup.id,
    };
  }

  importData(
    payload: ExportDataV1,
    mode: 'replace' | 'merge' = 'merge'
  ): { success: boolean; message: string; importedCount: number; newGroupId?: string } {
    return this.importGroup(payload, mode);
  }

  // --- SEED NEUTRAL DEMO DATA WITH TEMPORAL KNOWLEDGE ---
  private seedDemoData(): void {
    const demoGroupId = 'demo_group_neutral';
    const demoGroup: Group = {
      id: demoGroupId,
      name: 'مجموعة تجريبية (للاختبار)',
      description: 'مجموعة وهمية لتجربة وفحص المحرك. يمكنك حذفها أو تعديلها من Creator Mode.',
      isDemo: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const p1Id = 'demo_p1';
    const p2Id = 'demo_p2';
    const p3Id = 'demo_p3';
    const p4Id = 'demo_p4';
    const p5Id = 'demo_p5';

    const demoPeople: Person[] = [
      {
        id: p1Id,
        groupId: demoGroupId,
        name: 'سليم (شخصية تجريبية)',
        gender: 'male',
        lifeStatus: 'alive',
        birthYear: 1994,
        city: 'الجزائر العاصمة',
        profession: 'مهندس برمجيات',
        relationships: [
          { id: 'rel_1', type: 'father', targetPersonId: p3Id, targetPersonName: 'أحمد (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_2', type: 'mother', targetPersonId: p4Id, targetPersonName: 'خديجة (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_3', type: 'sibling', targetPersonId: p2Id, targetPersonName: 'مريم (شخصية تجريبية)', isCurrent: true },
        ],
        facts: [
          { id: 'f1', key: 'يلعب كرة القدم', value: true, category: 'هوايات' },
          { id: 'f2', key: 'يحب الشخشوخة', value: true, category: 'عادات' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastReviewedAt: Date.now(),
      },
      {
        id: p2Id,
        groupId: demoGroupId,
        name: 'مريم (شخصية تجريبية)',
        gender: 'female',
        lifeStatus: 'alive',
        birthYear: 1998,
        city: 'وهران',
        profession: 'طبيبة أطفال',
        relationships: [
          { id: 'rel_4', type: 'father', targetPersonId: p3Id, targetPersonName: 'أحمد (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_5', type: 'mother', targetPersonId: p4Id, targetPersonName: 'خديجة (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_6', type: 'sibling', targetPersonId: p1Id, targetPersonName: 'سليم (شخصية تجريبية)', isCurrent: true },
        ],
        facts: [
          { id: 'f3', key: 'تحب قراءة الكتب', value: true, category: 'هوايات' },
          { id: 'f4', key: 'تسافر كثيراً', value: true, category: 'عادات' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastReviewedAt: Date.now(),
      },
      {
        id: p3Id,
        groupId: demoGroupId,
        name: 'أحمد (شخصية تجريبية)',
        gender: 'male',
        lifeStatus: 'alive',
        birthYear: 1965,
        city: 'الجزائر العاصمة',
        profession: 'أستاذ متقاعد',
        relationships: [
          { id: 'rel_7', type: 'spouse', targetPersonId: p4Id, targetPersonName: 'خديجة (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_8', type: 'child', targetPersonId: p1Id, targetPersonName: 'سليم (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_9', type: 'child', targetPersonId: p2Id, targetPersonName: 'مريم (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_10', type: 'father', targetPersonId: p5Id, targetPersonName: 'الحاج عمر (رحمه الله)', isCurrent: true },
        ],
        facts: [
          { id: 'f5', key: 'يحب الزراعة المنزلية', value: true, category: 'هوايات' },
          { id: 'f6', key: 'معروف بالهدوء والوقار', value: true, category: 'طباع' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastReviewedAt: Date.now(),
      },
      {
        id: p4Id,
        groupId: demoGroupId,
        name: 'خديجة (شخصية تجريبية)',
        gender: 'female',
        lifeStatus: 'alive',
        birthYear: 1968,
        city: 'الجزائر العاصمة',
        profession: 'معلمة',
        relationships: [
          { id: 'rel_11', type: 'spouse', targetPersonId: p3Id, targetPersonName: 'أحمد (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_12', type: 'child', targetPersonId: p1Id, targetPersonName: 'سليم (شخصية تجريبية)', isCurrent: true },
          { id: 'rel_13', type: 'child', targetPersonId: p2Id, targetPersonName: 'مريم (شخصية تجريبية)', isCurrent: true },
        ],
        facts: [
          { id: 'f7', key: 'ماهرة في صناعة الحلويات التقليدية', value: true, category: 'مهارات' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastReviewedAt: Date.now(),
      },
      {
        id: p5Id,
        groupId: demoGroupId,
        name: 'الحاج عمر (رحمه الله)',
        gender: 'male',
        lifeStatus: 'deceased',
        birthYear: 1935,
        deathYear: 2018,
        city: 'قسنطينة',
        profession: 'تاجر أقمشة',
        relationships: [
          { id: 'rel_14', type: 'child', targetPersonId: p3Id, targetPersonName: 'أحمد (شخصية تجريبية)', isCurrent: true },
        ],
        facts: [
          { id: 'f8', key: 'كان يحب رواية القصص التاريخية', value: true, category: 'عادات' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastReviewedAt: Date.now(),
      },
    ];

    this.saveGroup(demoGroup);
    storage.setItem(PEOPLE_KEY, demoPeople);
  }
}

export const db = new DatabaseService();
