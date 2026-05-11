// JEE Connect - Test Attempt Screen (Timer + Question Navigation)
import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Dimensions, Platform, TextInput, BackHandler
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/src/constants/theme';
import { testRepository, Question } from '@/src/repositories/TestRepository';
import { getDatabase } from '@/src/db/database';
import { useAppStore } from '@/src/store/appStore';
import MathText from '@/components/MathText';

const { width: SW } = Dimensions.get('window');

export default function TestAttemptScreen() {
    const { testId, attemptId } = useLocalSearchParams<{ testId: string; attemptId: string }>();
    const router = useRouter();
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userName } = useAppStore();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [visited, setVisited] = useState<Set<string>>(new Set());
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [timeLeft, setTimeLeft] = useState(0);
    const [totalTimeSec, setTotalTimeSec] = useState(0);
    const [testTitle, setTestTitle] = useState('');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isDisqualifiedOverlay, setIsDisqualifiedOverlay] = useState(false);
    const submittedRef = useRef(false);

    useEffect(() => { loadTest(); return () => { if (timerRef.current) clearInterval(timerRef.current); if (autoSaveRef.current) clearInterval(autoSaveRef.current); }; }, []);

    async function loadTest() {
        try {
            const test = await testRepository.getById(testId!);
            if (!test) return;
            setTestTitle(test.title);
            setTotalTimeSec(test.duration_min * 60);

            const db = await getDatabase();
            const attempt = await db.getFirstAsync<{ started_at: string, answers: string, tab_violations: number, is_disqualified: number }>('SELECT started_at, answers, tab_violations, is_disqualified FROM test_attempts WHERE id = ?', [attemptId]);

            let restoredAnswers: Record<string, string | string[]> = {};
            if (attempt) {
                if (attempt.answers) {
                    try {
                        restoredAnswers = JSON.parse(attempt.answers);
                        setAnswers(restoredAnswers);
                    } catch (e) {}
                }
                
                const startedAtDate = new Date(attempt.started_at);
                const elapsedSec = Math.floor((Date.now() - startedAtDate.getTime()) / 1000);
                const totalDurationSec = test.duration_min * 60;
                let remaining = totalDurationSec - elapsedSec;
                if (remaining < 0) remaining = 0;
                setTimeLeft(remaining);

                if (attempt.is_disqualified === 1) {
                    // Already disqualified
                    handleSubmit(true);
                    return;
                }
            } else {
                setTimeLeft(test.duration_min * 60);
            }

            const qs = await testRepository.getTestQuestions(testId!);
            setQuestions(qs);
            
            const initialVisited = new Set(Object.keys(restoredAnswers));
            if (qs.length > 0) initialVisited.add(qs[0].id);
            setVisited(initialVisited);
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { handleSubmit(false); return 0; }
                    return prev - 1;
                });
            }, 1000);
            // Auto-save every 30 seconds
            autoSaveRef.current = setInterval(() => { autoSave(); }, 30000);
        } catch (e) { console.log(e); }
    }

    // Anti-navigation locks + Fullscreen enforcement + Tab-switch detection
    useEffect(() => {
        if (Platform.OS === 'web') {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);

            window.history.pushState(null, '', window.location.href);
            const handlePopState = () => {
                window.history.pushState(null, '', window.location.href);
                alert("Please submit the test before leaving.");
            };
            window.addEventListener('popstate', handlePopState);

            // Anti-navigation locks
            const handleKeyDown = (e: KeyboardEvent) => {
                // If they explicitly press Escape, disqualify them
                if (e.key === 'Escape') {
                    handleSubmit(true);
                    return;
                }
                
                // Block reload/back shortcuts
                if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.key === 'R')) {
                    e.preventDefault();
                }
                // Block F12 (DevTools)
                if (e.key === 'F12') { e.preventDefault(); return; }
                // Block Ctrl+Shift+I (DevTools)
                if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); return; }
                // Block Ctrl+Shift+J (Console)
                if (e.ctrlKey && e.shiftKey && e.key === 'J') { e.preventDefault(); return; }
                // Block Ctrl+U (View Source)
                if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return; }
            };
            // Use capture phase to intercept Escape before the browser processes it
            document.addEventListener('keydown', handleKeyDown, true);

            // Disable right-click context menu
            const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); };
            document.addEventListener('contextmenu', handleContextMenu);

            // Enforce fullscreen
            const handleFullscreenChange = () => {
                // If we exit fullscreen and the test isn't already submitted, disqualify
                if (!document.fullscreenElement && !submittedRef.current) {
                    handleSubmit(true);
                }
            };
            document.addEventListener('fullscreenchange', handleFullscreenChange);

            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                window.removeEventListener('popstate', handlePopState);
                document.removeEventListener('keydown', handleKeyDown, true);
                document.removeEventListener('contextmenu', handleContextMenu);
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
                // Exit fullscreen on cleanup
                if (document.fullscreenElement && !submittedRef.current) {
                    document.exitFullscreen().catch(() => {});
                }
            };
        } else {
            const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                Alert.alert('Warning', 'Please submit the test to exit. Leaving now will abandon the attempt.', [
                    { text: 'Keep testing', style: 'cancel' },
                    { text: 'Force exit', style: 'destructive', onPress: () => router.back() }
                ]);
                return true;
            });
            return () => backHandler.remove();
        }
    }, [router]);

    async function autoSave() {
        try {
            for (const [qId, ans] of Object.entries(answers)) {
                await testRepository.saveAnswer(attemptId!, qId, ans as string, 0);
            }
        } catch (e) { }
    }

    // Auto-save immediately on every answer change
    useEffect(() => {
        if (Object.keys(answers).length > 0) {
            autoSave();
        }
    }, [answers]);

    async function handleSubmit(isDisqualified: boolean = false) {
        if (submittedRef.current) return;
        submittedRef.current = true;
        if (timerRef.current) clearInterval(timerRef.current);
        if (autoSaveRef.current) clearInterval(autoSaveRef.current);
        try {
            await autoSave();
            await testRepository.completeAttempt(attemptId!, isDisqualified);
            
            if (isDisqualified) {
                // Show disqualification overlay instead of auto-navigating
                setIsDisqualifiedOverlay(true);
            } else {
                // Exit fullscreen on web before navigating normally
                if (Platform.OS === 'web' && document.fullscreenElement) {
                    try { await document.exitFullscreen(); } catch (e) {}
                }
                router.replace(`/result/${attemptId}` as any);
            }
        } catch (e) { console.log(e); }
    }

    function confirmSubmit() {
        const unanswered = questions.length - Object.keys(answers).length;
        const msg = unanswered > 0
            ? `You have ${unanswered} unanswered question(s). Submit anyway?`
            : 'Are you sure you want to submit?';

        if (Platform.OS === 'web') {
            if (window.confirm(msg)) handleSubmit(false);
        } else {
            Alert.alert('Submit Test?', msg, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', style: 'destructive', onPress: () => handleSubmit(false) },
            ]);
        }
    }

    function handleAnswerUpdate(qId: string, val: string | string[]) {
        const currentQ = questions.find(x => x.id === qId);
        if (!currentQ) return;

        // If numerical and trying to add a new answer (or modify to non-empty)
        if (currentQ.question_type === 'numerical' && val !== '') {
            const subjectPrefix = currentQ.chapter_id.split('-')[0];
            const numericalsInSubject = questions.filter(x => x.question_type === 'numerical' && x.chapter_id.startsWith(subjectPrefix));
            const answeredNumericals = numericalsInSubject.filter(x => answers[x.id] !== undefined && String(answers[x.id]).trim() !== '' && x.id !== qId);
            
            if (answeredNumericals.length >= 5) {
                const msg = 'You can only attempt a maximum of 5 numerical questions per subject. Clear another numerical answer first to proceed.';
                if (Platform.OS === 'web') {
                    window.alert(msg);
                } else {
                    Alert.alert('Limit Reached', msg);
                }
                return;
            }
        }

        setAnswers(prev => {
            const draft = { ...prev };
            if (val === '' || (Array.isArray(val) && val.length === 0)) {
                delete draft[qId];
            } else {
                draft[qId] = val;
            }
            return draft;
        });
    }

    function selectOption(qId: string, option: string) {
        setAnswers(prev => {
            const draft = { ...prev };
            if (draft[qId] === option) {
                delete draft[qId]; // toggle off
            } else {
                draft[qId] = option;
            }
            return draft;
        });
    }

    function handleSaveAndNext() {
        if (!questions[currentIdx]) return;
        setMarkedForReview(prev => {
            const next = new Set(prev);
            next.delete(questions[currentIdx].id);
            return next;
        });
        if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
    }

    function handleClear() {
        if (!questions[currentIdx]) return;
        setAnswers(prev => {
            const next = { ...prev };
            delete next[questions[currentIdx].id];
            return next;
        });
    }

    function handleSaveAndMarkForReview() {
        if (!questions[currentIdx]) return;
        setMarkedForReview(prev => new Set(prev).add(questions[currentIdx].id));
        if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
    }

    function handleMarkForReviewAndNext() {
        if (!questions[currentIdx]) return;
        setMarkedForReview(prev => new Set(prev).add(questions[currentIdx].id));
        if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
    }

    useEffect(() => {
        if (questions.length > 0) {
            setVisited(prev => new Set(prev).add(questions[currentIdx].id));
        }
    }, [currentIdx, questions]);

    function getStatus(qId: string) {
        const isAns = answers[qId] !== undefined && String(answers[qId]).trim() !== '';
        const isRev = markedForReview.has(qId);
        const isVis = visited.has(qId);
        
        if (isAns && isRev) return 'ans_rev';
        if (isRev) return 'rev';
        if (isAns) return 'ans';
        if (isVis) return 'not_ans';
        return 'not_vis';
    }

    function getStatusColor(status: string) {
        switch (status) {
            case 'ans': return '#28a745';
            case 'not_ans': return '#dc3545';
            case 'rev': return '#6f42c1';
            case 'ans_rev': return '#6f42c1';
            case 'not_vis': return theme.surfaceElevated;
            default: return theme.surfaceElevated;
        }
    }



    const q = questions[currentIdx];
    const mm = Math.floor(timeLeft / 60);
    const ss = timeLeft % 60;
    const isLowTime = timeLeft < 300;

    if (!q) return <View style={[styles.center, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>Loading...</Text></View>;

    const options = q.options ? JSON.parse(q.options) as string[] : [];
    
    // Disable submit button until 50% time has elapsed
    const isHalfTimePassed = totalTimeSec === 0 || timeLeft <= (totalTimeSec / 2);

    if (isDisqualifiedOverlay) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background, padding: 20 }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ backgroundColor: '#ffebeb', padding: 30, borderRadius: 12, alignItems: 'center', maxWidth: 400, width: '100%', borderWidth: 2, borderColor: '#ef5350' }}>
                    <Text style={{ fontSize: 48, marginBottom: 10 }}>🚫</Text>
                    <Text style={{ color: '#c62828', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>DISQUALIFIED</Text>
                    <Text style={{ color: '#d32f2f', textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 30 }}>
                        You have exited the full-screen mode during the examination. This is a strict violation of the exam rules. Your exam has been terminated with a score of 0.
                    </Text>
                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: '#c62828', width: '100%', paddingVertical: 14 }]} 
                        onPress={() => router.replace('/(tabs)/tests' as any)}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>Return to Tests</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Top Bar (NTA Style) */}
            <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.testName, { color: theme.text }]} numberOfLines={1}>Candidate Name : {userName || 'Student'}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>Exam Name        : JEE-Main</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>Subject Name     : {testTitle}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: '700', marginRight: 4 }}>Remaining Time:</Text>
                    <View style={[styles.timer, { backgroundColor: isLowTime ? Colors.error : '#007bff' }]}>
                        <Text style={[styles.timerText, { color: '#fff' }]}>
                            {String(Math.floor(timeLeft / 3600)).padStart(2, '0')}:{String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0')}:{String(ss).padStart(2, '0')}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1, flexDirection: SW >= 768 ? 'row' : 'column' }}>
                {/* Left Area: Question */}
                <View style={{ flex: 1, borderRightWidth: SW >= 768 ? 1 : 0, borderColor: theme.border }}>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.qContent} showsVerticalScrollIndicator={false}>
                <View style={styles.qNumRow}>
                    <View style={[styles.qNum, { backgroundColor: Colors.primary }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Q{currentIdx + 1}</Text></View>
                    <Text style={[{ color: theme.textMuted, fontSize: 12 }]}>{q.question_type.toUpperCase()} · {q.marks} marks</Text>
                </View>
                <Text style={[styles.qText, { color: theme.text }]}>{q.question_text}</Text>
                {q.question_latex && (
                    <View style={[styles.latexBox, { backgroundColor: isDark ? '#1a1a2e' : '#f0f0ff', borderColor: theme.border }]}>
                        <MathText latex={q.question_latex} color={theme.text} fontSize={16} />
                    </View>
                )}

                {q.question_type === 'numerical' ? (
                    <View style={{ marginBottom: 12 }}>
                        <Text style={[{ color: theme.textMuted, fontSize: 13, marginBottom: 8 }]}>Enter your numerical answer:</Text>
                        <TextInput
                            style={[styles.numInput, { borderColor: theme.border, color: theme.text, backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa' }]}
                            value={String(answers[q.id] || '')}
                            onChangeText={(val) => handleAnswerUpdate(q.id, val)}
                            keyboardType="numeric"
                            placeholder="Type answer here..."
                            placeholderTextColor={theme.textMuted}
                        />
                    </View>
                ) : (
                    options.map((opt, oi) => {
                        const letter = String.fromCharCode(65 + oi);
                        const sel = answers[q.id] === letter;
                        return (
                            <TouchableOpacity key={oi} style={[styles.optRow, {
                                borderColor: sel ? Colors.primary : theme.border,
                                backgroundColor: sel ? Colors.primary + '10' : 'transparent',
                            }]} onPress={() => selectOption(q.id, letter)} activeOpacity={0.7}>
                                <View style={[styles.optCircle, { borderColor: sel ? Colors.primary : theme.textMuted, backgroundColor: sel ? Colors.primary : 'transparent' }]}>
                                    {sel && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
                                </View>
                                <Text style={[styles.optText, { color: theme.text }]}>{opt.replace(/^[A-D]\)\s*/, '')}</Text>
                            </TouchableOpacity>
                        );
                    })
                )}
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.jeeBtn, { backgroundColor: '#28a745' }]} onPress={handleSaveAndNext}>
                            <Text style={styles.jeeBtnText}>SAVE & NEXT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.jeeBtn, { backgroundColor: theme.surfaceElevated }]} onPress={handleClear}>
                            <Text style={[styles.jeeBtnText, { color: theme.text }]}>CLEAR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.jeeBtn, { backgroundColor: '#fd7e14' }]} onPress={handleSaveAndMarkForReview}>
                            <Text style={styles.jeeBtnText}>SAVE & MARK FOR REVIEW</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.jeeBtn, { backgroundColor: '#007bff' }]} onPress={handleMarkForReviewAndNext}>
                            <Text style={styles.jeeBtnText}>MARK FOR REVIEW & NEXT</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Nav */}
                    <View style={[styles.navRow, { backgroundColor: theme.surface }]}>
                        <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.surfaceElevated }]}
                            onPress={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
                            <Text style={[styles.navBtnText, { color: currentIdx === 0 ? theme.textMuted : theme.text }]}>{'<< BACK'}</Text>
                        </TouchableOpacity>
                        {currentIdx < questions.length - 1 ? (
                            <TouchableOpacity style={[styles.navBtn, { backgroundColor: theme.surfaceElevated }]}
                                onPress={() => setCurrentIdx(currentIdx + 1)}>
                                <Text style={[styles.navBtnText, { color: theme.text }]}>{'NEXT >>'}</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flex: 1 }} />
                        )}
                        <TouchableOpacity style={[styles.navBtn, { backgroundColor: isHalfTimePassed ? '#28a745' : theme.surfaceElevated, flex: 0.5, marginLeft: 'auto', opacity: isHalfTimePassed ? 1 : 0.6 }]}
                            onPress={isHalfTimePassed ? confirmSubmit : () => {
                                if (Platform.OS === 'web') {
                                    window.alert('You cannot submit the exam until at least 50% of the time has elapsed.');
                                } else {
                                    Alert.alert('Early Submission Locked', 'You cannot submit the exam until at least 50% of the time has elapsed.');
                                }
                            }}>
                            <Text style={[styles.navBtnText, { color: isHalfTimePassed ? '#fff' : theme.textMuted }]}>SUBMIT</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Right Area: Palette */}
                <View style={{ width: SW >= 768 ? 320 : '100%', height: SW >= 768 ? '100%' : 280, borderTopWidth: SW >= 768 ? 0 : 1, borderColor: theme.border, backgroundColor: theme.surface }}>
                    <ScrollView contentContainerStyle={{ padding: 12 }}>
                        {/* Legend */}
                        <View style={styles.legendGrid}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: getStatusColor('not_vis') }]}><Text style={{ color: theme.text, fontSize: 12, textAlign: 'center' }}>{questions.length - visited.size}</Text></View>
                                <Text style={[styles.legendText, { color: theme.text }]}>Not Visited</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: getStatusColor('not_ans') }]}><Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{Array.from(visited).filter(id => getStatus(id) === 'not_ans').length}</Text></View>
                                <Text style={[styles.legendText, { color: theme.text }]}>Not Answered</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: getStatusColor('ans') }]}><Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{Object.keys(answers).filter(id => !markedForReview.has(id)).length}</Text></View>
                                <Text style={[styles.legendText, { color: theme.text }]}>Answered</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: getStatusColor('rev'), borderRadius: 15 }]}><Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{Array.from(markedForReview).filter(id => !answers[id]).length}</Text></View>
                                <Text style={[styles.legendText, { color: theme.text }]}>Marked for Review</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendBox, { backgroundColor: getStatusColor('ans_rev'), borderRadius: 15 }]}>
                                    <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{Array.from(markedForReview).filter(id => answers[id]).length}</Text>
                                    <View style={styles.ansRevBadge} />
                                </View>
                                <Text style={[styles.legendText, { color: theme.text }]}>Answered & Marked for Review</Text>
                            </View>
                        </View>
                        
                        {/* Palette Grid */}
                        <View style={styles.paletteGrid}>
                            {questions.map((_, i) => {
                                const qId = questions[i].id;
                                const status = getStatus(qId);
                                return (
                                    <TouchableOpacity key={i} style={[styles.palNum, {
                                        backgroundColor: getStatusColor(status),
                                        borderRadius: status.includes('rev') ? 22 : 4,
                                        borderWidth: i === currentIdx ? 2 : 0,
                                        borderColor: '#000',
                                    }]} onPress={() => setCurrentIdx(i)}>
                                        <Text style={{ color: status === 'not_vis' ? theme.text : '#fff', fontWeight: '700', fontSize: 14 }}>{String(i + 1).padStart(2, '0')}</Text>
                                        {status === 'ans_rev' && <View style={styles.ansRevBadgeSmall} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
    violationBanner: { backgroundColor: '#c62828', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', zIndex: 999 },
    violationText: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },
    violationCounter: { backgroundColor: '#ff9800', paddingVertical: 4, paddingHorizontal: 12, alignItems: 'center', zIndex: 998 },
    violationCounterText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, paddingTop: Platform.OS === 'ios' ? 56 : 16 },
    testName: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
    timer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    timerText: { fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] },
    qContent: { padding: 16, paddingBottom: 32 },
    qNumRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    qNum: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    qText: { fontSize: 16, lineHeight: 26, marginBottom: 16 },
    latexBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16, overflow: 'scroll' },
    optRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 8, minHeight: 48 },
    optCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    optText: { flex: 1, fontSize: 15 },
    numInput: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16, fontWeight: '600' },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, borderTopWidth: 0.5, borderColor: '#ccc' },
    jeeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, alignItems: 'center', justifyContent: 'center', minWidth: 100 },
    jeeBtnText: { color: '#fff', fontWeight: '700', fontSize: 11, textAlign: 'center' },
    navRow: { flexDirection: 'row', padding: 12, gap: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 12, borderTopWidth: 0.5, borderColor: '#ccc' },
    navBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    navBtnText: { fontWeight: '700', fontSize: 13 },
    legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#eee', marginBottom: 16 },
    legendItem: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    legendBox: { width: 26, height: 26, borderRadius: 4, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    legendText: { fontSize: 11, flex: 1 },
    ansRevBadge: { position: 'absolute', right: -2, bottom: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#28a745', borderWidth: 1, borderColor: '#fff' },
    ansRevBadgeSmall: { position: 'absolute', right: 2, bottom: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#28a745', borderWidth: 1, borderColor: '#fff' },
    paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
    palNum: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
});
