// JEE Connect - Test Engine Repository
// Manages mock tests, attempts, and result analytics

import { BaseRepository, generateId } from './BaseRepository';
import { getDatabase } from '../db/database';
import { syncService } from '../services/SyncService';

export interface Test {
    id: string;
    title: string;
    description?: string;
    duration_min: number;
    total_marks: number;
    total_questions: number;
    test_type: 'full' | 'subject' | 'chapter' | 'custom';
    status: 'draft' | 'in_progress' | 'completed';
    created_at: string;
}

export interface TestAttempt {
    id: string;
    test_id: string;
    started_at: string;
    ended_at?: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    answers: string; // JSON map: questionId -> answer
    score?: number;
    total_attempted: number;
    correct_count: number;
    wrong_count: number;
    time_per_question: string; // JSON map: questionId -> seconds
    tab_violations?: number;
    is_disqualified?: number;
    xp_awarded?: number;
    question_ids?: string; // JSON array of question IDs for this attempt
    user_email?: string;
}

export interface TestQuestion {
    test_id: string;
    question_id: string;
    order_num: number;
}

export interface Question {
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

class TestRepository extends BaseRepository<Test> {
    tableName = 'tests';

    // Get all available tests for a specific user (includes global catalog + user-created)
    async getAllTests(userEmail?: string): Promise<Test[]> {
        if (userEmail) {
            const db = await getDatabase();
            return await db.getAllAsync<Test>(
                `SELECT * FROM tests WHERE user_email = ? OR user_email IS NULL ORDER BY created_at DESC`,
                [userEmail]
            );
        }
        return this.getAll('created_at DESC');
    }

    // Get questions for a test (web-compatible: no JOIN)
    async getTestQuestions(testId: string, attemptId?: string): Promise<Question[]> {
        const db = await getDatabase();
        let questionIdsToFetch: string[] = [];

        if (attemptId) {
            const attempt = await db.getFirstAsync<TestAttempt>(
                'SELECT question_ids FROM test_attempts WHERE id = ?',
                [attemptId]
            );
            if (attempt && attempt.question_ids) {
                try {
                    questionIdsToFetch = JSON.parse(attempt.question_ids);
                } catch (e) {
                    console.log('Error parsing dynamic question_ids:', e);
                }
            }
        }

        // Fallback to static test_questions if no attempt or no dynamic questions
        if (questionIdsToFetch.length === 0) {
            const links = await db.getAllAsync<TestQuestion>(
                'SELECT * FROM test_questions WHERE test_id = ? ORDER BY order_num',
                [testId]
            );
            questionIdsToFetch = links.map(l => l.question_id);
        }

        // Fetch each question by id
        const questions: Question[] = [];
        for (const qid of questionIdsToFetch) {
            const q = await db.getFirstAsync<Question>(
                'SELECT * FROM questions WHERE id = ?',
                [qid]
            );
            if (q) questions.push(q);
        }
        return questions;
    }

    // Create a new test from selected questions (web-compatible)
    async createTest(
        title: string,
        description: string,
        durationMin: number,
        questionIds: string[],
        testType: Test['test_type'] = 'custom',
        userEmail?: string
    ): Promise<string> {
        const db = await getDatabase();
        const testId = generateId();
        const totalMarks = questionIds.length * 4; // 4 marks per question default

        await db.runAsync(
            `INSERT INTO tests (id, title, description, duration_min, total_marks, total_questions, test_type, user_email) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [testId, title, description, durationMin, totalMarks, questionIds.length, testType, userEmail || null]
        );

        // Link questions to test
        for (let i = 0; i < questionIds.length; i++) {
            await db.runAsync(
                'INSERT INTO test_questions (test_id, question_id, order_num) VALUES (?, ?, ?)',
                [testId, questionIds[i], i + 1]
            );
        }

        return testId;
    }

    // Start a test attempt (generates dynamic questions based on previous mistakes)
    async startAttempt(testId: string, userEmail?: string): Promise<string> {
        const db = await getDatabase();
        const attemptId = generateId();

        let finalQuestionIds: string[] = [];
        
        try {
            if (userEmail) {
                // 1. Get original questions to know target length and chapters
                const originalLinks = await db.getAllAsync<TestQuestion>(
                    'SELECT question_id FROM test_questions WHERE test_id = ? ORDER BY order_num',
                    [testId]
                );
                const targetLength = originalLinks.length;
                
                if (targetLength > 0) {
                    const originalQuestionIds = originalLinks.map(l => l.question_id);
                    const chapters = new Set<string>();
                    for (const qid of originalQuestionIds) {
                        const q = await db.getFirstAsync<Question>('SELECT chapter_id FROM questions WHERE id = ?', [qid]);
                        if (q) chapters.add(q.chapter_id);
                    }

                    // 2. Fetch last attempt to find mistakes
                    const lastAttempt = await db.getFirstAsync<TestAttempt>(
                        `SELECT answers FROM test_attempts WHERE test_id = ? AND user_email = ? AND status = 'completed' ORDER BY started_at DESC LIMIT 1`,
                        [testId, userEmail]
                    );

                    const wrongQuestionIds = new Set<string>();
                    const correctQuestionIds = new Set<string>();

                    if (lastAttempt) {
                        const answers = JSON.parse(lastAttempt.answers || '{}');
                        const questionIds = Object.keys(answers);
                        for (const qId of questionIds) {
                            const question = await db.getFirstAsync<Question>('SELECT * FROM questions WHERE id = ?', [qId]);
                            if (!question) continue;
                            const userAnswer = answers[qId];
                            if (userAnswer === undefined || userAnswer === null || String(userAnswer).trim() === '') {
                                wrongQuestionIds.add(qId);
                                continue;
                            }
                            let correctAnsArray: string[] = [];
                            try { correctAnsArray = JSON.parse(question.correct_answers); } catch { correctAnsArray = [question.correct_answers]; }
                            const correctAnsStr = Array.isArray(correctAnsArray) ? correctAnsArray[0] : correctAnsArray;
                            let isCorrect = false;
                            if (question.question_type === 'numerical') {
                                isCorrect = parseFloat(String(userAnswer).trim()) === parseFloat(String(correctAnsStr).trim());
                            } else {
                                isCorrect = String(userAnswer).trim().toUpperCase() === String(correctAnsStr).trim().toUpperCase();
                            }
                            if (isCorrect) correctQuestionIds.add(qId);
                            else wrongQuestionIds.add(qId);
                        }
                    }

                    // 3. Pool of all questions from relevant chapters
                    const allChapterQuestions: string[] = [];
                    for (const chapter of chapters) {
                        const qs = await db.getAllAsync<{id: string}>('SELECT id FROM questions WHERE chapter_id = ?', [chapter]);
                        allChapterQuestions.push(...qs.map(q => q.id));
                    }

                    // Exclude questions already in wrongQuestionIds and correctQuestionIds
                    const availablePool = allChapterQuestions.filter(id => !wrongQuestionIds.has(id) && !correctQuestionIds.has(id));
                    // Shuffle
                    const shuffled = availablePool.sort(() => 0.5 - Math.random());

                    finalQuestionIds = Array.from(wrongQuestionIds);
                    // Fill remaining slots
                    while (finalQuestionIds.length < targetLength && shuffled.length > 0) {
                        finalQuestionIds.push(shuffled.pop()!);
                    }
                    // If still short, use correct questions from last time
                    const correctArr = Array.from(correctQuestionIds).sort(() => 0.5 - Math.random());
                    while (finalQuestionIds.length < targetLength && correctArr.length > 0) {
                        finalQuestionIds.push(correctArr.pop()!);
                    }
                    // If STILL short, fallback to original test questions
                    if (finalQuestionIds.length < targetLength) {
                        finalQuestionIds = originalQuestionIds;
                    }
                    
                    // Final shuffle so the test feels fresh and questions aren't always in wrong -> correct order
                    finalQuestionIds = finalQuestionIds.sort(() => 0.5 - Math.random());
                } else {
                    finalQuestionIds = await db.getAllAsync<{question_id: string}>('SELECT question_id FROM test_questions WHERE test_id = ? ORDER BY order_num', [testId])
                        .then(res => res.map(r => r.question_id));
                }
            }
        } catch (e) {
            console.error('Error generating dynamic test questions:', e);
            finalQuestionIds = []; // fallback to static
        }

        const questionIdsJson = finalQuestionIds.length > 0 ? JSON.stringify(finalQuestionIds) : null;

        await db.runAsync(
            `INSERT INTO test_attempts (id, test_id, started_at, status, answers, time_per_question, question_ids, user_email) 
       VALUES (?, ?, datetime('now'), 'in_progress', '{}', '{}', ?, ?)`,
            [attemptId, testId, questionIdsJson, userEmail || null]
        );

        return attemptId;
    }

    // Auto-save answers during a test
    async saveAnswer(
        attemptId: string,
        questionId: string,
        answer: string | string[],
        timeSpentSec: number
    ): Promise<void> {
        const db = await getDatabase();

        // Get current attempt
        const attempt = await db.getFirstAsync<TestAttempt>(
            'SELECT * FROM test_attempts WHERE id = ?',
            [attemptId]
        );
        if (!attempt) return;

        // Update answers JSON
        const answers = JSON.parse(attempt.answers || '{}');
        answers[questionId] = answer;

        // Update time splits
        const timeSplits = JSON.parse(attempt.time_per_question || '{}');
        timeSplits[questionId] = (timeSplits[questionId] || 0) + timeSpentSec;

        await db.runAsync(
            `UPDATE test_attempts SET answers = ?, time_per_question = ?, total_attempted = ? WHERE id = ?`,
            [JSON.stringify(answers), JSON.stringify(timeSplits), Object.keys(answers).length, attemptId]
        );
    }

    // Complete a test - calculate score
    async completeAttempt(attemptId: string, isDisqualified: boolean = false): Promise<TestAttempt> {
        const db = await getDatabase();

        const attempt = await db.getFirstAsync<TestAttempt>(
            'SELECT * FROM test_attempts WHERE id = ?',
            [attemptId]
        );
        if (!attempt) throw new Error('Attempt not found');

        const answers = JSON.parse(attempt.answers || '{}');
        const questionIds = Object.keys(answers);

        let score = 0;
        let correct = 0;
        let wrong = 0;
        const numericalCountBySubject: Record<string, number> = {};

        for (const qId of questionIds) {
            const question = await db.getFirstAsync<Question>(
                'SELECT * FROM questions WHERE id = ?',
                [qId]
            );
            if (!question) continue;

            const userAnswer = answers[qId];
            if (userAnswer === undefined || userAnswer === null || String(userAnswer).trim() === '') continue;

            if (question.question_type === 'numerical') {
                const subjectPrefix = question.chapter_id.split('-')[0];
                numericalCountBySubject[subjectPrefix] = (numericalCountBySubject[subjectPrefix] || 0) + 1;
                if (numericalCountBySubject[subjectPrefix] > 5) {
                    continue; // Skip grading if limit exceeded defensively
                }
            }

            const correctAnswers = JSON.parse(question.correct_answers);

            let isCorrect = false;
            if (question.question_type === 'numerical') {
                const uVal = parseFloat(String(userAnswer).trim());
                const cVal = parseFloat(String(correctAnswers[0]).trim());
                isCorrect = !isNaN(uVal) && !isNaN(cVal) && uVal === cVal;
            } else if (question.question_type === 'multi_answer') {
                const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : [String(userAnswer).trim().toUpperCase()]);
                const correctSet = new Set(correctAnswers.map((a: string) => String(a).trim().toUpperCase()));
                isCorrect = userSet.size === correctSet.size &&
                    [...userSet].every((a) => correctSet.has(a));
            } else {
                isCorrect = String(userAnswer).trim().toUpperCase() === String(correctAnswers[0]).trim().toUpperCase();
            }

            if (isCorrect) {
                score += (question.marks || 4);
                correct++;
            } else {
                score += (question.negative_marks || 0);
                wrong++;
            }
        }

        if (isDisqualified) {
            score = 0;
            correct = 0;
            wrong = 0;
        }

        await db.runAsync(
            `UPDATE test_attempts SET status = 'completed', ended_at = datetime('now'), score = ?, correct_count = ?, wrong_count = ?, is_disqualified = ? WHERE id = ?`,
            [score, correct, wrong, isDisqualified ? 1 : 0, attemptId]
        );

        const completedAttempt: TestAttempt = {
            ...attempt,
            status: 'completed',
            score,
            correct_count: correct,
            wrong_count: wrong,
            is_disqualified: isDisqualified ? 1 : 0,
        };

        // Sprint 5: Enqueue test result for sync
        try {
            await syncService.enqueueTestResult(attemptId, {
                attemptId,
                testId: attempt.test_id,
                score,
                correct_count: correct,
                wrong_count: wrong,
                total_attempted: questionIds.length,
                completed_at: new Date().toISOString(),
            });
        } catch (e) {
            console.log('[TestRepo] Sync enqueue failed:', e);
        }

        return completedAttempt;
    }

    // Get attempt history for a test
    async getAttemptHistory(userEmail: string): Promise<TestAttempt[]> {
        const db = await getDatabase();
        return await db.getAllAsync<TestAttempt>(
            `SELECT ta.*, t.title as test_title FROM test_attempts ta 
             LEFT JOIN tests t ON ta.test_id = t.id 
             WHERE ta.user_email = ? ORDER BY ta.started_at DESC`,
            [userEmail]
        );
    }

    // Get latest in-progress attempt (for resume)
    async getInProgressAttempt(testId: string, userEmail?: string): Promise<TestAttempt | null> {
        const db = await getDatabase();
        const query = userEmail 
            ? `SELECT * FROM test_attempts WHERE test_id = ? AND user_email = ? AND status = 'in_progress' ORDER BY started_at DESC`
            : `SELECT * FROM test_attempts WHERE test_id = ? AND status = 'in_progress' ORDER BY started_at DESC`;
        const params = userEmail ? [testId, userEmail] : [testId];
        
        const result = await db.getFirstAsync<TestAttempt>(query, params);
        return result || null;
    }

    // Mark that XP has been awarded for an attempt
    async markXPAwarded(attemptId: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('UPDATE test_attempts SET xp_awarded = ? WHERE id = ?', [1, attemptId]);
    }
}

export const testRepository = new TestRepository();
