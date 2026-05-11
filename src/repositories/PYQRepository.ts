// JEE Connect - PYQ (Previous Year Questions) Repository

import { BaseRepository } from './BaseRepository';
import { getDatabase } from '../db/database';

export interface PYQuestion {
    id: string;
    chapter_id: string;
    year: number;
    shift?: string;
    question_type: 'mcq' | 'multi_answer' | 'numerical';
    question_text: string;
    question_latex?: string;
    options?: string;
    correct_answers: string;
    solution_text?: string;
    solution_latex?: string;
    difficulty: number;
    marks: number;
    negative_marks: number;
}

export interface PYQStats {
    total_questions: number;
    by_year: { year: number; count: number }[];
    by_type: { type: string; count: number }[];
    avg_difficulty: number;
}

class PYQRepository extends BaseRepository<PYQuestion> {
    tableName = 'questions';

    // Get questions by chapter
    async getByChapter(chapterId: string): Promise<PYQuestion[]> {
        return this.getWhere('chapter_id = ?', [chapterId], 'year DESC, difficulty');
    }

    // Get questions by year
    async getByYear(year: number): Promise<PYQuestion[]> {
        return this.getWhere('year = ?', [year], 'chapter_id');
    }

    // Get questions by type
    async getByType(type: PYQuestion['question_type']): Promise<PYQuestion[]> {
        return this.getWhere('question_type = ?', [type], 'year DESC');
    }

    // Multi-filter search
    async search(filters: {
        chapterId?: string;
        year?: number;
        type?: PYQuestion['question_type'];
        difficulty?: number;
        subjectId?: string;
    }): Promise<PYQuestion[]> {
        const db = await getDatabase();
        let query = 'SELECT q.* FROM questions q';
        const conditions: string[] = [];
        const params: any[] = [];

        if (filters.subjectId) {
            query += ' JOIN chapters c ON q.chapter_id = c.id JOIN units u ON c.unit_id = u.id';
            conditions.push('u.subject_id = ?');
            params.push(filters.subjectId);
        }

        if (filters.chapterId) {
            conditions.push('q.chapter_id = ?');
            params.push(filters.chapterId);
        }
        if (filters.year) {
            conditions.push('q.year = ?');
            params.push(filters.year);
        }
        if (filters.type) {
            conditions.push('q.question_type = ?');
            params.push(filters.type);
        }
        if (filters.difficulty) {
            conditions.push('q.difficulty = ?');
            params.push(filters.difficulty);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY q.year DESC, q.difficulty';

        return db.getAllAsync<PYQuestion>(query, params);
    }

    // Get statistics for a chapter
    async getChapterStats(chapterId: string): Promise<PYQStats> {
        const db = await getDatabase();

        const total = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM questions WHERE chapter_id = ?',
            [chapterId]
        );

        const byYear = await db.getAllAsync<{ year: number; count: number }>(
            'SELECT year, COUNT(*) as count FROM questions WHERE chapter_id = ? GROUP BY year ORDER BY year DESC',
            [chapterId]
        );

        const byType = await db.getAllAsync<{ type: string; count: number }>(
            'SELECT question_type as type, COUNT(*) as count FROM questions WHERE chapter_id = ? GROUP BY question_type',
            [chapterId]
        );

        const avgDiff = await db.getFirstAsync<{ avg: number }>(
            'SELECT AVG(difficulty) as avg FROM questions WHERE chapter_id = ?',
            [chapterId]
        );

        return {
            total_questions: total?.count || 0,
            by_year: byYear,
            by_type: byType,
            avg_difficulty: Math.round((avgDiff?.avg || 0) * 10) / 10,
        };
    }

    // Get available years
    async getAvailableYears(): Promise<number[]> {
        const db = await getDatabase();
        const results = await db.getAllAsync<{ year: number }>(
            'SELECT DISTINCT year FROM questions ORDER BY year DESC'
        );
        return results.map((r: { year: number }) => r.year);
    }
}

export const pyqRepository = new PYQRepository();
