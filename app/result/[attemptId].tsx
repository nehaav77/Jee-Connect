// JEE Connect - Test Result Screen
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { getDatabase } from '@/src/db/database';
import { testRepository } from '@/src/repositories/TestRepository';
import { adaptiveTestService } from '@/src/services/AdaptiveTestService';
import { gamificationService, XP_VALUES, getXPForDifficulty, getTestCompleteXP } from '@/src/services/GamificationService';
import { useAppStore } from '@/src/store/appStore';
import MathText from '@/components/MathText';

interface ResultData {
    score: number; total_marks: number; correct_count: number; wrong_count: number;
    total_attempted: number; total_questions: number; test_title: string;
    started_at: string; ended_at: string; is_disqualified: boolean;
}

export default function ResultScreen() {
    const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
    const router = useRouter();
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userEmail, triggerXPToast, refreshGamificationData } = useAppStore();
    const [result, setResult] = useState<ResultData | null>(null);
    const [showReview, setShowReview] = useState(false);
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [improvements, setImprovements] = useState<any[]>([]);
    const [adaptiveLoading, setAdaptiveLoading] = useState(false);
    const [xpAwarded, setXPAwarded] = useState(0);
    const [newBadges, setNewBadges] = useState<{ title: string; icon: string }[]>([]);
    const [xpProcessed, setXPProcessed] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const db = await getDatabase();
            const attempt = await db.getFirstAsync<any>(
                `SELECT * FROM test_attempts WHERE id = ?`, [attemptId!]
            );
            if (!attempt) return;
            
            const test = await db.getFirstAsync<any>(
                `SELECT * FROM tests WHERE id = ?`, [attempt.test_id]
            );

            setResult({
                score: attempt.score || 0,
                total_marks: test?.total_marks || 0,
                correct_count: attempt.correct_count || 0,
                wrong_count: attempt.wrong_count || 0,
                total_attempted: attempt.total_attempted || 0,
                total_questions: test?.total_questions || (attempt.total_attempted || 0),
                test_title: test?.title || 'JEE Connect Mock Test',
                started_at: attempt.started_at,
                ended_at: attempt.ended_at,
                is_disqualified: attempt.is_disqualified === 1,
            });

            const qs = await testRepository.getTestQuestions(attempt.test_id, attemptId as string);
            setQuestions(qs);
            setAnswers(JSON.parse(attempt.answers || '{}'));

            // Load improvement data
            if (attempt.user_email) {
                try {
                    const imp = await adaptiveTestService.getImprovementData(attempt.user_email);
                    setImprovements(imp.filter(i => Math.abs(i.change) >= 3).slice(0, 5));
                } catch (ie) { console.log('Improvement data:', ie); }
            }

            // Sprint 9: Award XP for test completion (difficulty-based)
            if (userEmail && !xpProcessed && Number(attempt.is_disqualified) !== 1 && Number(attempt.xp_awarded) !== 1) {
                try {
                    // Max XP depends on test type (e.g., chapter = 15, subject = 30, full = 60)
                    const testType = test?.test_type || 'full';
                    const baseXP = getTestCompleteXP(testType);
                    const maxXP = baseXP * 3; // Max achievable XP without perfect score bonus
                    
                    let xp = 0;
                    if (percentage >= 82) {
                        // >= ~82% marks (e.g. 23/28) -> Full XP
                        xp = maxXP;
                    } else if (percentage >= 35) {
                        // >= ~35% marks (e.g. 10/28) -> ~75% of Max XP (e.g. 11 XP for max 15)
                        xp = Math.round(maxXP * 0.75);
                    } else if (percentage > 0) {
                        // > 0 marks (e.g. 1/28 to 10/28) -> ~45% of Max XP (e.g. 7 XP for max 15)
                        xp = Math.round(maxXP * 0.45);
                    } else {
                        // 0 or negative marks -> 0 XP
                        xp = 0;
                    }

                    // Bonus for perfect score
                    const totalQ = test?.total_questions || 0;
                    if (totalQ > 0 && (attempt.correct_count || 0) === totalQ) {
                        xp += XP_VALUES.perfect_score; // +15 for perfect
                    }
                    await gamificationService.awardXP(userEmail, 'test_complete', xp);
                    await gamificationService.recordDailyActivity(userEmail, xp, attempt.total_attempted || 0, 1);
                    await testRepository.markXPAwarded(attemptId as string);
                    
                    setXPAwarded(xp);
                    triggerXPToast(xp, 'Test Complete');

                    // Check achievements
                    const badges = await gamificationService.checkAndUnlockAchievements(userEmail);
                    const perfect = await gamificationService.checkPerfectScore(userEmail, attempt.correct_count || 0, totalQ);
                    const allNew = [...badges.filter(b => b.unlocked)];
                    if (perfect && perfect.unlocked) allNew.push(perfect);
                    setNewBadges(allNew);
                    
                    refreshGamificationData(userEmail);
                    setXPProcessed(true);
                } catch (e) { console.log('[Gamification] XP award error:', e); }
            }
        } catch (e) { console.log(e); }
    }

    if (!result) return <View style={[styles.center, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>Loading results...</Text></View>;

    const percentage = result.total_marks > 0 ? Math.round((result.score / result.total_marks) * 100) : 0;
    const grade = result.is_disqualified ? 'DISQUALIFIED 🚫' : percentage >= 80 ? 'Excellent! 🏆' : percentage >= 60 ? 'Good Job! 👍' : percentage >= 40 ? 'Keep Practicing! 💪' : 'Need More Work 📚';
    const gradeColor = result.is_disqualified ? Colors.error : percentage >= 80 ? Colors.success : percentage >= 60 ? Colors.info : percentage >= 40 ? Colors.warning : Colors.error;

    if (showReview) {
        return (
            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
                <Stack.Screen options={{ title: 'Review Answers' }} />
                
                <Text style={[styles.heroTitle, { color: theme.text, fontSize: 24, marginBottom: 16, textAlign: 'center', fontWeight: 'bold' }]}>Exam Review</Text>

                {questions.map((q, idx) => {
                    const userAns = answers[q.id];
                    let correctAnsRaw = q.correct_answers || q.correct_answer;
                    let correctAnsStr = correctAnsRaw;
                    let correctAnswersArray: string[] = [];
                    try {
                        correctAnswersArray = JSON.parse(correctAnsRaw);
                        if (Array.isArray(correctAnswersArray) && correctAnswersArray.length > 0) {
                            correctAnsStr = correctAnswersArray[0];
                        } else {
                            correctAnswersArray = [correctAnsRaw];
                        }
                    } catch(e) {
                        correctAnswersArray = [correctAnsRaw];
                    }

                    const isUnattempted = userAns === undefined || userAns === null || String(userAns).trim() === '';
                    
                    let isCorrect = false;
                    if (!isUnattempted) {
                        if (q.question_type === 'numerical') {
                            const uVal = parseFloat(String(userAns).trim());
                            const cVal = parseFloat(String(correctAnsStr).trim());
                            isCorrect = !isNaN(uVal) && !isNaN(cVal) && uVal === cVal;
                        } else if (q.question_type === 'multi_answer') {
                            const userSet = new Set(Array.isArray(userAns) ? userAns : [String(userAns).trim().toUpperCase()]);
                            const correctSet = new Set(correctAnswersArray.map((a: string) => String(a).trim().toUpperCase()));
                            isCorrect = userSet.size === correctSet.size && [...userSet].every((a) => correctSet.has(a));
                            correctAnsStr = correctAnswersArray.join(', ');
                        } else {
                            isCorrect = String(userAns).trim().toUpperCase() === String(correctAnsStr).trim().toUpperCase();
                        }
                    }

                    const options = q.options ? JSON.parse(q.options) : [];

                    return (
                        <View key={q.id} style={[styles.analysisCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder, marginBottom: 16 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>Question {idx + 1}</Text>
                                <Text style={{ color: isUnattempted ? theme.textMuted : isCorrect ? Colors.success : Colors.error, fontWeight: '700' }}>
                                    {isUnattempted ? 'Not Attempted' : isCorrect ? `+${q.marks || 4} Marks` : `${q.negative_marks !== undefined ? q.negative_marks : -1} Mark${Math.abs(q.negative_marks || -1) !== 1 ? 's' : ''}`}
                                </Text>
                            </View>
                            <Text style={{ color: theme.text, fontSize: 16, marginBottom: 6 }}>{q.question_text}</Text>
                            {q.question_latex && (
                                <View style={{ backgroundColor: isDark ? '#1a1a2e' : '#f0f0ff', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: theme.border }}>
                                    <MathText latex={q.question_latex} color={theme.text} fontSize={16} />
                                </View>
                            )}
                            
                            {q.question_type === 'numerical' ? (
                                <View style={{ gap: 8 }}>
                                    <Text style={{ color: theme.text }}>Your Answer: <Text style={{ color: isUnattempted ? theme.textMuted : isCorrect ? Colors.success : Colors.error, fontWeight: 'bold' }}>{isUnattempted ? '--' : userAns}</Text></Text>
                                    <Text style={{ color: theme.text }}>Correct Answer: <Text style={{ color: Colors.success, fontWeight: 'bold' }}>{correctAnsStr}</Text></Text>
                                </View>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    {options.map((opt: string, oi: number) => {
                                        const letter = String.fromCharCode(65 + oi);
                                        
                                        let isUserSelection = false;
                                        if (q.question_type === 'multi_answer') {
                                            isUserSelection = Array.isArray(userAns) ? userAns.includes(letter) : String(userAns).toUpperCase() === letter;
                                        } else {
                                            isUserSelection = String(userAns).toUpperCase() === letter;
                                        }
                                        
                                        const isActualCorrect = correctAnswersArray.some(a => String(a).toUpperCase() === letter);
                                        
                                        let bgColor = 'transparent';
                                        let borderColor = theme.cardBorder;
                                        if (isUserSelection && isActualCorrect) {
                                            bgColor = Colors.success + '20'; borderColor = Colors.success;
                                        } else if (isUserSelection && !isActualCorrect) {
                                            bgColor = Colors.error + '20'; borderColor = Colors.error;
                                        } else if (isActualCorrect) {
                                            bgColor = Colors.success + '10'; borderColor = Colors.success;
                                        }

                                        return (
                                            <View key={oi} style={[styles.optRow, { backgroundColor: bgColor, borderColor: borderColor }]}>
                                                <Text style={{ color: theme.text, flex: 1 }}>{letter}. {opt.replace(/^[A-D]\)\s*/, '')}</Text>
                                                {isUserSelection && isActualCorrect && <Text style={{ color: Colors.success, fontWeight: 'bold' }}>✓</Text>}
                                                {isUserSelection && !isActualCorrect && <Text style={{ color: Colors.error, fontWeight: 'bold' }}>✗</Text>}
                                                {!isUserSelection && isActualCorrect && <Text style={{ color: Colors.success, fontWeight: 'bold' }}>✓ Correct</Text>}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {(!isCorrect || isUnattempted) && q.solution_text ? (
                                <View style={{ marginTop: 12, padding: 12, backgroundColor: theme.surfaceElevated, borderRadius: 8 }}>
                                    <Text style={{ color: theme.textSecondary, fontWeight: '700', marginBottom: 4 }}>Solution:</Text>
                                    <Text style={{ color: theme.text }}>{q.solution_text}</Text>
                                </View>
                            ) : null}
                        </View>
                    );
                })}

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceElevated, marginTop: 16 }]} onPress={() => setShowReview(false)}>
                    <Text style={[styles.actionBtnText, { color: theme.text }]}>Back to Results</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
            <Stack.Screen options={{ title: 'Test Results' }} />

            {/* Score Hero */}
            <View style={[styles.heroCard, { backgroundColor: gradeColor }]}>
                <Text style={styles.heroTitle}>{result.is_disqualified ? 'Exam Status' : 'Your Score'}</Text>
                {result.is_disqualified ? (
                    <Text style={styles.heroScore}>Disqualified</Text>
                ) : (
                    <>
                        <Text style={styles.heroScore}>{result.score}/{result.total_marks}</Text>
                        <Text style={styles.heroPercent}>{percentage}%</Text>
                    </>
                )}
                <Text style={styles.heroGrade}>{grade}</Text>
            </View>

            {/* Sprint 9: XP Reward Card */}
            {xpAwarded > 0 && (
                <View style={[styles.analysisCard, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary, marginBottom: 6 }}>⚡ XP Earned</Text>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: Colors.primary }}>+{xpAwarded} XP</Text>
                    {newBadges.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.warning }}>🏆 New Badges Unlocked!</Text>
                            {newBadges.map((b, i) => (
                                <Text key={i} style={{ fontSize: 14, marginTop: 4 }}>{b.icon} {b.title}</Text>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.statNum, { color: Colors.success }]}>{result.correct_count}</Text>
                    <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Correct</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.statNum, { color: Colors.error }]}>{result.wrong_count}</Text>
                    <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Wrong</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.statNum, { color: Colors.warning }]}>{result.total_questions - result.total_attempted}</Text>
                    <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Skipped</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.statNum, { color: Colors.info }]}>{result.total_attempted}</Text>
                    <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Attempted</Text>
                </View>
            </View>

            {/* Analysis */}
            <View style={[styles.analysisCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Text style={[styles.analyTitle, { color: theme.text }]}>📊 Performance Analysis</Text>
                <View style={styles.barContainer}>
                    <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Accuracy</Text>
                    <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                        <View style={[styles.barFill, { backgroundColor: Colors.success, width: `${result.total_attempted > 0 ? (result.correct_count / result.total_attempted) * 100 : 0}%` }]} />
                    </View>
                    <Text style={[styles.barVal, { color: theme.text }]}>{result.total_attempted > 0 ? Math.round((result.correct_count / result.total_attempted) * 100) : 0}%</Text>
                </View>
                <View style={styles.barContainer}>
                    <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Attempted</Text>
                    <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                        <View style={[styles.barFill, { backgroundColor: Colors.info, width: `${result.total_questions > 0 ? (result.total_attempted / result.total_questions) * 100 : 0}%` }]} />
                    </View>
                    <Text style={[styles.barVal, { color: theme.text }]}>{result.total_questions > 0 ? Math.round((result.total_attempted / result.total_questions) * 100) : 0}%</Text>
                </View>
            </View>



            {/* Actions */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                onPress={() => setShowReview(true)} activeOpacity={0.7}>
                <Text style={styles.actionBtnText}>Review Answers</Text>
            </TouchableOpacity>

            {/* Practice Weak Areas CTA */}
            <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#7c3aed', flexDirection: 'row', justifyContent: 'center', gap: 8 }]}
                onPress={async () => {
                    if (!userEmail || adaptiveLoading) return;
                    setAdaptiveLoading(true);
                    try {
                        const { testId } = await adaptiveTestService.generateAdaptiveTest(userEmail, 'full', undefined, 30);
                        router.push({ pathname: '/test/instructions', params: { testId } } as any);
                    } catch (e: any) {
                        Alert.alert('Smart Practice', e.message || 'Could not generate adaptive test.');
                    } finally { setAdaptiveLoading(false); }
                }}
                disabled={adaptiveLoading}
                activeOpacity={0.7}
            >
                {adaptiveLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.actionBtnText}>🎯 Practice My Weak Topics</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceElevated }]}
                onPress={() => router.push('/analytics' as any)} activeOpacity={0.7}>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>📊 View Heatmap</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceElevated }]}
                onPress={() => router.replace('/(tabs)/tests' as any)} activeOpacity={0.7}>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Back to Tests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surfaceElevated }]}
                onPress={() => router.replace('/(tabs)' as any)} activeOpacity={0.7}>
                <Text style={[styles.actionBtnText, { color: theme.text }]}>Go to Dashboard</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }, content: { padding: Spacing.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heroCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, ...Shadow.lg },
    heroTitle: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, fontWeight: '600' },
    heroScore: { color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 8 },
    heroPercent: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.xl, fontWeight: '700' },
    heroGrade: { color: '#fff', fontSize: FontSize.md, fontWeight: '700', marginTop: 8 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    statBox: { flex: 1, minWidth: '45%', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
    statNum: { fontSize: FontSize.xxl, fontWeight: '800' },
    statLbl: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 4 },
    analysisCard: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.lg },
    analyTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md },
    barContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    barLabel: { width: 80, fontSize: FontSize.sm },
    barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 },
    barVal: { width: 40, textAlign: 'right', fontWeight: '700', fontSize: FontSize.sm },
    actionBtn: { paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', marginBottom: 8 },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.base },
    optRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5 },
});
