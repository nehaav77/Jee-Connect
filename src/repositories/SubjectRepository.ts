// JEE Connect - Subject Navigation Repository
// Manages Subject → Unit → Chapter hierarchy

import { BaseRepository } from './BaseRepository';
import { getDatabase } from '../db/database';

export interface Subject {
    id: string;
    name: string;
    icon: string;
    color: string;
    order_num: number;
}

export interface Unit {
    id: string;
    subject_id: string;
    name: string;
    order_num: number;
}

export interface Chapter {
    id: string;
    unit_id: string;
    name: string;
    order_num: number;
    summary?: string;
    content_uri?: string;
    is_downloaded: number;
}

export interface UnitWithChapters extends Unit {
    chapters: Chapter[];
}

class SubjectRepository extends BaseRepository<Subject> {
    tableName = 'subjects';

    async getAllSubjects(): Promise<Subject[]> {
        return this.getAll('order_num');
    }

    async getUnitsForSubject(subjectId: string): Promise<Unit[]> {
        const db = await getDatabase();
        return db.getAllAsync<Unit>(
            'SELECT * FROM units WHERE subject_id = ? ORDER BY order_num',
            [subjectId]
        );
    }

    async getChaptersForUnit(unitId: string): Promise<Chapter[]> {
        const db = await getDatabase();
        return db.getAllAsync<Chapter>(
            'SELECT * FROM chapters WHERE unit_id = ? ORDER BY order_num',
            [unitId]
        );
    }

    // Two-click access: Get full hierarchy for a subject
    async getSubjectHierarchy(subjectId: string): Promise<UnitWithChapters[]> {
        const units = await this.getUnitsForSubject(subjectId);
        const unitsWithChapters: UnitWithChapters[] = [];

        for (const unit of units) {
            const chapters = await this.getChaptersForUnit(unit.id);
            unitsWithChapters.push({ ...unit, chapters });
        }

        return unitsWithChapters;
    }

    // Get chapter count per subject (web-compatible: no JOIN needed)
    async getChapterCount(subjectId: string): Promise<number> {
        const units = await this.getUnitsForSubject(subjectId);
        let total = 0;
        for (const unit of units) {
            const chapters = await this.getChaptersForUnit(unit.id);
            total += chapters.length;
        }
        return total;
    }

    // Search chapters by name
    async searchChapters(query: string): Promise<(Chapter & { subject_name: string; unit_name: string })[]> {
        const db = await getDatabase();
        return db.getAllAsync(
            `SELECT c.*, u.name as unit_name, s.name as subject_name 
       FROM chapters c
       JOIN units u ON c.unit_id = u.id
       JOIN subjects s ON u.subject_id = s.id
       WHERE c.name LIKE ?
       ORDER BY s.order_num, u.order_num, c.order_num`,
            [`%${query}%`]
        );
    }
}

export const subjectRepository = new SubjectRepository();
