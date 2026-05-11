// JEE Connect - Chapter Detail Screen (Knowledge Base + PYQs)
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { getDatabase } from '@/src/db/database';
import { pyqRepository, PYQuestion } from '@/src/repositories/PYQRepository';
import { knowledgeRepository, Resource } from '@/src/repositories/KnowledgeRepository';

export default function ChapterScreen() {
    const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const [chapterName, setChapterName] = useState('');
    const [questions, setQuestions] = useState<PYQuestion[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [expandedRes, setExpandedRes] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'content' | 'pyq'>('content');

    useEffect(() => { load(); }, [chapterId]);

    async function load() {
        try {
            const db = await getDatabase();
            const ch = await db.getFirstAsync<{ name: string }>('SELECT name FROM chapters WHERE id = ?', [chapterId!]);
            setChapterName(ch?.name || '');
            const qs = await pyqRepository.getByChapter(chapterId!);
            setQuestions(qs);
            const res = await knowledgeRepository.getResourcesForChapter(chapterId!);
            setResources(res);
        } catch (e) { console.log(e); }
        finally { setLoading(false); }
    }

    function selectAnswer(qId: string, ans: string) {
        setSelectedAnswers(prev => ({ ...prev, [qId]: ans }));
    }

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ title: chapterName }} />

            {/* Tab Switcher */}
            <View style={styles.tabRow}>
                {(['content', 'pyq'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && { backgroundColor: Colors.primary }]}
                        onPress={() => setTab(t)} activeOpacity={0.7}>
                        <Text style={[styles.tabText, { color: tab === t ? '#fff' : theme.textSecondary }]}>
                            {t === 'content' ? '📚 Content' : `📝 PYQs (${questions.length})`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'content' ? (
                <>
                    {resources.length > 0 ? resources.map(res => {
                        const isOpen = expandedRes[res.id];
                        return (
                            <TouchableOpacity key={res.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder, flexDirection: 'column', alignItems: 'stretch' }]}
                                onPress={() => setExpandedRes(prev => ({ ...prev, [res.id]: !prev[res.id] }))} activeOpacity={0.7}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 20, marginRight: 8 }}>{res.type === 'textbook' ? '📖' : res.type === 'notes' ? '📝' : res.type === 'formula_sheet' ? '📋' : '🎬'}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: theme.text }]}>{res.title}</Text>
                                        <Text style={[styles.cardSub, { color: theme.textSecondary }]}>{res.type.replace('_', ' ')} · {isOpen ? 'Tap to collapse ▲' : 'Tap to read ▼'}</Text>
                                    </View>
                                </View>
                                {isOpen && res.content && (
                                    <View style={[styles.resContent, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: theme.border }]}>
                                        <Text style={[styles.resContentText, { color: theme.text }]}>{res.content}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }) : (
                        <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                            <Text style={{ fontSize: 40, marginBottom: 8 }}>📚</Text>
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Resources Yet</Text>
                            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Notes and formula sheets will be added soon for this chapter</Text>
                        </View>
                    )}
                </>
            ) : (
                <>
                    {questions.length > 0 ? questions.map((q, idx) => (
                        <View key={q.id} style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                            <View style={styles.qHeader}>
                                <View style={[styles.qBadge, { backgroundColor: Colors.primary + '20' }]}>
                                    <Text style={[styles.qBadgeText, { color: Colors.primary }]}>Q{idx + 1}</Text>
                                </View>
                                <Text style={[styles.qMeta, { color: theme.textMuted }]}>
                                    {q.year} · {q.question_type.toUpperCase()} · ★{q.difficulty}
                                </Text>
                            </View>
                            <Text style={[styles.qText, { color: theme.text }]}>{q.question_text}</Text>
                            {q.question_latex && (
                                <View style={[styles.latexBox, { backgroundColor: isDark ? '#1a1a2e' : '#f0f0ff', borderColor: theme.border }]}>
                                    <Text style={[styles.latexText, { color: theme.text }]}>{q.question_latex}</Text>
                                </View>
                            )}

                            {/* Options for MCQ/Multi-answer */}
                            {q.options && JSON.parse(q.options) && (JSON.parse(q.options) as string[]).map((opt, oi) => {
                                const letter = opt.charAt(0);
                                const isSelected = selectedAnswers[q.id] === letter;
                                const isRevealed = showSolution[q.id];
                                const correctAns = JSON.parse(q.correct_answers);
                                const isCorrect = correctAns.includes(letter);

                                return (
                                    <TouchableOpacity key={oi} style={[styles.optionRow, {
                                        backgroundColor: isRevealed
                                            ? (isCorrect ? Colors.success + '15' : isSelected ? Colors.error + '15' : 'transparent')
                                            : (isSelected ? Colors.primary + '15' : 'transparent'),
                                        borderColor: isRevealed
                                            ? (isCorrect ? Colors.success : isSelected ? Colors.error : theme.border)
                                            : (isSelected ? Colors.primary : theme.border),
                                    }]} onPress={() => !isRevealed && selectAnswer(q.id, letter)} activeOpacity={0.7}>
                                        <View style={[styles.optionCircle, {
                                            backgroundColor: isSelected ? Colors.primary : 'transparent',
                                            borderColor: isSelected ? Colors.primary : theme.textMuted
                                        }]}>
                                            {isSelected && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text>}
                                        </View>
                                        <Text style={[styles.optionText, { color: theme.text }]}>{opt}</Text>
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Numerical Input placeholder */}
                            {q.question_type === 'numerical' && !showSolution[q.id] && (
                                <Text style={[styles.numHint, { color: theme.textMuted }]}>Answer: Type a number (tap Show Solution to check)</Text>
                            )}

                            {/* Show/Hide Solution */}
                            <TouchableOpacity style={[styles.solBtn, { backgroundColor: Colors.primary + '15' }]}
                                onPress={() => setShowSolution(prev => ({ ...prev, [q.id]: !prev[q.id] }))} activeOpacity={0.7}>
                                <Text style={[styles.solBtnText, { color: Colors.primary }]}>
                                    {showSolution[q.id] ? 'Hide Solution' : 'Show Solution'}
                                </Text>
                            </TouchableOpacity>

                            {showSolution[q.id] && q.solution_text && (
                                <View style={[styles.solBox, { backgroundColor: Colors.success + '10', borderColor: Colors.success + '30' }]}>
                                    <Text style={[styles.solTitle, { color: Colors.success }]}>✅ Solution</Text>
                                    <Text style={[styles.solText, { color: theme.text }]}>{q.solution_text}</Text>
                                    {q.solution_latex && (
                                        <View style={[styles.latexBox, { backgroundColor: isDark ? '#0f2918' : '#f0fdf4', borderColor: Colors.success + '30', marginTop: 8 }]}>
                                            <Text style={[styles.latexText, { color: theme.text }]}>{q.solution_latex}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={styles.qFooter}>
                                <Text style={[styles.qMarks, { color: Colors.success }]}>+{q.marks}</Text>
                                <Text style={[styles.qMarks, { color: Colors.error }]}>{q.negative_marks}</Text>
                            </View>
                        </View>
                    )) : (
                        <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                            <Text style={{ fontSize: 40, marginBottom: 8 }}>📝</Text>
                            <Text style={[styles.emptyTitle, { color: theme.text }]}>No PYQs Available</Text>
                            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Previous year questions will appear here</Text>
                        </View>
                    )}
                </>
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }, content: { padding: Spacing.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.full, alignItems: 'center', backgroundColor: 'transparent' },
    tabText: { fontWeight: '700', fontSize: FontSize.sm },
    card: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 8 },
    cardTitle: { fontSize: FontSize.base, fontWeight: '700' },
    cardSub: { fontSize: FontSize.xs, marginTop: 2 },
    emptyBox: { alignItems: 'center', padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1 },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: 4 },
    emptyDesc: { fontSize: FontSize.sm, textAlign: 'center' },
    questionCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md },
    qHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    qBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.sm },
    qBadgeText: { fontWeight: '800', fontSize: FontSize.xs },
    qMeta: { fontSize: FontSize.xs },
    qText: { fontSize: FontSize.base, lineHeight: 24, marginBottom: 12 },
    latexBox: { padding: 12, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
    latexText: { fontSize: FontSize.sm, fontFamily: 'monospace' },
    optionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 6, minHeight: 44 },
    optionCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    optionText: { flex: 1, fontSize: FontSize.base },
    numHint: { fontSize: FontSize.sm, fontStyle: 'italic', marginVertical: 8 },
    solBtn: { paddingVertical: 10, borderRadius: BorderRadius.full, alignItems: 'center', marginTop: 12 },
    solBtnText: { fontWeight: '700', fontSize: FontSize.sm },
    solBox: { padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, marginTop: 12 },
    solTitle: { fontWeight: '700', marginBottom: 4, fontSize: FontSize.sm },
    solText: { fontSize: FontSize.sm, lineHeight: 20 },
    qFooter: { flexDirection: 'row', gap: 12, marginTop: 12 },
    qMarks: { fontSize: FontSize.xs, fontWeight: '700' },
    resContent: { marginTop: 12, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1 },
    resContentText: { fontSize: FontSize.sm, lineHeight: 22, fontFamily: 'monospace' },
});
