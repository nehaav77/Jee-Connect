// JEE Connect - Adaptive Test Service
// Uses per-student heatmap weakness data to generate personalized practice tests

import { getDatabase } from '../db/database';
import { analyticsService, ChapterPerformance } from './AnalyticsService';
import { testRepository } from '../repositories/TestRepository';
import { generateId } from '../repositories/BaseRepository';

export interface AdaptiveBreakdown {
    totalQuestions: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    focusChapters: { name: string; level: string; questionCount: number }[];
    weakChapterCount: number;
    moderateChapterCount: number;
    strongChapterCount: number;
}

interface ChapterQuotaEntry {
    chapter_id: string;
    chapter_name: string;
    weakness_level: string;
    accuracy: number;
    difficultyMin: number;
    difficultyMax: number;
    weight: number;
}

class AdaptiveTestServiceClass {

    async generateAdaptiveTest(
        userEmail: string,
        testType: 'full' | 'subject' = 'full',
        subjectFilter?: string,
        totalQuestions: number = 30
    ): Promise<{ testId: string; breakdown: AdaptiveBreakdown }> {
        const db = await getDatabase();

        const heatmap = await analyticsService.getWeaknessHeatmap(userEmail);

        let filteredHeatmap = heatmap;
        if (subjectFilter) {
            filteredHeatmap = heatmap.filter(h => h.subject_name === subjectFilter);
        }

        if (testType === 'full') {
            totalQuestions = Math.min(75, totalQuestions);
        }

        const quotas = this.buildChapterQuotas(filteredHeatmap);

        const totalWeight = quotas.reduce((sum, q) => sum + q.weight, 0);
        if (totalWeight === 0) {
            throw new Error('No chapter data available to generate adaptive test');
        }

        const selectedQuestionIds: string[] = [];
        const focusChapters: AdaptiveBreakdown['focusChapters'] = [];
        let easyCount = 0, mediumCount = 0, hardCount = 0;

        for (const quota of quotas) {
            const rawAllocation = (quota.weight / totalWeight) * totalQuestions;
            const chapterQuota = Math.max(1, Math.round(rawAllocation));

            const questions = await db.getAllAsync<{ id: string; difficulty: number }>(
                `SELECT id, difficulty FROM questions 
                 WHERE chapter_id = ? AND difficulty >= ? AND difficulty <= ?
                 ORDER BY RANDOM()`,
                [quota.chapter_id, quota.difficultyMin, quota.difficultyMax]
            );

            let picked = 0;
            for (const q of questions) {
                if (picked >= chapterQuota) break;
                if (!selectedQuestionIds.includes(q.id)) {
                    selectedQuestionIds.push(q.id);
                    picked++;

                    if (q.difficulty <= 2) easyCount++;
                    else if (q.difficulty <= 3) mediumCount++;
                    else hardCount++;
                }
            }

            if (picked === 0) {
                const fallbackQs = await db.getAllAsync<{ id: string; difficulty: number }>(
                    `SELECT id, difficulty FROM questions 
                     WHERE chapter_id = ?
                     ORDER BY RANDOM() LIMIT ?`,
                    [quota.chapter_id, chapterQuota]
                );
                for (const q of fallbackQs) {
                    if (!selectedQuestionIds.includes(q.id)) {
                        selectedQuestionIds.push(q.id);
                        picked++;
                        if (q.difficulty <= 2) easyCount++;
                        else if (q.difficulty <= 3) mediumCount++;
                        else hardCount++;
                    }
                }
            }

            if (picked > 0) {
                focusChapters.push({
                    name: quota.chapter_name,
                    level: quota.weakness_level,
                    questionCount: picked,
                });
            }
        }

        if (selectedQuestionIds.length === 0) {
            throw new Error('No questions available for adaptive test');
        }

        const weakChapterCount = quotas.filter(q => q.weakness_level === 'critical' || q.weakness_level === 'weak').length;
        const moderateChapterCount = quotas.filter(q => q.weakness_level === 'moderate' || q.weakness_level === 'unattempted').length;
        const strongChapterCount = quotas.filter(q => q.weakness_level === 'strong').length;

        const durationMin = Math.max(15, Math.round(selectedQuestionIds.length * 2.5));

        const subjectTag = subjectFilter ? ` (${subjectFilter})` : '';
        const title = `🎯 Smart Practice${subjectTag}`;
        const description = `Adaptive · ${selectedQuestionIds.length}Q · ${easyCount} Easy, ${mediumCount} Med, ${hardCount} Hard`;

        const testId = await testRepository.createTest(
            title,
            description,
            durationMin,
            selectedQuestionIds,
            testType === 'full' ? 'full' : 'subject',
            userEmail
        );

        const breakdown: AdaptiveBreakdown = {
            totalQuestions: selectedQuestionIds.length,
            easyCount,
            mediumCount,
            hardCount,
            focusChapters,
            weakChapterCount,
            moderateChapterCount,
            strongChapterCount,
        };

        console.log(`[Adaptive] Generated test ${testId}: ${selectedQuestionIds.length}Q ` +
            `(Easy:${easyCount}, Med:${mediumCount}, Hard:${hardCount}) ` +
            `for ${userEmail}`);

        return { testId, breakdown };
    }

    private buildChapterQuotas(heatmap: ChapterPerformance[]): ChapterQuotaEntry[] {
        const quotas: ChapterQuotaEntry[] = [];

        for (const ch of heatmap) {
            let difficultyMin: number, difficultyMax: number, weight: number, level: string;

            if (ch.total_attempted === 0) {
                difficultyMin = 1;
                difficultyMax = 2;
                weight = 3;
                level = 'unattempted';
            } else if (ch.weakness_level === 'critical') {
                difficultyMin = 1;
                difficultyMax = 2;
                weight = 5;
                level = 'critical';
            } else if (ch.weakness_level === 'weak') {
                difficultyMin = 1;
                difficultyMax = 2;
                weight = 4;
                level = 'weak';
            } else if (ch.weakness_level === 'moderate') {
                difficultyMin = 2;
                difficultyMax = 3;
                weight = 2;
                level = 'moderate';
            } else {
                difficultyMin = 4;
                difficultyMax = 5;
                weight = 1;
                level = 'strong';
            }

            quotas.push({
                chapter_id: ch.chapter_id,
                chapter_name: ch.chapter_name,
                weakness_level: level,
                accuracy: ch.accuracy,
                difficultyMin,
                difficultyMax,
                weight,
            });
        }

        quotas.sort((a, b) => b.weight - a.weight);

        return quotas;
    }

    async getImprovementData(
        userEmail: string
    ): Promise<{ chapter: string; subject: string; previousAccuracy: number; currentAccuracy: number; change: number }[]> {
        const db = await getDatabase();
        const improvements: { chapter: string; subject: string; previousAccuracy: number; currentAccuracy: number; change: number }[] = [];

        try {
            const chapters = await db.getAllAsync<{ id: string; name: string; unit_id: string }>(
                'SELECT * FROM chapters'
            );

            for (const chapter of chapters) {
                const unit = await db.getFirstAsync<{ subject_id: string }>(
                    'SELECT subject_id FROM units WHERE id = ?', [chapter.unit_id]
                );
                const subject = await db.getFirstAsync<{ name: string }>(
                    'SELECT name FROM subjects WHERE id = ?', [unit?.subject_id || '']
                );

                const questions = await db.getAllAsync<{ id: string }>(
                    'SELECT id FROM questions WHERE chapter_id = ?', [chapter.id]
                );
                if (questions.length === 0) continue;
                const qIds = new Set(questions.map(q => q.id));

                const attempts = await db.getAllAsync<{ answers: string; started_at: string }>(
                    `SELECT answers, started_at FROM test_attempts 
                     WHERE status = 'completed' AND user_email = ?
                     ORDER BY started_at ASC`,
                    [userEmail]
                );

                if (attempts.length < 2) continue;

                const midpoint = Math.floor(attempts.length / 2);
                const olderAttempts = attempts.slice(0, midpoint);
                const newerAttempts = attempts.slice(midpoint);

                const calcAccuracy = async (attemptSlice: typeof attempts) => {
                    let total = 0, correct = 0;
                    for (const att of attemptSlice) {
                        const ans = JSON.parse(att.answers || '{}');
                        for (const qId of Object.keys(ans)) {
                            if (!qIds.has(qId)) continue;
                            total++;
                            const question = await db.getFirstAsync<{ correct_answers: string; question_type: string }>(
                                'SELECT correct_answers, question_type FROM questions WHERE id = ?', [qId]
                            );
                            if (!question) continue;
                            const correctAns = JSON.parse(question.correct_answers);
                            const userAns = ans[qId];
                            if (question.question_type === 'numerical') {
                                if (String(userAns).trim() === String(correctAns[0]).trim()) correct++;
                            } else {
                                if (String(userAns).trim().toUpperCase() === String(correctAns[0]).trim().toUpperCase()) correct++;
                            }
                        }
                    }
                    return total > 0 ? Math.round((correct / total) * 100) : -1;
                };

                const prevAcc = await calcAccuracy(olderAttempts);
                const currAcc = await calcAccuracy(newerAttempts);

                if (prevAcc >= 0 && currAcc >= 0) {
                    improvements.push({
                        chapter: chapter.name,
                        subject: subject?.name || '',
                        previousAccuracy: prevAcc,
                        currentAccuracy: currAcc,
                        change: currAcc - prevAcc,
                    });
                }
            }
        } catch (e) {
            console.log('[Adaptive] Improvement data error:', e);
        }

        improvements.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

        return improvements;
    }
}

export const adaptiveTestService = new AdaptiveTestServiceClass();
