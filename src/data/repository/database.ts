/**
 * Data Repository Layer
 * Manages persistent storage, groups, people, and import/export functionality.
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
    const updated = { ...person, updatedAt: Date.now() };

    if (idx >= 0) {
      people[idx] = updated;
    } else {
      people.push(updated);
    }
    storage.setItem(PEOPLE_KEY, people);
  }

  deletePerson(personId: string): void {
    const people = this.getAllPeople();
    // Remove person
    const filtered = people.filter((p) => p.id !== personId);
    // Also clean up any references in other people's relationships
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

  importData(
    data: unknown,
    mode: 'merge' | 'replace' = 'merge'
  ): { success: boolean; message: string; importedCount: number; newGroupId?: string } {
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'ملف غير صالح أو فارغ.', importedCount: 0 };
    }

    const payload = data as Partial<ExportDataV1>;
    if (payload.app !== 'shkoun' || !payload.group || !Array.isArray(payload.people)) {
      return {
        success: false,
        message: 'صيغة الملف غير متوافقة مع تطبيق شكون؟ (Shkoun).',
        importedCount: 0,
      };
    }

    const importedGroup: Group = {
      ...payload.group,
      id: mode === 'replace' ? payload.group.id : `grp_${Date.now()}`,
      isDemo: false,
      updatedAt: Date.now(),
    };

    // If replacing, remove previous data of this group
    if (mode === 'replace') {
      this.deleteGroup(importedGroup.id);
    }

    this.saveGroup(importedGroup);

    // Map old person IDs to new person IDs if merging into fresh group
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
        targetPersonId: mode === 'merge' ? idMap.get(rel.targetPersonId) || rel.targetPersonId : rel.targetPersonId,
      }));

      const personToSave: Person = {
        ...p,
        id: newPersonId,
        groupId: importedGroup.id,
        relationships: updatedRelationships,
        updatedAt: Date.now(),
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

  // --- SEED NEUTRAL DEMO DATA ---
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
        birthYear: 1994,
        city: 'الجزائر العاصمة',
        profession: 'مهندس برمجيات',
        relationships: [
          { id: 'rel_1', type: 'father', targetPersonId: p3Id, targetPersonName: 'أحمد (شخصية تجريبية)' },
          { id: 'rel_2', type: 'mother', targetPersonId: p4Id, targetPersonName: 'خديجة (شخصية تجريبية)' },
          { id: 'rel_3', type: 'sibling', targetPersonId: p2Id, targetPersonName: 'مريم (شخصية تجريبية)' },
        ],
        facts: [
          { id: 'f1', key: 'يلعب كرة القدم', value: true, category: 'هوايات' },
          { id: 'f2', key: 'يحب الشخشوخة', value: true, category: 'عادات' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: p2Id,
        groupId: demoGroupId,
        name: 'مريم (شخصية تجريبية)',
        gender: 'female',
        birthYear: 1998,
        city: 'وهران',
        profession: 'طبيبة أطفال',
        relationships: [
          { id: 'rel_4', type: 'father', targetPersonId: p3Id, targetPersonName: 'أحمد (شخصية تجريبية)' },
          { id: 'rel_5', type: 'mother', targetPersonId: p4Id, targetPersonName: 'خديجة (شخصية تجريبية)' },
          { id: 'rel_6', type: 'sibling', targetPersonId: p1Id, targetPersonName: 'سليم (شخصية تجريبية)' },
        ],
        facts: [
          { id: 'f3', key: 'تحب قراءة الكتب', value: true, category: 'هوايات' },
          { id: 'f4', key: 'تسافر كثيراً', value: true, category: 'عادات' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: p3Id,
        groupId: demoGroupId,
        name: 'أحمد (شخصية تجريبية)',
        gender: 'male',
        birthYear: 1965,
        city: 'الجزائر العاصمة',
        profession: 'أستاذ متقاعد',
        relationships: [
          { id: 'rel_7', type: 'spouse', targetPersonId: p4Id, targetPersonName: 'خديجة (شخصية تجريبية)' },
          { id: 'rel_8', type: 'child', targetPersonId: p1Id, targetPersonName: 'سليم (شخصية تجريبية)' },
          { id: 'rel_9', type: 'child', targetPersonId: p2Id, targetPersonName: 'مريم (شخصية تجريبية)' },
        ],
        facts: [
          { id: 'f5', key: 'يحب الزراعة المنزلية', value: true, category: 'هوايات' },
          { id: 'f6', key: 'معروف بالهدوء والوقار', value: true, category: 'طباع' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: p4Id,
        groupId: demoGroupId,
        name: 'خديجة (شخصية تجريبية)',
        gender: 'female',
        birthYear: 1970,
        city: 'الجزائر العاصمة',
        profession: 'مديرة مدرسة',
        relationships: [
          { id: 'rel_10', type: 'spouse', targetPersonId: p3Id, targetPersonName: 'أحمد (شخصية تجريبية)' },
          { id: 'rel_11', type: 'child', targetPersonId: p1Id, targetPersonName: 'سليم (شخصية تجريبية)' },
          { id: 'rel_12', type: 'child', targetPersonId: p2Id, targetPersonName: 'مريم (شخصية تجريبية)' },
        ],
        facts: [
          { id: 'f7', key: 'طباخة ماهرة في الحلويات', value: true, category: 'مهارات' },
          { id: 'f8', key: 'تحب الشخشوخة', value: true, category: 'عادات' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: p5Id,
        groupId: demoGroupId,
        name: 'ياسين (شخصية تجريبية)',
        gender: 'male',
        birthYear: 2004,
        city: 'قسنطينة',
        profession: 'طالب جامعي',
        relationships: [],
        facts: [
          { id: 'f9', key: 'يلعب ألعاب الفيديو', value: true, category: 'هوايات' },
          { id: 'f10', key: 'يحب الشخشوخة', value: true, category: 'عادات' },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    storage.setItem(GROUPS_KEY, [demoGroup]);
    storage.setItem(PEOPLE_KEY, demoPeople);
  }
}

export const db = new DatabaseService();
