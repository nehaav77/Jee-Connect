// JEE Connect — Daily Challenge Screen
// Timed single-question challenge: Chemistry 60s, Physics/Maths 120s
// Awards +30 XP only on correct answer, enforces 1 question per day

import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/appStore';
import { gamificationService } from '@/src/services/GamificationService';
import { getDatabase } from '@/src/db/database';

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSubjectFromChapterId(chapterId: string): string {
    if (!chapterId) return 'mathematics';
    const id = chapterId.toLowerCase();
    if (id.startsWith('phy')) return 'physics';
    if (id.startsWith('chem')) return 'chemistry';
    return 'mathematics';
}

function getTimerForSubject(subject: string): number {
    return subject === 'chemistry' ? 60 : 120;
}

function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Question {
    id: string;
    chapter_id: string;
    question_text: string;
    question_latex?: string;
    question_type: string;
    options?: string; // JSON string
    correct_answers: string; // JSON string
    solution_text?: string;
    difficulty?: number;
    year?: number;
}

type AnswerState = 'idle' | 'correct' | 'wrong' | 'timeout';

// ── Component ────────────────────────────────────────────────────────────────

export default function DailyChallengeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userEmail, refreshGamificationData } = useAppStore();

    const [question, setQuestion] = useState<Question | null>(null);
    const [subject, setSubject] = useState('mathematics');
    const [loading, setLoading] = useState(true);
    const [pastOutcome, setPastOutcome] = useState<'none' | 'solved' | 'attempted'>('none');

    // Timer
    const [totalTime, setTotalTime] = useState(120);
    const [timeLeft, setTimeLeft] = useState(120);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Answer state
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>('idle');
    const [parsedOptions, setParsedOptions] = useState<string[]>([]);
    const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const timerBarAnim = useRef(new Animated.Value(1)).current;
    const resultScale = useRef(new Animated.Value(0)).current;

    // ── Load challenge ────────────────────────────────────────────────────────

    useEffect(() => {
        (async () => {
            if (!userEmail) return;
            try {
                // Check if already solved or attempted today
                const outcome = await gamificationService.getDailyChallengeOutcome(userEmail);
                if (outcome !== 'none') {
                    setPastOutcome(outcome);
                    setLoading(false);
                    return;
                }

                const challenge = await gamificationService.getDailyChallenge();
                if (!challenge?.question) {
                    setLoading(false);
                    return;
                }

                const q: Question = challenge.question;
                setQuestion(q);

                // Determine subject from chapter_id
                const sub = getSubjectFromChapterId(q.chapter_id);
                setSubject(sub);
                const time = getTimerForSubject(sub);
                setTotalTime(time);
                setTimeLeft(time);

                // Parse options
                if (q.options) {
                    try { setParsedOptions(JSON.parse(q.options) || []); } catch { setParsedOptions([]); }
                }
                // Parse correct answers
                if (q.correct_answers) {
                    try { setCorrectAnswers(JSON.parse(q.correct_answers) || []); } catch { setCorrectAnswers([]); }
                }
            } catch (e) {
                console.error('[DailyChallenge] load error', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [userEmail]);

    // ── Fade in & start timer once loaded ────────────────────────────────────

    useEffect(() => {
        if (!loading && question && pastOutcome === 'none') {
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
            startTimer();
        }
        if (!loading && pastOutcome !== 'none') {
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [loading, question, pastOutcome]);

    // ── Detect timeout via useEffect (avoids stale closure issue) ────────────

    useEffect(() => {
        if (timeLeft === 0 && answerState === 'idle') {
            stopTimer();
            setAnswerState('timeout');
            showResult();
        }
    }, [timeLeft, answerState]);

    // ── Timer logic ───────────────────────────────────────────────────────────

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    timerRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    // ── Answer selection ──────────────────────────────────────────────────────

    const handleSelectOption = async (option: string, index: number) => {
        if (answerState !== 'idle' || !userEmail || !question) return;
        stopTimer();

        // Extract the letter prefix (e.g. "A" from "A) something") or fallback to index (0 -> A, 1 -> B)
        let letter = String.fromCharCode(65 + index);
        if (/^[A-D][).]/i.test(option)) {
            letter = option.charAt(0).toUpperCase();
        }
        
        setSelectedOption(option);

        const isCorrect = correctAnswers.includes(letter) || correctAnswers.includes(option);
        if (isCorrect) {
            setAnswerState('correct');
            try {
                await gamificationService.solveDailyChallenge(userEmail);
                await refreshGamificationData(userEmail);
            } catch (e) { console.error(e); }
        } else {
            setAnswerState('wrong');
            // Mark as attempted (not solved) so they cannot retry today
            await markAttempted(userEmail);
        }
        showResult();
    };

    const markAttempted = async (email: string) => {
        try {
            const db = await getDatabase();
            const today = new Date().toISOString().split('T')[0];
            await db.runAsync(
                'INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, ?)',
                [`daily_challenge_${email}_${today}`, 'attempted', new Date().toISOString()]
            );
        } catch (e) { console.error(e); }
    };

    const showResult = () => {
        Animated.spring(resultScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
    };

    // ── Timer progress bar width ──────────────────────────────────────────────

    const timerFraction = totalTime > 0 ? timeLeft / totalTime : 0;
    const timerColor = timeLeft <= 10 ? Colors.error : timeLeft <= 30 ? Colors.warning : Colors.success;

    // ── Subject label ─────────────────────────────────────────────────────────

    const subjectLabel = subject === 'chemistry' ? '🧪 Chemistry' :
        subject === 'physics' ? '⚛️ Physics' : '📐 Mathematics';

    const subjectColor = subject === 'chemistry' ? '#10b981' :
        subject === 'physics' ? '#6366f1' : '#f59e0b';

    // ── Render loading ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.background }]}>
                <Text style={{ fontSize: 40 }}>⚡</Text>
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading challenge...</Text>
            </View>
        );
    }

    // ── Render past outcome ───────────────────────────────────────────────────

    if (pastOutcome !== 'none') {
        const isSolved = pastOutcome === 'solved';
        return (
            <Animated.View style={[styles.centered, { backgroundColor: theme.background, opacity: fadeAnim }]}>
                <View style={[styles.solvedCard, {
                    backgroundColor: isSolved ? Colors.success + '15' : Colors.error + '15',
                    borderColor: isSolved ? Colors.success + '40' : Colors.error + '40'
                }]}>
                    <Text style={{ fontSize: 64, marginBottom: 16 }}>{isSolved ? '✅' : '❌'}</Text>
                    <Text style={[styles.solvedTitle, { color: isSolved ? Colors.success : Colors.error }]}>
                        {isSolved ? 'Challenge Complete!' : 'Challenge Attempted!'}
                    </Text>
                    <Text style={[styles.solvedSub, { color: theme.textSecondary }]}>
                        {isSolved
                            ? "You've already solved today's challenge.\nCome back tomorrow for a new one!"
                            : "You've already attempted today's challenge.\nBetter luck next time! Come back tomorrow!"}
                    </Text>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: isSolved ? Colors.success : Colors.error }]}
                        onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={styles.backBtnText}>← Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    }

    // ── Render no question ────────────────────────────────────────────────────

    if (!question) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.background }]}>
                <Text style={{ fontSize: 40 }}>😕</Text>
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>No challenge available today.</Text>
                <TouchableOpacity style={[styles.backBtn, { backgroundColor: Colors.primary, marginTop: 24 }]}
                    onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (
        <Animated.ScrollView
            style={[styles.container, { backgroundColor: theme.background, opacity: fadeAnim }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
                    <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: '700' }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>⚡ Question of the Day</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Subject + XP chip */}
            <View style={styles.metaRow}>
                <View style={[styles.subjectChip, { backgroundColor: subjectColor + '20', borderColor: subjectColor + '40' }]}>
                    <Text style={[styles.subjectChipText, { color: subjectColor }]}>{subjectLabel}</Text>
                </View>
                <View style={[styles.xpChip, { backgroundColor: Colors.warning }]}>
                    <Text style={styles.xpChipText}>+30 XP</Text>
                </View>
                {question.year && (
                    <View style={[styles.yearChip, { backgroundColor: theme.surfaceElevated }]}>
                        <Text style={[styles.yearChipText, { color: theme.textSecondary }]}>JEE {question.year}</Text>
                    </View>
                )}
            </View>

            {/* Timer */}
            {answerState === 'idle' && (
                <View style={[styles.timerCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <View style={styles.timerRow}>
                        <Text style={[styles.timerIcon, { color: timerColor }]}>⏱</Text>
                        <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(timeLeft)}</Text>
                        <Text style={[styles.timerLabel, { color: theme.textSecondary }]}>
                            {subject === 'chemistry' ? '1 min · Chemistry' : '2 min · Physics/Maths'}
                        </Text>
                    </View>
                    <View style={[styles.timerBarBg, { backgroundColor: theme.surfaceElevated }]}>
                        <View style={[styles.timerBarFill, { width: `${timerFraction * 100}%`, backgroundColor: timerColor }]} />
                    </View>
                </View>
            )}

            {/* Question */}
            <View style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Text style={[styles.questionText, { color: theme.text }]}>{question.question_text}</Text>
                {question.question_latex && (
                    <Text style={[styles.latexHint, { color: theme.textSecondary }]}>{question.question_latex}</Text>
                )}
            </View>

            {/* Options */}
            {parsedOptions.length > 0 && (
                <View style={styles.optionsContainer}>
                    {parsedOptions.map((option, idx) => {
                        let letter = String.fromCharCode(65 + idx);
                        if (/^[A-D][).]/i.test(option)) {
                            letter = option.charAt(0).toUpperCase();
                        }
                        
                        const isSelected = selectedOption === option;
                        const isCorrectAnswer = correctAnswers.includes(letter) || correctAnswers.includes(option);

                        let cardStyle: any = [styles.optionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }];
                        let textStyle: any = [styles.optionText, { color: theme.text }];

                        if (answerState !== 'idle') {
                            if (isCorrectAnswer) {
                                cardStyle = [styles.optionCard, styles.optionCorrect];
                                textStyle = [styles.optionText, { color: '#fff' }];
                            } else if (isSelected && !isCorrectAnswer) {
                                cardStyle = [styles.optionCard, styles.optionWrong];
                                textStyle = [styles.optionText, { color: '#fff' }];
                            }
                        } else if (isSelected) {
                            cardStyle = [styles.optionCard, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary }];
                        }

                        return (
                            <TouchableOpacity
                                key={idx}
                                style={cardStyle}
                                onPress={() => handleSelectOption(option, idx)}
                                activeOpacity={answerState === 'idle' ? 0.7 : 1}
                                disabled={answerState !== 'idle'}
                            >
                                <Text style={textStyle}>
                                    {!/^[A-D][).]/i.test(option) ? `${String.fromCharCode(65 + idx)}) ` : ''}{option}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Result Banner */}
            {answerState !== 'idle' && (
                <Animated.View style={[
                    styles.resultBanner,
                    { transform: [{ scale: resultScale }] },
                    answerState === 'correct' ? { backgroundColor: Colors.success + '15', borderColor: Colors.success + '40' } :
                        answerState === 'wrong' ? { backgroundColor: Colors.error + '15', borderColor: Colors.error + '40' } :
                            { backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '40' },
                ]}>
                    <Text style={styles.resultEmoji}>
                        {answerState === 'correct' ? '🎉' : answerState === 'wrong' ? '❌' : '⏰'}
                    </Text>
                    <Text style={[styles.resultTitle, {
                        color: answerState === 'correct' ? Colors.success :
                            answerState === 'wrong' ? Colors.error : Colors.warning
                    }]}>
                        {answerState === 'correct' ? 'Correct! +30 XP Earned!' :
                            answerState === 'wrong' ? 'Better Luck Next Time' : "Time's Up!"}
                    </Text>
                    <Text style={[styles.resultSub, { color: isDark ? '#aaa' : '#666' }]}>
                        {answerState === 'correct'
                            ? '🔥 Great job! XP has been added to your profile.'
                            : answerState === 'wrong'
                                ? 'Better luck next time! Review the solution below.'
                                : 'You ran out of time. Better luck next time!'}
                    </Text>

                    {/* Solution */}
                    {question.solution_text && (
                        <View style={[styles.solutionBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                            <Text style={[styles.solutionLabel, { color: theme.textSecondary }]}>💡 Solution</Text>
                            <Text style={[styles.solutionText, { color: theme.text }]}>{question.solution_text}</Text>
                        </View>
                    )}

                    <TouchableOpacity style={[styles.doneBtn, { backgroundColor: Colors.primary }]}
                        onPress={() => router.back()} activeOpacity={0.8}>
                        <Text style={styles.doneBtnText}>← Back to Home</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            <View style={{ height: 40 }} />
        </Animated.ScrollView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md, paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    loadingText: { fontSize: FontSize.base, marginTop: 12, fontWeight: '500' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
    backArrow: { padding: 8 },
    headerTitle: { fontSize: FontSize.base, fontWeight: '800' },

    // Meta chips
    metaRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md, flexWrap: 'wrap' },
    subjectChip: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
    subjectChipText: { fontSize: FontSize.xs, fontWeight: '700' },
    xpChip: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
    xpChipText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '800' },
    yearChip: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
    yearChipText: { fontSize: FontSize.xs, fontWeight: '600' },

    // Timer
    timerCard: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    timerIcon: { fontSize: 20 },
    timerText: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] as any },
    timerLabel: { fontSize: FontSize.xs, flex: 1, textAlign: 'right' },
    timerBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
    timerBarFill: { height: '100%', borderRadius: 4 },

    // Question
    questionCard: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md, ...Shadow.sm },
    questionText: { fontSize: FontSize.base, fontWeight: '500', lineHeight: 24 },
    latexHint: { fontSize: FontSize.sm, marginTop: 8, fontStyle: 'italic' },

    // Options
    optionsContainer: { gap: 10, marginBottom: Spacing.md },
    optionCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5 },
    optionCorrect: { backgroundColor: Colors.success, borderColor: Colors.success },
    optionWrong: { backgroundColor: Colors.error, borderColor: Colors.error },
    optionText: { fontSize: FontSize.sm, fontWeight: '600', lineHeight: 20 },

    // Result
    resultBanner: {
        borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg,
        alignItems: 'center', marginBottom: Spacing.md,
    },
    resultEmoji: { fontSize: 48, marginBottom: 8 },
    resultTitle: { fontSize: FontSize.lg, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
    resultSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: 16 },

    // Solution
    solutionBox: { borderRadius: BorderRadius.md, padding: Spacing.md, width: '100%', marginBottom: 16 },
    solutionLabel: { fontSize: FontSize.xs, fontWeight: '700', marginBottom: 6 },
    solutionText: { fontSize: FontSize.sm, lineHeight: 20 },

    // Buttons
    doneBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: BorderRadius.md },
    doneBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },
    backBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: BorderRadius.md, marginTop: 24 },
    backBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },

    // Already solved
    solvedCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', width: '100%' },
    solvedTitle: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 12 },
    solvedSub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
});
