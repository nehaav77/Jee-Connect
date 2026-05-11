// JEE Connect - Home Dashboard (Sprint 9: Gamification Enhanced)
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/appStore';
import { subjectRepository, Subject } from '@/src/repositories/SubjectRepository';
import { analyticsService } from '@/src/services/AnalyticsService';
import { gamificationService } from '@/src/services/GamificationService';
import { adaptiveTestService } from '@/src/services/AdaptiveTestService';

const { width: SW } = Dimensions.get('window');

export default function HomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const {
        isOnline, userName, userEmail,
        currentXP, currentLevel, currentLevelEmoji, levelProgress,
        currentStreak, weeklyXPGoal, weeklyXPProgress,
        targetYear, dreamCollege,
        refreshGamificationData,
    } = useAppStore();
    const [subjects, setSubjects] = useState<(Subject & { chapterCount: number })[]>([]);
    const [stats, setStats] = useState({ tests: 0, studyHours: 0, streak: 0 });
    const [focusChapter, setFocusChapter] = useState<{ chapter_id: string; chapter_name: string; subject_name: string; accuracy: number; weakness_level: string } | null>(null);
    const [dailyChallenge, setDailyChallenge] = useState<any>(null);
    const [challengeSolved, setChallengeSolved] = useState(false);
    const [adaptiveLoading, setAdaptiveLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const subs = await subjectRepository.getAll();
                const withCounts = await Promise.all(subs.map(async (s) => {
                    const count = await subjectRepository.getChapterCount(s.id);
                    return { ...s, chapterCount: count };
                }));
                setSubjects(withCounts);
            } catch (e) { console.log(e); }
        })();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            if (userEmail) {
                analyticsService.getStudentStats(userEmail).then(s => {
                    setStats({ tests: s.totalTests, studyHours: s.studyHours, streak: s.streak });
                });
                refreshGamificationData(userEmail);
                gamificationService.getFocusTodayChapter(userEmail).then(setFocusChapter);
                gamificationService.getDailyChallenge().then(setDailyChallenge);
                gamificationService.isDailyChallengeSolved(userEmail).then(setChallengeSolved);
                // Record daily activity for streak
                gamificationService.recordDailyActivity(userEmail, 0, 0, 0);
            }
        }, [userEmail])
    );

    // JEE Countdown
    const daysToJEE = targetYear ? Math.max(0, Math.ceil((new Date(`${targetYear}-01-25`).getTime() - Date.now()) / (86400000))) : 0;

    const weeklyProgress = weeklyXPGoal > 0 ? Math.min(1, weeklyXPProgress / weeklyXPGoal) : 0;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

            {/* Hero Section with XP & Level */}
            <View style={[styles.heroCard, { backgroundColor: Colors.primary }]}>
                <View style={styles.heroTopRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroGreeting}>Namaste, {userName}! 🙏</Text>
                        <Text style={styles.heroTitle}>Your JEE Journey</Text>
                        {targetYear ? (
                            <Text style={styles.heroSub}>📅 {daysToJEE} days to JEE {targetYear}{dreamCollege ? ` · ${dreamCollege}` : ''}</Text>
                        ) : (
                            <Text style={styles.heroSub}>Offline-first learning. Always ready.</Text>
                        )}
                    </View>
                    {/* Level Badge */}
                    <View style={styles.levelBadge}>
                        <Text style={{ fontSize: 24 }}>{currentLevelEmoji}</Text>
                        <Text style={styles.levelTitle}>{currentLevel}</Text>
                    </View>
                </View>

                {/* XP Progress Bar */}
                <View style={styles.xpSection}>
                    <View style={styles.xpBarBg}>
                        <View style={[styles.xpBarFill, { width: `${Math.max(5, levelProgress * 100)}%` }]} />
                    </View>
                    <Text style={styles.xpText}>{currentXP} XP</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatVal}>{stats.tests}</Text>
                        <Text style={styles.heroStatLabel}>Tests</Text>
                    </View>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatVal}>{stats.studyHours}h</Text>
                        <Text style={styles.heroStatLabel}>Study</Text>
                    </View>
                    <View style={styles.heroStatDivider} />
                    <View style={styles.heroStat}>
                        <Text style={styles.heroStatVal}>{gamificationService.getStreakEmoji(currentStreak)} {currentStreak}</Text>
                        <Text style={styles.heroStatLabel}>Streak</Text>
                    </View>
                </View>
            </View>

            {/* Weekly XP Progress */}
            <View style={[styles.weeklyCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <View style={styles.weeklyHeader}>
                    <Text style={[styles.weeklyTitle, { color: theme.text }]}>🎯 Weekly XP Goal</Text>
                    <Text style={[styles.weeklyCount, { color: Colors.primary }]}>{weeklyXPProgress}/{weeklyXPGoal}</Text>
                </View>
                <View style={[styles.weeklyBarBg, { backgroundColor: theme.surfaceElevated }]}>
                    <View style={[styles.weeklyBarFill, {
                        width: `${Math.max(2, weeklyProgress * 100)}%`,
                        backgroundColor: weeklyProgress >= 1 ? Colors.success : Colors.primary,
                    }]} />
                </View>
                {weeklyProgress >= 1 && <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700', marginTop: 4 }}>🎉 Weekly goal achieved!</Text>}
            </View>

            {/* Connection Status */}
            <View style={[styles.statusBadge, { backgroundColor: isOnline ? Colors.success + '15' : Colors.warning + '15' }]}>
                <Text style={{ fontSize: 12 }}>{isOnline ? '🟢' : '🟡'}</Text>
                <Text style={[styles.statusText, { color: isOnline ? Colors.success : Colors.warning }]}>
                    {isOnline ? 'Online — Syncing data' : 'Offline — Using local data'}
                </Text>
            </View>

            {/* Focus Today Card (replaces Tip of the Day) */}
            {focusChapter && (
                <TouchableOpacity
                    style={[styles.focusCard, { backgroundColor: Colors.error + '10', borderColor: Colors.error + '30' }]}
                    onPress={() => router.push(`/chapter/${focusChapter.chapter_id}` as any)}
                    activeOpacity={0.7}>
                    <View style={styles.focusHeader}>
                        <Text style={styles.focusIcon}>🎯</Text>
                        <Text style={[styles.focusTitle, { color: Colors.error }]}>Focus Today</Text>
                    </View>
                    <Text style={[styles.focusChapter, { color: theme.text }]}>{focusChapter.chapter_name}</Text>
                    <Text style={[styles.focusMeta, { color: theme.textSecondary }]}>
                        {focusChapter.subject_name} · {focusChapter.accuracy > 0 ? `${focusChapter.accuracy}% accuracy` : 'Not attempted yet'} · {focusChapter.weakness_level === 'new' ? 'Start here!' : `${focusChapter.weakness_level}`}
                    </Text>
                    <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '700', marginTop: 6 }}>Practice Now →</Text>
                </TouchableOpacity>
            )}

            {/* Daily Challenge Card */}
            {dailyChallenge && !challengeSolved && (
                <View style={[styles.challengeCard, { backgroundColor: Colors.warning + '10', borderColor: Colors.warning + '30' }]}>
                    <View style={styles.challengeHeader}>
                        <Text style={{ fontSize: 20 }}>⚡</Text>
                        <Text style={[styles.challengeTitle, { color: Colors.warning }]}>Question of the Day</Text>
                        <View style={[styles.xpChip, { backgroundColor: Colors.warning }]}>
                            <Text style={styles.xpChipText}>+{30} XP</Text>
                        </View>
                    </View>
                    <Text style={[styles.challengeQ, { color: theme.text }]} numberOfLines={3}>
                        {dailyChallenge.question?.question_text || 'Loading...'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.challengeBtn, { backgroundColor: Colors.warning }]}
                        onPress={() => router.push('/(tabs)/subjects' as any)}
                        activeOpacity={0.7}>
                        <Text style={styles.challengeBtnText}>Solve Challenge →</Text>
                    </TouchableOpacity>
                </View>
            )}
            {challengeSolved && (
                <View style={[styles.challengeCard, { backgroundColor: Colors.success + '10', borderColor: Colors.success + '30' }]}>
                    <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>✅ Daily Challenge Complete! +30 XP earned</Text>
                </View>
            )}

            {/* Heatmap-Based Smart Test Card */}
            <View style={[styles.focusCard, { backgroundColor: '#6366f1' + '10', borderColor: '#6366f1' + '30' }]}>
                <View style={styles.focusHeader}>
                    <Text style={styles.focusIcon}>🧠</Text>
                    <Text style={[styles.focusTitle, { color: '#6366f1' }]}>Smart Test from Heatmap</Text>
                </View>
                <Text style={[styles.focusMeta, { color: theme.textSecondary }]}>
                    Generate a personalized test targeting your weak chapters based on your performance heatmap
                </Text>
                <TouchableOpacity
                    style={[styles.challengeBtn, { backgroundColor: '#6366f1', marginTop: 10 }]}
                    activeOpacity={0.7}
                    disabled={adaptiveLoading}
                    onPress={async () => {
                        if (!userEmail || adaptiveLoading) return;
                        setAdaptiveLoading(true);
                        try {
                            const { testId } = await adaptiveTestService.generateAdaptiveTest(userEmail, 'full', undefined, 30);
                            router.push({ pathname: '/test/instructions', params: { testId } } as any);
                        } catch (e: any) {
                            // If no data, navigate to tests tab
                            router.push('/(tabs)/tests' as any);
                        } finally { setAdaptiveLoading(false); }
                    }}>
                    <Text style={styles.challengeBtnText}>
                        {adaptiveLoading ? 'Generating...' : '⚡ Generate My Smart Test →'}
                    </Text>
                </TouchableOpacity>
            </View>
            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
            <View style={styles.actionsRow}>
                {[
                    { icon: '📝', label: 'Mock Test', route: '/(tabs)/tests' },
                    { icon: '📖', label: 'PYQs', route: '/(tabs)/subjects' },
                    { icon: '🤖', label: 'Ask Saathi', route: '/(tabs)/saathi' },
                    { icon: '👤', label: 'Profile', route: '/(tabs)/profile' },
                ].map((action, i) => (
                    <TouchableOpacity key={i} style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                        onPress={() => router.push(action.route as any)} activeOpacity={0.7}>
                        <Text style={{ fontSize: 28 }}>{action.icon}</Text>
                        <Text style={[styles.actionLabel, { color: theme.text }]}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Sprint 7/8/9 Quick Actions */}
            <View style={styles.actionsRow}>
                {[
                    { icon: '⚡', label: 'Live Sprint', route: '/sprints' },
                    { icon: '🏆', label: 'Badges', route: '/achievements' },
                    { icon: '🎰', label: 'Daily Spin', route: '/daily-spin' },
                    { icon: '📊', label: 'Analytics', route: '/analytics' },
                ].map((action, i) => (
                    <TouchableOpacity key={i} style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                        onPress={() => router.push(action.route as any)} activeOpacity={0.7}>
                        <Text style={{ fontSize: 28 }}>{action.icon}</Text>
                        <Text style={[styles.actionLabel, { color: theme.text }]}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.actionsRow}>
                {[
                    { icon: '🤝', label: 'Doubts', route: '/doubts' },
                ].map((action, i) => (
                    <TouchableOpacity key={i} style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder, maxWidth: (SW - 48) / 4 }]}
                        onPress={() => router.push(action.route as any)} activeOpacity={0.7}>
                        <Text style={{ fontSize: 28 }}>{action.icon}</Text>
                        <Text style={[styles.actionLabel, { color: theme.text }]}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Subjects */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Subjects</Text>
            {subjects.map(sub => (
                <TouchableOpacity key={sub.id} style={[styles.subjectCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder, borderLeftColor: sub.color, borderLeftWidth: 4 }]}
                    onPress={() => router.push(`/subject/${sub.id}` as any)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 32 }}>{sub.icon}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.subjectName, { color: theme.text }]}>{sub.name}</Text>
                        <Text style={[styles.subjectMeta, { color: theme.textSecondary }]}>{sub.chapterCount} chapters</Text>
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize: 20 }}>→</Text>
                </TouchableOpacity>
            ))}

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    heroCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.md, ...Shadow.lg },
    heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    heroGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm },
    heroTitle: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800', marginTop: 4 },
    heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginTop: 4 },
    levelBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 8 },
    levelTitle: { color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 2 },
    xpSection: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, gap: 10 },
    xpBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
    xpBarFill: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 4 },
    xpText: { color: '#fbbf24', fontSize: 13, fontWeight: '800' },
    heroStats: { flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.lg },
    heroStat: { alignItems: 'center' },
    heroStatVal: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
    heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
    heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
    weeklyCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
    weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    weeklyTitle: { fontSize: FontSize.sm, fontWeight: '700' },
    weeklyCount: { fontSize: FontSize.sm, fontWeight: '800' },
    weeklyBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
    weeklyBarFill: { height: '100%', borderRadius: 5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.full, marginBottom: Spacing.md },
    statusText: { fontSize: FontSize.sm, fontWeight: '600' },
    focusCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
    focusHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    focusIcon: { fontSize: 18 },
    focusTitle: { fontWeight: '700', fontSize: FontSize.sm },
    focusChapter: { fontSize: FontSize.base, fontWeight: '700' },
    focusMeta: { fontSize: FontSize.xs, marginTop: 2 },
    challengeCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
    challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    challengeTitle: { fontWeight: '700', fontSize: FontSize.sm, flex: 1 },
    challengeQ: { fontSize: FontSize.sm, lineHeight: 20 },
    challengeBtn: { marginTop: 10, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center' },
    challengeBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
    xpChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    xpChipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
    actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    actionCard: { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, gap: 6 },
    actionLabel: { fontSize: FontSize.xs, fontWeight: '600' },
    subjectCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm },
    subjectName: { fontSize: FontSize.base, fontWeight: '700' },
    subjectMeta: { fontSize: FontSize.xs, marginTop: 2 },
});
