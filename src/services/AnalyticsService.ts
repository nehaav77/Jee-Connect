// JEE Connect - Analytics Service
// Sprint 8: Weakness heatmaps, performance trends, and parent dashboard data

import { getDatabase } from '../db/database';

export interface ChapterPerformance {
    chapter_id: string;
    chapter_name: string;
    subject_name: string;
    total_attempted: number;
    correct: number;
    wrong: number;
    accuracy: number; // 0-100
    avg_time_sec: number;
    weakness_level: 'strong' | 'moderate' | 'weak' | 'critical';
}

export interface PerformanceTrend {
    date: string;
    score: number;
    accuracy: number;
    tests_taken: number;
}

export interface ParentDashboardData {
    student_name: string;
    total_tests: number;
    total_study_hours: number;
    current_streak: number;
    overall_accuracy: number;
    strongest_subject: string;
    weakest_subject: string;
    recent_scores: { date: string; score: number; total: number }[];
    weekly_progress: number; // percentage improvement
    mood_average: number; // 0-1 scale
}

export interface SubjectBreakdown {
    subject: string;
    icon: string;
    accuracy: number;
    questions_done: number;
    chapters_covered: number;
    total_chapters: number;
}

export interface StudentStats {
    totalTests: number;
    studyHours: number;
    streak: number;
}

class AnalyticsServiceClass {
    // Generate weakness heatmap data from test performance
    async getWeaknessHeatmap(userEmail?: string): Promise<ChapterPerformance[]> {
        const db = await getDatabase();
        const performances: ChapterPerformance[] = [];

        try {
            // Get all chapters
            const chapters = await db.getAllAsync<{
                id: string; name: string; unit_id: string;
            }>('SELECT * FROM chapters');

            for (const chapter of chapters) {
                // Get unit and subject info
                const unit = await db.getFirstAsync<{ subject_id: string; name: string }>(
                    'SELECT subject_id, name FROM units WHERE id = ?', [chapter.unit_id]
                );
                const subject = await db.getFirstAsync<{ name: string }>(
                    'SELECT name FROM subjects WHERE id = ?', [unit?.subject_id || '']
                );

                // Get all answers for questions in this chapter from test attempts
                const questions = await db.getAllAsync<{ id: string }>(
                    'SELECT id FROM questions WHERE chapter_id = ?', [chapter.id]
                );

                if (questions.length === 0) {
                    performances.push({
                        chapter_id: chapter.id, chapter_name: chapter.name,
                        subject_name: subject?.name || '', total_attempted: 0,
                        correct: 0, wrong: 0, accuracy: 0, avg_time_sec: 0,
                        weakness_level: 'moderate',
                    });
                    continue;
                }

                // Analyze performance from test attempts
                let totalAttempted = 0, correct = 0, wrong = 0;
                const attempts = await db.getAllAsync<{ answers: string; time_per_question: string }>(
                    userEmail 
                    ? `SELECT answers, time_per_question FROM test_attempts WHERE status = 'completed' AND user_email = ?`
                    : `SELECT answers, time_per_question FROM test_attempts WHERE status = 'completed'`,
                    userEmail ? [userEmail] : []
                );

                for (const attempt of attempts) {
                    const answers = JSON.parse(attempt.answers || '{}');
                    for (const q of questions) {
                        if (answers[q.id] !== undefined) {
                            totalAttempted++;
                            const question = await db.getFirstAsync<{ correct_answers: string; question_type: string }>(
                                'SELECT correct_answers, question_type FROM questions WHERE id = ?', [q.id]
                            );
                            if (question) {
                                const correctAns = JSON.parse(question.correct_answers);
                                const userAns = answers[q.id];
                                if (question.question_type === 'numerical') {
                                    if (String(userAns).trim() === String(correctAns[0]).trim()) correct++;
                                    else wrong++;
                                } else {
                                    if (userAns === correctAns[0]) correct++;
                                    else wrong++;
                                }
                            }
                        }
                    }
                }

                const accuracy = totalAttempted > 0 ? Math.round((correct / totalAttempted) * 100) : 0;
                let weakness_level: ChapterPerformance['weakness_level'] = 'moderate';
                if (totalAttempted === 0) weakness_level = 'moderate';
                else if (accuracy >= 80) weakness_level = 'strong';
                else if (accuracy >= 60) weakness_level = 'moderate';
                else if (accuracy >= 40) weakness_level = 'weak';
                else weakness_level = 'critical';

                performances.push({
                    chapter_id: chapter.id, chapter_name: chapter.name,
                    subject_name: subject?.name || '', total_attempted: totalAttempted,
                    correct, wrong, accuracy, avg_time_sec: 0,
                    weakness_level,
                });
            }
        } catch (e) {
            console.log('[Analytics] Heatmap error:', e);
        }

        return performances;
    }

    // Get subject-wise breakdown filtered by user
    async getSubjectBreakdown(userEmail?: string): Promise<SubjectBreakdown[]> {
        const db = await getDatabase();
        const breakdowns: SubjectBreakdown[] = [];

        try {
            const subjects = await db.getAllAsync<{ id: string; name: string; icon: string }>(
                'SELECT * FROM subjects ORDER BY order_num'
            );

            // Get all completed attempts for this user once to optimize
            const attempts = await db.getAllAsync<{ answers: string }>(
                userEmail 
                ? `SELECT answers FROM test_attempts WHERE status = 'completed' AND user_email = ?`
                : `SELECT answers FROM test_attempts WHERE status = 'completed'`,
                userEmail ? [userEmail] : []
            );

            for (const sub of subjects) {
                const units = await db.getAllAsync<{ id: string }>(
                    'SELECT id FROM units WHERE subject_id = ?', [sub.id]
                );
                
                let totalChapters = 0;
                let chaptersWithAttempts = new Set<string>();
                let totalCorrect = 0;
                let totalAttempted = 0;

                // Create a set of question IDs for this subject
                const subjectQuestionIds = new Set<string>();
                for (const unit of units) {
                    const chapters = await db.getAllAsync<{ id: string }>(
                        'SELECT id FROM chapters WHERE unit_id = ?', [unit.id]
                    );
                    totalChapters += chapters.length;

                    for (const ch of chapters) {
                        const qs = await db.getAllAsync<{ id: string }>(
                            'SELECT id FROM questions WHERE chapter_id = ?', [ch.id]
                        );
                        qs.forEach(q => subjectQuestionIds.add(q.id));
                    }
                }

                // Process attempts to find subject-specific stats
                for (const attempt of attempts) {
                    const answers = JSON.parse(attempt.answers || '{}');
                    for (const qId in answers) {
                        if (subjectQuestionIds.has(qId)) {
                            totalAttempted++;
                            // Simple verification - in real app, we'd store correctness in attempt
                            // but here we re-verify against DB or use stored attempt metadata if available
                            const question = await db.getFirstAsync<{ correct_answers: string, chapter_id: string, question_type: string }>(
                                'SELECT correct_answers, chapter_id, question_type FROM questions WHERE id = ?', [qId]
                            );
                            if (question) {
                                chaptersWithAttempts.add(question.chapter_id);
                                const correctAns = JSON.parse(question.correct_answers);
                                
                                let isCorrect = false;
                                if (question.question_type === 'numerical') {
                                    const uVal = parseFloat(String(answers[qId] || '').trim());
                                    const cVal = parseFloat(String(correctAns[0] || '').trim());
                                    isCorrect = !isNaN(uVal) && !isNaN(cVal) && uVal === cVal;
                                } else {
                                    isCorrect = String(answers[qId] || '').trim().toUpperCase() === String(correctAns[0] || '').trim().toUpperCase();
                                }
                                
                                if (isCorrect) {
                                    totalCorrect++;
                                }
                            }
                        }
                    }
                }

                breakdowns.push({
                    subject: sub.name, 
                    icon: sub.icon,
                    accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
                    questions_done: totalAttempted,
                    chapters_covered: chaptersWithAttempts.size,
                    total_chapters: totalChapters,
                });
            }
        } catch (e) {
            console.log('[Analytics] Subject breakdown error:', e);
        }

        return breakdowns;
    }

    // Get data for the parent dashboard
    async getParentDashboardData(studentName: string, studentEmail: string): Promise<ParentDashboardData> {
        const db = await getDatabase();

        try {
            // Fetch all attempts in one go to calculate everything in JS (Web Simulator safe)
            const attempts = await db.getAllAsync<any>(
                `SELECT * FROM test_attempts WHERE status = 'completed' AND user_email = ?`,
                [studentEmail]
            );

            const totalTests = attempts.length;

            // Calculate accuracy
            let totalAccuracySum = 0;
            let validAccuracyCount = 0;
            attempts.forEach(a => {
                const correct = a.correct_count || 0;
                const wrong = a.wrong_count || 0;
                const total = correct + wrong;
                if (total > 0) {
                    totalAccuracySum += (correct / total) * 100;
                    validAccuracyCount++;
                }
            });
            const overallAccuracy = validAccuracyCount > 0 ? Math.round(totalAccuracySum / validAccuracyCount) : 0;

            // Calculate study hours
            let totalMin = 0;
            for (const attempt of attempts) {
                let usedActualTime = false;
                if (attempt.started_at && attempt.ended_at) {
                    const start = new Date(attempt.started_at).getTime();
                    const end = new Date(attempt.ended_at).getTime();
                    const diffMin = (end - start) / (1000 * 60);
                    if (diffMin > 0 && !isNaN(diffMin)) {
                        totalMin += diffMin;
                        usedActualTime = true;
                    }
                }
                if (!usedActualTime) {
                    const test = await db.getFirstAsync<{ duration_min: number }>(
                        `SELECT duration_min FROM tests WHERE id = ?`, [attempt.test_id]
                    );
                    totalMin += (test?.duration_min || 15);
                }
            }
            let hours = 0;
            if (totalMin > 0) {
                hours = Math.max(0.1, Math.round((totalMin / 60) * 10) / 10);
            }

            // Streak (actual from gamification service)
            const { gamificationService } = require('./GamificationService');
            const streakInfo = await gamificationService.getStreakInfo(studentEmail);
            const streak = streakInfo.currentStreak || 0;

            // Get recent test scores
            const recentAttempts = attempts
                .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                .slice(0, 5);

            // Fetch tests to get total marks for recent attempts (since JOIN fails on Web DB)
            const allTests = await db.getAllAsync<any>('SELECT id, total_marks FROM tests');
            const testMap = new Map();
            allTests.forEach((t: any) => testMap.set(t.id, t));

            // Get mood average from chat sentiment
            const moodMsgs = await db.getAllAsync<any>(
                `SELECT sentiment_score FROM chat_messages WHERE role = 'user' AND sentiment_score IS NOT NULL AND user_email = ?`,
                [studentEmail]
            );
            let moodSum = 0;
            moodMsgs.forEach((m: any) => moodSum += m.sentiment_score);
            const moodAvg = moodMsgs.length > 0 ? (moodSum / moodMsgs.length) : 0.5;

            return {
                student_name: studentName,
                total_tests: totalTests,
                total_study_hours: hours,
                current_streak: streak,
                overall_accuracy: overallAccuracy,
                strongest_subject: 'Loading...',
                weakest_subject: 'Loading...',
                recent_scores: recentAttempts.map((a: any) => {
                    const t = testMap.get(a.test_id);
                    return {
                        date: a.started_at || a.ended_at || new Date().toISOString(), 
                        score: a.score || 0, 
                        total: t?.total_marks || (a.test_id?.includes('subject') ? 100 : 300),
                    };
                }),
                weekly_progress: 0,
                mood_average: moodAvg,
            };
        } catch (e) {
            console.log('[Analytics] Parent dashboard error:', e);
            return {
                student_name: studentName, total_tests: 0, total_study_hours: 0,
                current_streak: 0, overall_accuracy: 0, strongest_subject: '-',
                weakest_subject: '-', recent_scores: [], weekly_progress: 0, mood_average: 0.5,
            };
        }
    }

    // SMS gateway for parent alerts (Routes via local bridge server for security)
    async sendParentSMSAlert(phoneNumber: string, message: string): Promise<boolean> {
        try {
            console.log(`[SMS] Sending to ${phoneNumber} via bridge...`);
            
            const response = await fetch('http://localhost:9000/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: phoneNumber,
                    message: message
                })
            });

            const result = await response.json();
            // Twilio returns 'sid' on success. Simulation returns 'success: true'.
            return response.ok && (result.sid !== undefined || result.success === true);
        } catch (e) {
            console.error('[SMS] Bridge communication failed:', e);
            return false;
        }
    }

    // Generate weekly progress summary for SMS
    async generateWeeklySummary(studentName: string, studentEmail: string): Promise<string> {
        const data = await this.getParentDashboardData(studentName, studentEmail);
        
        // --- TERMINAL LOGGING FOR USER ---
        console.log('\n=========================================');
        console.log('📊 STUDENT ACTIVITY REPORT (TERMINAL)');
        console.log(`Student: ${studentName} (${studentEmail})`);
        console.log(`Tests Completed: ${data.total_tests}`);
        console.log(`Accuracy: ${data.overall_accuracy}%`);
        console.log(`Study Hours: ${data.total_study_hours}h`);
        console.log('=========================================\n');

        return `JEE Connect Weekly Report for ${data.student_name}: ` +
            `Tests: ${data.total_tests}, ` +
            `Accuracy: ${data.overall_accuracy}%, ` +
            `Study: ${data.total_study_hours}h. ` +
            `Keep going! 💪`;
    }

    // Get quick stats for profile card
    async getStudentStats(userEmail: string): Promise<StudentStats> {
        const db = await getDatabase();
        try {
            const attempts = await db.getAllAsync<{ test_id: string; started_at: string; ended_at: string }>(
                `SELECT test_id, started_at, ended_at FROM test_attempts WHERE status = 'completed' AND user_email = ?`,
                [userEmail]
            );

            let totalMinutes = 0;
            for (const attempt of attempts) {
                let usedActualTime = false;
                if (attempt.started_at && attempt.ended_at) {
                    const start = new Date(attempt.started_at).getTime();
                    const end = new Date(attempt.ended_at).getTime();
                    const diffMin = (end - start) / (1000 * 60);
                    if (diffMin > 0 && !isNaN(diffMin)) {
                        totalMinutes += diffMin;
                        usedActualTime = true;
                    }
                }
                
                if (!usedActualTime) {
                    const test = await db.getFirstAsync<{ duration_min: number }>(
                        `SELECT duration_min FROM tests WHERE id = ?`,
                        [attempt.test_id]
                    );
                    totalMinutes += (test?.duration_min || 15);
                }
            }

            // Accurate study hours based on actual time spent taking the tests
            let hours = 0;
            if (totalMinutes > 0) {
                hours = Math.max(0.1, Math.round((totalMinutes / 60) * 10) / 10);
            }

            // Streak calculation using gamification service
            const { gamificationService } = require('./GamificationService');
            const streakInfo = await gamificationService.getStreakInfo(userEmail);
            const streak = streakInfo.currentStreak || 0; 
            
            console.log(`[DB] Activity for ${userEmail}: ${attempts.length} tests, ${hours}h study.`);
            
            return {
                totalTests: attempts.length,
                studyHours: hours,
                streak: streak
            };
        } catch (e) {
            console.log('[Analytics] Stats error:', e);
            return { totalTests: 0, studyHours: 0, streak: 0 };
        }
    }
}

export const analyticsService = new AnalyticsServiceClass();
