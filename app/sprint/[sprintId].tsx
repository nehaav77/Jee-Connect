// JEE Connect - Live Sprint Interface
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { liveSprintService, LiveSprint } from '@/src/services/LiveSprintService';
import { useAppStore } from '@/src/store/appStore';
import MathText from '@/components/MathText';

export default function SprintQuizScreen() {
    const { sprintId, clanId } = useLocalSearchParams<{ sprintId: string; clanId?: string }>();
    const router = useRouter();
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userName } = useAppStore();

    const isClanSprint = sprintId?.startsWith('sprint-clan-');

    const [sprint, setSprint] = useState<LiveSprint | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    
    // Refs for latest values to avoid stale closures in handleFinish
    const scoreRef = useRef(0);
    const correctRef = useRef(0);
    const incorrectRef = useRef(0);

    // Timer ref
    const timerRef = useRef<any>(null);

    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { correctRef.current = correctCount; }, [correctCount]);
    useEffect(() => { incorrectRef.current = incorrectCount; }, [incorrectCount]);

    useEffect(() => {
        loadSprint();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [sprintId]);

    async function loadSprint() {
        if (isClanSprint) {
            // Clan sprint: 30 MCQ questions, 5 min timer
            const clanSprintObj: LiveSprint = {
                id: sprintId,
                title: 'Clan Battle — Mixed',
                subject: 'Mixed',
                num_questions: 30,
                duration_sec: 300, // 5 minutes
                status: 'active',
                participants: 2,
                max_participants: 50,
                created_at: new Date().toISOString(),
            };
            setSprint(clanSprintObj);
            setTimeLeft(300);
            const qs = await liveSprintService.getClanSprintQuestions();
            setQuestions(qs);
            startTimer(300);
        } else {
            // Regular sprint
            const sprints = await liveSprintService.getAvailableSprints();
            const found = sprints.find(s => s.id === sprintId);
            if (found) {
                setSprint(found);
                setTimeLeft(found.duration_sec);
                const qs = await liveSprintService.getQuestionsForSprint(found.subject, found.num_questions);
                setQuestions(qs);
                startTimer(found.duration_sec);
            }
        }
    }

    function startTimer(initialTime: number) {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleFinish(initialTime);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }

    async function handleFinish(timeUsed?: number) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsFinished(true);
        const actualTimeUsed = timeUsed !== undefined ? timeUsed : (sprint?.duration_sec || 0) - timeLeft;
        const totalAnswered = correctRef.current + incorrectRef.current;
        const accuracy = totalAnswered > 0 ? Math.round((correctRef.current / totalAnswered) * 100) : 0;
        // Only submit scores for clan sprints — solo sprints are practice only
        if (isClanSprint) {
            await liveSprintService.submitSprintAttempt(sprintId, userName, scoreRef.current, accuracy, actualTimeUsed);
        }
    }

    function handleAnswer(selectedOption: string) {
        const q = questions[currentIndex];
        const correctAnswers = JSON.parse(q.correct_answers || '[]') || [];
        
        // Check answer - extract letter from option text if needed
        const selectedLetter = selectedOption.charAt(0);
        const isCorrect = correctAnswers.some((ca: string) => 
            ca === selectedOption || ca === selectedLetter || selectedOption.startsWith(ca)
        );

        if (isCorrect) {
            setScore(prev => prev + 4);
            setCorrectCount(prev => prev + 1);
        } else {
            setScore(prev => prev - 1);
            setIncorrectCount(prev => prev + 1);
        }

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            handleFinish();
        }
    }

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!sprint || questions.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.textMuted }}>Loading sprint...</Text>
            </View>
        );
    }

    if (isFinished) {
        const totalAnswered = correctCount + incorrectCount;
        const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
        const unanswered = questions.length - totalAnswered;
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.resultContainer}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>{isClanSprint ? '🏁' : '📝'}</Text>
                    <Text style={[styles.resultTitle, { color: theme.text }]}>
                        {isClanSprint ? 'Clan Battle Complete!' : 'Practice Complete!'}
                    </Text>
                    {!isClanSprint && (
                        <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                            This was a practice session — scores are not counted in rankings.
                        </Text>
                    )}
                    
                    <View style={[styles.scoreCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                        <View style={styles.scoreRow}>
                            <View style={styles.scoreItem}>
                                <Text style={[styles.scoreValue, { color: Colors.primary }]}>{score}</Text>
                                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Points</Text>
                            </View>
                            <View style={styles.scoreItem}>
                                <Text style={[styles.scoreValue, { color: Colors.success }]}>{accuracy}%</Text>
                                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Accuracy</Text>
                            </View>
                            <View style={styles.scoreItem}>
                                <Text style={[styles.scoreValue, { color: Colors.warning }]}>{formatTime(sprint.duration_sec - timeLeft)}</Text>
                                <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Time Used</Text>
                            </View>
                        </View>

                        {/* Detailed breakdown */}
                        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: Colors.success, fontWeight: '800', fontSize: 20 }}>{correctCount}</Text>
                                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>Correct (+4)</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: Colors.error, fontWeight: '800', fontSize: 20 }}>{incorrectCount}</Text>
                                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>Wrong (-1)</Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ color: theme.textMuted, fontWeight: '800', fontSize: 20 }}>{unanswered}</Text>
                                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>Unanswered</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {isClanSprint && clanId ? (
                        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: Colors.primary }]}
                            onPress={() => router.replace(`/clan/${clanId}` as any)} activeOpacity={0.7}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>💬 Return to Clan Chat</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: Colors.primary }]}
                            onPress={() => router.replace('/sprints')} activeOpacity={0.7}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Return to Leaderboard</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    const q = questions[currentIndex];
    const options = (q.options ? JSON.parse(q.options) : []) || [];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.sprintTitle, { color: theme.text }]}>{sprint.title}</Text>
                    <Text style={[styles.sprintMeta, { color: theme.textSecondary }]}>
                        Question {currentIndex + 1} of {questions.length}
                        {isClanSprint ? '  ·  +4 / -1 marks' : '  ·  Practice Mode'}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.timerBox, { backgroundColor: timeLeft < 60 ? Colors.error + '20' : Colors.primary + '20' }]}>
                        <Text style={[styles.timerText, { color: timeLeft < 60 ? Colors.error : Colors.primary }]}>
                            ⏱ {formatTime(timeLeft)}
                        </Text>
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                        Score: {score}
                    </Text>
                </View>
            </View>

            {/* Question */}
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.qText, { color: theme.text }]}>{q.question_text}</Text>
                    {q.question_latex && (
                        <View style={[styles.latexBox, { backgroundColor: isDark ? '#1a1a2e' : '#f0f0ff', borderColor: theme.border }]}>
                            <MathText latex={q.question_latex} color={theme.text} fontSize={16} />
                        </View>
                    )}
                </View>

                {/* Options - MCQ only for clan sprints */}
                {options.length > 0 ? (
                    <View style={styles.optionsList}>
                        {options.map((opt: string, idx: number) => {
                            const letter = String.fromCharCode(65 + idx);
                            return (
                                <TouchableOpacity key={idx} style={[styles.optionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                    onPress={() => handleAnswer(opt)} activeOpacity={0.7}>
                                    <View style={[styles.optionLetter, { backgroundColor: theme.surfaceElevated }]}>
                                        <Text style={[{ color: theme.text, fontWeight: '700' }]}>{letter}</Text>
                                    </View>
                                    <Text style={[styles.optionText, { color: theme.text }]}>{opt}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <View style={[styles.optionsList, { alignItems: 'center' }]}>
                         <Text style={{ color: theme.textMuted, textAlign: 'center', marginBottom: 20 }}>
                            (Numerical/Subjective questions are auto-skipped in Live Sprints for now to maintain speed)
                        </Text>
                        <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: Colors.primary, width: '100%' }]}
                            onPress={() => handleAnswer('')} activeOpacity={0.7}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Skip Question</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1 },
    sprintTitle: { fontSize: FontSize.lg, fontWeight: '800' },
    sprintMeta: { fontSize: FontSize.sm, marginTop: 4 },
    timerBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
    timerText: { fontSize: FontSize.base, fontWeight: '700' },
    content: { padding: Spacing.md },
    questionCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadow.sm },
    qText: { fontSize: FontSize.base, lineHeight: 24, fontWeight: '500' },
    latexBox: { marginTop: 12, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, overflow: 'hidden' },
    optionsList: { gap: 12 },
    optionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: BorderRadius.md, padding: 12 },
    optionLetter: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    optionText: { flex: 1, fontSize: FontSize.base },
    resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    resultTitle: { fontSize: 24, fontWeight: '800', marginBottom: 24 },
    scoreCard: { width: '100%', borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xl, marginBottom: 32, ...Shadow.md },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-around' },
    scoreItem: { alignItems: 'center' },
    scoreValue: { fontSize: 32, fontWeight: '800' },
    scoreLabel: { fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
    btnPrimary: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: BorderRadius.md, alignItems: 'center' },
});
