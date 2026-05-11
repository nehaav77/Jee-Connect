// JEE Connect - Analytics & Weakness Heatmap Screen (Sprint 8)
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { analyticsService, ChapterPerformance, SubjectBreakdown } from '@/src/services/AnalyticsService';
import { adaptiveTestService } from '@/src/services/AdaptiveTestService';
import { useAppStore } from '@/src/store/appStore';

export default function AnalyticsScreen() {
    const router = useRouter();
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;

    const { userEmail } = useAppStore();
    const [heatmap, setHeatmap] = useState<ChapterPerformance[]>([]);
    const [subjects, setSubjects] = useState<SubjectBreakdown[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [adaptiveLoading, setAdaptiveLoading] = useState(false);
    const [improvements, setImprovements] = useState<any[]>([]);

    useEffect(() => { loadAnalytics(); }, [userEmail]);

    async function loadAnalytics() {
        try {
            const h = await analyticsService.getWeaknessHeatmap(userEmail);
            setHeatmap(h);
            const s = await analyticsService.getSubjectBreakdown(userEmail);
            setSubjects(s);
            // Load improvement data
            if (userEmail) {
                const imp = await adaptiveTestService.getImprovementData(userEmail);
                setImprovements(imp);
            }
        } catch (e) { console.log(e); }
        finally { setLoading(false); }
    }

    async function handlePracticeWeakAreas() {
        if (!userEmail || adaptiveLoading) return;
        setAdaptiveLoading(true);
        try {
            const subFilter = selectedSubject || undefined;
            const { testId } = await adaptiveTestService.generateAdaptiveTest(
                userEmail, subFilter ? 'subject' : 'full', subFilter, subFilter ? 25 : 30
            );
            router.push({ pathname: '/test/instructions', params: { testId } } as any);
        } catch (e: any) {
            Alert.alert('Smart Practice', e.message || 'Could not generate adaptive test.');
        } finally {
            setAdaptiveLoading(false);
        }
    }

    const weaknessColor = (level: ChapterPerformance['weakness_level']) => {
        switch (level) {
            case 'strong': return Colors.success;
            case 'moderate': return Colors.warning;
            case 'weak': return '#f97316';
            case 'critical': return Colors.error;
        }
    };

    const weaknessEmoji = (level: ChapterPerformance['weakness_level']) => {
        switch (level) {
            case 'strong': return '🟢';
            case 'moderate': return '🟡';
            case 'weak': return '🟠';
            case 'critical': return '🔴';
        }
    };

    const adaptiveHint = (ch: ChapterPerformance): string => {
        if (ch.total_attempted === 0) return 'Next test: easy questions to start';
        switch (ch.weakness_level) {
            case 'critical': return 'Next test: easy Qs (confidence builder)';
            case 'weak': return 'Next test: easy Qs (build up)';
            case 'moderate': return 'Next test: medium Qs (strengthen)';
            case 'strong': return 'Next test: 1-2 hard Qs (challenge)';
        }
    };

    const filteredHeatmap = selectedSubject
        ? heatmap.filter(h => h.subject_name === selectedSubject)
        : heatmap;

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

    const strongCount = heatmap.filter(h => h.weakness_level === 'strong').length;
    const weakCount = heatmap.filter(h => h.weakness_level === 'weak' || h.weakness_level === 'critical').length;

    // Improvements with significant changes
    const significantImprovements = improvements.filter(i => Math.abs(i.change) >= 5);

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ title: 'Performance Analytics' }} />

            {/* Summary Hero */}
            <View style={[styles.heroCard, { backgroundColor: Colors.primary }]}>
                <Text style={styles.heroTitle}>📊 Your Performance Map</Text>
                <Text style={styles.heroSub}>Track strengths & weaknesses across all chapters</Text>
                <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatVal}>{strongCount}</Text>
                        <Text style={styles.heroStatLbl}>Strong</Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatVal}>{heatmap.length - strongCount - weakCount}</Text>
                        <Text style={styles.heroStatLbl}>Moderate</Text>
                    </View>
                    <View style={styles.heroDivider} />
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatVal}>{weakCount}</Text>
                        <Text style={styles.heroStatLbl}>Weak</Text>
                    </View>
                </View>
            </View>

            {/* Practice Weak Areas CTA */}
            {weakCount > 0 && (
                <TouchableOpacity
                    style={[styles.practiceBtn, {
                        backgroundColor: isDark ? '#2d1b4e' : '#ede9fe',
                        borderColor: '#7c3aed',
                    }]}
                    onPress={handlePracticeWeakAreas}
                    disabled={adaptiveLoading}
                    activeOpacity={0.7}
                >
                    <View style={styles.practiceBtnInner}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.practiceBtnTitle, { color: '#7c3aed' }]}>
                                🎯 Practice My Weak Topics
                            </Text>
                            <Text style={[styles.practiceBtnDesc, { color: theme.textSecondary }]}>
                                {weakCount} weak chapter{weakCount > 1 ? 's' : ''} detected · 
                                Easy questions to build confidence
                                {selectedSubject ? ` (${selectedSubject})` : ''}
                            </Text>
                        </View>
                        {adaptiveLoading ? (
                            <ActivityIndicator color="#7c3aed" size="small" />
                        ) : (
                            <View style={styles.practiceArrow}>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>→</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            )}

            {/* Improvement Tracker */}
            {significantImprovements.length > 0 && (
                <View style={[styles.improvementSection, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 10 }]}>📈 Improvement Tracker</Text>
                    {significantImprovements.slice(0, 5).map((imp, idx) => (
                        <View key={idx} style={[styles.improvementRow, { borderColor: theme.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[{ color: theme.text, fontSize: 13, fontWeight: '600' }]} numberOfLines={1}>
                                    {imp.chapter}
                                </Text>
                                <Text style={{ color: theme.textMuted, fontSize: 11 }}>{imp.subject}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                                    {imp.previousAccuracy}%
                                </Text>
                                <Text style={{ color: theme.textMuted, fontSize: 10 }}>→</Text>
                                <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
                                    {imp.currentAccuracy}%
                                </Text>
                                <View style={[styles.changeBadge, {
                                    backgroundColor: imp.change > 0 ? Colors.success + '20' : Colors.error + '20',
                                }]}>
                                    <Text style={{
                                        color: imp.change > 0 ? Colors.success : Colors.error,
                                        fontSize: 11,
                                        fontWeight: '800',
                                    }}>
                                        {imp.change > 0 ? '+' : ''}{imp.change}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Subject Breakdown Cards */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Subject Overview</Text>
            {subjects.map(sub => (
                <TouchableOpacity key={sub.subject}
                    style={[styles.subjectCard, {
                        backgroundColor: theme.surface, borderColor: theme.cardBorder,
                        borderLeftColor: sub.subject === 'Physics' ? '#6366f1' : sub.subject === 'Chemistry' ? '#10b981' : '#f59e0b',
                        borderLeftWidth: 4,
                    }]}
                    onPress={() => setSelectedSubject(selectedSubject === sub.subject ? null : sub.subject)}
                    activeOpacity={0.7}>
                    <View style={styles.subjectRow}>
                        <Text style={{ fontSize: 28 }}>{sub.icon}</Text>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.subjectName, { color: theme.text }]}>{sub.subject}</Text>
                            <Text style={[styles.subjectMeta, { color: theme.textSecondary }]}>
                                {sub.chapters_covered}/{sub.total_chapters} chapters covered
                            </Text>
                        </View>
                        <View style={[styles.accuracyBadge, { backgroundColor: (sub.accuracy >= 70 ? Colors.success : sub.accuracy >= 40 ? Colors.warning : Colors.error) + '20' }]}>
                            <Text style={{ fontWeight: '800', color: sub.accuracy >= 70 ? Colors.success : sub.accuracy >= 40 ? Colors.warning : Colors.error }}>
                                {sub.accuracy}%
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            ))}

            {/* Dense Grid Heatmap */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: Spacing.md }]}>
                🗺️ Performance Heatmap {selectedSubject ? `(${selectedSubject})` : ''}
            </Text>

            {/* Gradient Legend Bar */}
            <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', height: 14, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                    {['#b71c1c','#c62828','#d32f2f','#e53935','#ef5350','#ef6c00','#f57c00','#ff9800','#fbc02d','#cddc39','#8bc34a','#66bb6a','#43a047','#2e7d32','#1b5e20'].map((c, i) => (
                        <View key={i} style={{ flex: 1, backgroundColor: c }} />
                    ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.textMuted, fontSize: 10 }}>0% (Critical)</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 10 }}>50%</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 10 }}>100% (Strong)</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: theme.surfaceElevated, borderWidth: 1, borderColor: theme.border }} />
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>Not attempted</Text>
                </View>
            </View>

            {(['Physics', 'Chemistry', 'Mathematics'] as const)
                .filter(subj => !selectedSubject || selectedSubject === subj)
                .map(subj => {
                    const chaptersInSubject = filteredHeatmap.filter(ch => ch.subject_name === subj);
                    if (chaptersInSubject.length === 0) return null;
                    const subColor = subj === 'Physics' ? '#6366f1' : subj === 'Chemistry' ? '#10b981' : '#f59e0b';

                    return (
                        <View key={subj} style={{ marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: subColor }} />
                                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{subj}</Text>
                            </View>

                            {chaptersInSubject.map(ch => {
                                const acc = ch.accuracy;
                                const attempted = ch.total_attempted > 0;

                                let cellColor = theme.surfaceElevated;
                                if (attempted) {
                                    if (acc >= 90) cellColor = '#1b5e20';
                                    else if (acc >= 80) cellColor = '#2e7d32';
                                    else if (acc >= 70) cellColor = '#43a047';
                                    else if (acc >= 60) cellColor = '#66bb6a';
                                    else if (acc >= 50) cellColor = '#8bc34a';
                                    else if (acc >= 40) cellColor = '#cddc39';
                                    else if (acc >= 30) cellColor = '#fbc02d';
                                    else if (acc >= 20) cellColor = '#ff9800';
                                    else if (acc >= 10) cellColor = '#e53935';
                                    else cellColor = '#b71c1c';
                                }

                                const hint = adaptiveHint(ch);

                                return (
                                    <TouchableOpacity key={ch.chapter_id}
                                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            const msg = attempted
                                                ? `Accuracy: ${acc}%\nAttempted: ${ch.total_attempted}\nCorrect: ${ch.correct}\nLevel: ${ch.weakness_level}\n\n🎯 ${hint}`
                                                : `Not attempted yet\n\n🎯 ${hint}`;
                                            if (Platform.OS === 'web') alert(`${ch.chapter_name}\n\n${msg}`);
                                            else Alert.alert(ch.chapter_name, msg);
                                        }}>
                                        <Text style={{ color: theme.textSecondary, fontSize: 11, width: 120, paddingRight: 6, textAlign: 'right' }} numberOfLines={1}>
                                            {ch.chapter_name}
                                        </Text>
                                        <View style={{
                                            flex: 1, height: 28, backgroundColor: cellColor, borderRadius: 3,
                                            justifyContent: 'center', alignItems: 'center',
                                        }}>
                                            <Text style={{ color: attempted ? '#fff' : theme.textMuted, fontSize: 11, fontWeight: '700' }}>
                                                {attempted ? `${acc}%` : '\u2014'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    );
                })
            }


            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heroCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadow.lg },
    heroTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
    heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginTop: 4 },
    heroStats: { flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.lg },
    heroStat: { alignItems: 'center' },
    heroStatVal: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
    heroStatLbl: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
    heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
    subjectCard: { flexDirection: 'row', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm, ...Shadow.sm },
    subjectRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    subjectName: { fontSize: FontSize.base, fontWeight: '700' },
    subjectMeta: { fontSize: FontSize.xs, marginTop: 2 },
    accuracyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.md },

    // Practice CTA
    practiceBtn: { borderRadius: BorderRadius.lg, borderWidth: 2, padding: Spacing.md, marginBottom: Spacing.lg },
    practiceBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    practiceBtnTitle: { fontSize: FontSize.base, fontWeight: '800' },
    practiceBtnDesc: { fontSize: FontSize.xs, marginTop: 4, lineHeight: 16 },
    practiceArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' },

    // Improvement tracker
    improvementSection: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.lg },
    improvementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, gap: 8 },
    changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },

    legend: { flexDirection: 'row', gap: 12, marginBottom: Spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    heatmapTile: { width: '22%' as any, aspectRatio: 1.2, borderRadius: 8, borderWidth: 1.5, padding: 6, justifyContent: 'space-between', overflow: 'hidden' },
    tileText: { fontSize: 10, fontWeight: '600', lineHeight: 13 },
    tileAccuracy: { fontSize: 13, fontWeight: '800', textAlign: 'right' },
    parentBtn: { paddingVertical: 16, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', marginTop: Spacing.lg },
});
