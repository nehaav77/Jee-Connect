// JEE Connect - Tests Tab
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { testRepository, Test } from '@/src/repositories/TestRepository';
import { pyqRepository } from '@/src/repositories/PYQRepository';
import { useAppStore } from '@/src/store/appStore';
import { getDatabase } from '@/src/db/database';
import { adaptiveTestService, AdaptiveBreakdown } from '@/src/services/AdaptiveTestService';

export default function TestsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userEmail } = useAppStore();
    const [tests, setTests] = useState<Test[]>([]);
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [adaptiveLoading, setAdaptiveLoading] = useState(false);
    const [showSubjectPicker, setShowSubjectPicker] = useState(false);
    const [lastBreakdown, setLastBreakdown] = useState<AdaptiveBreakdown | null>(null);
    const [activeTab, setActiveTab] = useState<'mock' | 'quick'>('mock');

    useEffect(() => { loadTests(); loadHistory(); }, [userEmail]);

    async function loadTests() {
        try {
            const all = await testRepository.getAllTests(userEmail);
            if (all.length === 0) {
                // Auto-create JEE Main pattern tests from PYQ bank for this user
                const questions = await pyqRepository.getAll();
                if (questions.length >= 5) {
                    const phyQs = questions.filter(q => q.chapter_id.startsWith('phy-'));
                    const chemQs = questions.filter(q => q.chapter_id.startsWith('chem-'));
                    const mathQs = questions.filter(q => q.chapter_id.startsWith('math-'));

                    // Full JEE Main Mock
                    const fullIds = [...phyQs, ...chemQs, ...mathQs].map(q => q.id);
                    await testRepository.createTest(
                        'JEE Main Full Mock Test',
                        `${fullIds.length} Questions · JEE Main Pattern`,
                        180, fullIds, 'full', userEmail
                    );

                    const refreshed = await testRepository.getAllTests(userEmail);
                    setTests(refreshed);
                }
            } else {
                setTests(all);
            }
        } catch (e) { console.log('Tests error:', e); }
        finally { setLoading(false); }
    }

    async function loadHistory() {
        if (!userEmail) return;
        try {
            const db = await getDatabase();
            const results = await db.getAllAsync<any>(
                `SELECT ta.*, t.title as test_title, t.test_type as test_type 
                 FROM test_attempts ta JOIN tests t ON ta.test_id = t.id 
                 WHERE ta.user_email = ? AND ta.status = 'completed' 
                 ORDER BY ta.started_at DESC LIMIT 20`,
                [userEmail]
            );
            setHistory(results);
        } catch (e) { console.log('History error:', e); }
    }

    function getTestDisplayName(item: any): string {
        // If the test already has a meaningful title, use it
        if (item.test_title && item.test_title !== 'undefined') {
            return item.test_title;
        }
        // Generate descriptive name from test_type
        const type = item.test_type;
        const date = new Date(item.started_at).toLocaleDateString();
        if (type === 'custom') return `Smart Test · ${date}`;
        if (type === 'subject') return `Subject Quick Test · ${date}`;
        if (type === 'chapter') return `Chapter Quick Test · ${date}`;
        if (type === 'full') return `Full Mock Test · ${date}`;
        return `Practice Test · ${date}`;
    }

    function getTestTypeBadge(item: any): { label: string; color: string } {
        const type = item.test_type;
        if (type === 'custom') return { label: '🎯 Smart', color: '#6366f1' };
        if (type === 'subject') return { label: '⚡ Quick', color: '#10b981' };
        if (type === 'chapter') return { label: '📖 Chapter', color: '#f59e0b' };
        if (type === 'full') return { label: '📋 Mock', color: Colors.primary };
        return { label: '📝 Test', color: theme.textSecondary };
    }

    async function generateAdaptiveTest(subjectFilter?: string) {
        if (!userEmail || adaptiveLoading) return;
        setAdaptiveLoading(true);
        setShowSubjectPicker(false);
        try {
            const testType = subjectFilter ? 'subject' : 'full';
            const totalQ = subjectFilter ? 25 : 30;
            const { testId, breakdown } = await adaptiveTestService.generateAdaptiveTest(
                userEmail, testType, subjectFilter, totalQ
            );
            setLastBreakdown(breakdown);
            await loadTests();

            router.push({ pathname: '/test/instructions', params: { testId } } as any);
        } catch (e: any) {
            Alert.alert('Smart Practice', e.message || 'Could not generate adaptive test. Try taking a few tests first!');
        } finally {
            setAdaptiveLoading(false);
        }
    }

    function startTest(test: Test) {
        router.push({ pathname: '/test/instructions', params: { testId: test.id } } as any);
    }

    const SUBJECT_OPTIONS = [
        { key: undefined, label: '🎯 Full Adaptive', desc: 'All subjects combined', color: Colors.primary },
        { key: 'Physics', label: '⚛️ Physics Only', desc: 'Focus on Physics weak areas', color: '#6366f1' },
        { key: 'Chemistry', label: '🧪 Chemistry Only', desc: 'Focus on Chemistry weak areas', color: '#10b981' },
        { key: 'Mathematics', label: '📐 Maths Only', desc: 'Focus on Maths weak areas', color: '#f59e0b' },
    ];

    const fullTests = tests.filter(t => t.test_type === 'full' && !(t.title && t.title.toLowerCase().includes('smart')));
    const quickTests = tests.filter(t => (t.test_type === 'subject' || t.test_type === 'chapter') && !(t.title && t.title.toLowerCase().includes('smart')));

    const TABS = [
        { id: 'mock', label: 'Mock Full' },
        { id: 'quick', label: 'Quick Tests' }
    ];

    const renderTestGroup = (groupTests: Test[]) => {
        if (groupTests.length === 0) {
             return (
                 <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                     <Text style={{ fontSize: 32, marginBottom: 12 }}>📝</Text>
                     <Text style={[styles.emptyTitle, { color: theme.text }]}>No Tests Found</Text>
                 </View>
             );
        }
        return (
            <View style={{ marginBottom: Spacing.sm }}>
                {groupTests.map(test => (
                    <View key={test.id} style={[styles.testCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                        <View style={styles.testHeader}>
                            <Text style={[styles.testTitle, { color: theme.text }]}>{test.title}</Text>
                            <View style={[styles.badge, { backgroundColor: Colors.primary + '15' }]}>
                                <Text style={[styles.badgeText, { color: Colors.primary }]}>{test.total_questions} Q</Text>
                            </View>
                        </View>
                        {test.description ? (
                            <Text style={[styles.testDesc, { color: theme.textSecondary }]} numberOfLines={2}>{test.description}</Text>
                        ) : null}
                        <View style={styles.testMeta}>
                            <Text style={[styles.metaItem, { color: theme.textSecondary }]}>⏱ {test.duration_min} min</Text>
                            <Text style={[styles.metaItem, { color: theme.textSecondary }]}>📊 {test.total_marks} marks</Text>
                        </View>
                        <TouchableOpacity style={[styles.startBtn, { backgroundColor: Colors.primary }]} 
                            onPress={() => startTest(test)} activeOpacity={0.7}>
                            <Text style={styles.startBtnText}>Start Test →</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.heading, { color: theme.text }]}>Practice Tests</Text>
            <Text style={[styles.subheading, { color: theme.textSecondary }]}>Offline JEE-pattern test series</Text>

            {/* Smart Practice Section */}
            <View style={[styles.smartCard, {
                backgroundColor: isDark ? '#1a1033' : '#f0e6ff',
                borderColor: isDark ? '#6366f1' + '50' : '#6366f1' + '30',
            }]}>
                <View style={styles.smartHeader}>
                    <View style={styles.smartBadge}>
                        <Text style={{ fontSize: 20 }}>🎯</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.smartTitle, { color: theme.text }]}>Smart Practice</Text>
                        <Text style={[styles.smartDesc, { color: theme.textSecondary }]}>
                            AI adapts to your heatmap — more questions on weak topics
                        </Text>
                    </View>
                </View>

                {/* Adaptive logic summary */}
                <View style={[styles.adaptiveInfo, { backgroundColor: isDark ? '#ffffff08' : '#ffffff80', borderColor: theme.border }]}>
                    <View style={styles.adaptiveRow}>
                        <Text style={{ fontSize: 12 }}>🔴</Text>
                        <Text style={[styles.adaptiveText, { color: theme.textSecondary }]}>Weak topics → Easy questions</Text>
                    </View>
                    <View style={styles.adaptiveRow}>
                        <Text style={{ fontSize: 12 }}>🟢</Text>
                        <Text style={[styles.adaptiveText, { color: theme.textSecondary }]}>Strong topics → Hard questions</Text>
                    </View>
                </View>

                {!showSubjectPicker ? (
                    <TouchableOpacity
                        style={[styles.smartBtn, { backgroundColor: '#6366f1' }]}
                        onPress={() => setShowSubjectPicker(true)}
                        disabled={adaptiveLoading}
                        activeOpacity={0.7}
                    >
                        {adaptiveLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.smartBtnText}>⚡ Generate Smart Test</Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.subjectGrid}>
                        {SUBJECT_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt.label}
                                style={[styles.subjectOption, {
                                    backgroundColor: opt.color + '15',
                                    borderColor: opt.color + '40',
                                }]}
                                onPress={() => generateAdaptiveTest(opt.key)}
                                disabled={adaptiveLoading}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.subjectOptLabel, { color: opt.color }]}>{opt.label}</Text>
                                <Text style={[styles.subjectOptDesc, { color: theme.textMuted }]}>{opt.desc}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.cancelBtn, { borderColor: theme.border }]}
                            onPress={() => setShowSubjectPicker(false)}
                        >
                            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Last breakdown summary */}
                {lastBreakdown && (
                    <View style={[styles.breakdownBar, { backgroundColor: isDark ? '#ffffff08' : '#ffffff80' }]}>
                        <Text style={[styles.breakdownText, { color: theme.textSecondary }]}>
                            Last: {lastBreakdown.totalQuestions}Q · {lastBreakdown.easyCount} Easy · {lastBreakdown.mediumCount} Med · {lastBreakdown.hardCount} Hard
                        </Text>
                        <Text style={[styles.breakdownText, { color: theme.textMuted, fontSize: 11 }]}>
                            Focus: {lastBreakdown.weakChapterCount} weak, {lastBreakdown.moderateChapterCount} moderate, {lastBreakdown.strongChapterCount} strong chapters
                        </Text>
                    </View>
                )}
            </View>

            {/* Custom Tabs */}
            <View style={{ marginBottom: Spacing.md }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity 
                                key={tab.id} 
                                style={[
                                    styles.tabBtn, 
                                    { borderColor: theme.border },
                                    isActive && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                                ]} 
                                onPress={() => setActiveTab(tab.id as any)}
                            >
                                <Text style={[
                                    styles.tabText, 
                                    { color: theme.textSecondary },
                                    isActive && { color: '#fff', fontWeight: '700' }
                                ]}>{tab.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>



            {activeTab === 'mock' && renderTestGroup(fullTests)}

            {activeTab === 'quick' && renderTestGroup(quickTests)}

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    heading: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
    subheading: { fontSize: FontSize.sm, marginBottom: Spacing.md },
    offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1, marginBottom: Spacing.lg },
    offlineText: { fontSize: FontSize.sm, fontWeight: '600' },

    // Smart Practice
    smartCard: { borderRadius: BorderRadius.lg, borderWidth: 1.5, padding: Spacing.lg, marginBottom: Spacing.lg, overflow: 'hidden' },
    smartHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    smartBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#6366f1' + '20', justifyContent: 'center', alignItems: 'center' },
    smartTitle: { fontSize: FontSize.md, fontWeight: '800' },
    smartDesc: { fontSize: FontSize.xs, marginTop: 2, lineHeight: 16 },
    adaptiveInfo: { borderRadius: BorderRadius.md, padding: 10, marginBottom: 14, borderWidth: 1, gap: 6 },
    adaptiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    adaptiveText: { fontSize: 12, flex: 1 },
    smartBtn: { paddingVertical: 14, borderRadius: BorderRadius.md, alignItems: 'center' },
    smartBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.base, letterSpacing: 0.3 },
    subjectGrid: { gap: 8 },
    subjectOption: { padding: 14, borderRadius: BorderRadius.md, borderWidth: 1.5 },
    subjectOptLabel: { fontWeight: '700', fontSize: 14 },
    subjectOptDesc: { fontSize: 11, marginTop: 2 },
    cancelBtn: { padding: 10, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', marginTop: 2 },
    breakdownBar: { borderRadius: BorderRadius.sm, padding: 10, marginTop: 12, gap: 2 },
    breakdownText: { fontSize: 12, fontWeight: '600' },

    // Existing
    testCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm },
    testHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    testTitle: { fontSize: FontSize.md, fontWeight: '700', flex: 1 },
    testDesc: { fontSize: FontSize.sm, marginBottom: 10, lineHeight: 18 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    badgeText: { fontWeight: '700', fontSize: FontSize.xs },
    testMeta: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    metaItem: { fontSize: FontSize.sm },
    startBtn: { paddingVertical: 14, borderRadius: BorderRadius.md, alignItems: 'center' },
    startBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.base },
    emptyState: { alignItems: 'center', padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1 },
    emptyTitle: { fontSize: FontSize.md, fontWeight: '700' },
    emptyDesc: { fontSize: FontSize.sm, marginTop: 4 },
    historyCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 8 },
    historyTitle: { fontSize: FontSize.sm, fontWeight: '700' },
    historyScore: { fontSize: FontSize.sm, fontWeight: '800' },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md },
    tabBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1, backgroundColor: 'transparent' },
    tabText: { fontSize: FontSize.sm, fontWeight: '600' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
});
