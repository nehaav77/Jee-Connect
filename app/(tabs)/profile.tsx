// JEE Connect - Profile & Settings Tab (Sprint 9: Gamification Enhanced)
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/appStore';
import { analyticsService, StudentStats } from '@/src/services/AnalyticsService';
import { gamificationService, AchievementWithStatus } from '@/src/services/GamificationService';
import { getDatabase } from '@/src/db/database';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const {
        userName, userEmail, isOnline, appMode, lastSyncTime,
        saathiEnabled, toggleSaathi, preferredLanguage, setPreferredLanguage,
        darkMode, toggleDarkMode, lowBandwidthMode, toggleLowBandwidth, logout,
        currentXP, currentLevel, currentLevelEmoji, levelProgress, currentStreak,
        targetExam, targetYear, dreamCollege,
        refreshGamificationData,
    } = useAppStore();
    const router = useRouter();

    const [stats, setStats] = useState<StudentStats>({ totalTests: 0, studyHours: 0, streak: 0 });
    const [topBadges, setTopBadges] = useState<AchievementWithStatus[]>([]);
    const [badgeCount, setBadgeCount] = useState({ unlocked: 0, total: 0 });

    useFocusEffect(
        useCallback(() => {
            if (userEmail) {
                analyticsService.getStudentStats(userEmail).then(setStats);
                refreshGamificationData(userEmail);
                gamificationService.getAchievements(userEmail).then(achs => {
                    const unlocked = achs.filter(a => a.unlocked);
                    setTopBadges(unlocked.slice(0, 3));
                    setBadgeCount({ unlocked: unlocked.length, total: achs.length });
                });
            }
        }, [userEmail])
    );

    const settings = [
        { icon: '🌙', label: 'Dark Mode', toggle: true, enabled: darkMode, onToggle: toggleDarkMode },
        { icon: '🤖', label: 'Saathi AI', toggle: true, enabled: saathiEnabled, onToggle: toggleSaathi },
        { icon: '📡', label: 'Low-Bandwidth Mode', toggle: true, enabled: lowBandwidthMode, onToggle: toggleLowBandwidth },
        { icon: '🌐', label: 'Language', value: preferredLanguage === 'en' ? 'English' : 'Hindi', onPress: () => setPreferredLanguage(preferredLanguage === 'en' ? 'hi' : 'en') },
    ];

    const targetExamLabels: Record<string, string> = { jee_main: 'JEE Main', jee_advanced: 'JEE Advanced', both: 'JEE Main + Advanced' };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Profile Card with XP & Level */}
            <View style={[styles.profileCard, { backgroundColor: Colors.primary }]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text></View>
                <Text style={styles.profileName}>{userName}</Text>
                <Text style={styles.profileSub}>{userEmail}</Text>

                {/* Level & XP */}
                <View style={styles.levelRow}>
                    <Text style={{ fontSize: 20 }}>{currentLevelEmoji}</Text>
                    <Text style={styles.levelLabel}>{currentLevel}</Text>
                    <View style={[styles.xpChip, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={styles.xpChipText}>{currentXP} XP</Text>
                    </View>
                </View>
                <View style={styles.xpBarBg}>
                    <View style={[styles.xpBarFill, { width: `${Math.max(5, levelProgress * 100)}%` }]} />
                </View>

                {/* Stats */}
                <View style={styles.profileStats}>
                    <View style={styles.stat}><Text style={styles.statVal}>{stats.totalTests}</Text><Text style={styles.statLbl}>Tests</Text></View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}><Text style={styles.statVal}>{stats.studyHours}h</Text><Text style={styles.statLbl}>Study</Text></View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statVal}>{gamificationService.getStreakEmoji(currentStreak)} {currentStreak}</Text>
                        <Text style={styles.statLbl}>Streak</Text>
                    </View>
                </View>
            </View>

            {/* Top Badges Section */}
            <View style={[styles.badgesSection, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <View style={styles.badgesHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>🏆 Badges</Text>
                    <TouchableOpacity onPress={() => router.push('/achievements' as any)}>
                        <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>
                            {badgeCount.unlocked}/{badgeCount.total} · View All →
                        </Text>
                    </TouchableOpacity>
                </View>
                {topBadges.length > 0 ? (
                    <View style={styles.badgesRow}>
                        {topBadges.map(b => (
                            <View key={b.id} style={styles.badgeItem}>
                                <Text style={{ fontSize: 32 }}>{b.icon}</Text>
                                <Text style={[styles.badgeName, { color: theme.text }]}>{b.title}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={[{ color: theme.textMuted, textAlign: 'center', paddingVertical: 12, fontSize: 13 }]}>
                        Complete activities to earn badges! 🎯
                    </Text>
                )}
            </View>

            {/* JEE Goal Section */}
            {(targetExam || targetYear || dreamCollege) && (
                <View style={[styles.goalSection, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>🎯 Your Goal</Text>
                    {targetExam && <Text style={[styles.goalItem, { color: theme.text }]}>📝 {targetExamLabels[targetExam] || targetExam}</Text>}
                    {targetYear && <Text style={[styles.goalItem, { color: theme.text }]}>📅 JEE {targetYear}</Text>}
                    {dreamCollege && <Text style={[styles.goalItem, { color: theme.text }]}>🏛️ Dream: {dreamCollege}</Text>}
                    <TouchableOpacity onPress={() => router.push('/onboarding' as any)}>
                        <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 13, marginTop: 8 }}>Edit Preferences →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Connection Status */}
            <View style={[styles.statusCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Text style={[styles.statusTitle, { color: theme.text }]}>Connection Status</Text>
                <View style={styles.statusRow}>
                    <Text style={{ color: isOnline ? Colors.success : Colors.warning, fontSize: 20 }}>●</Text>
                    <Text style={[styles.statusValue, { color: theme.text }]}>
                        {isOnline ? 'Online' : 'Offline'} · {appMode === 'urban' ? 'Urban Mode' : 'Lite Mode'}
                    </Text>
                </View>
                {lastSyncTime && <Text style={[styles.syncTime, { color: theme.textMuted }]}>Last sync: {lastSyncTime}</Text>}
            </View>

            {/* Settings */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>⚙️ Settings</Text>
            {settings.map((item, idx) => (
                <TouchableOpacity key={idx} style={[styles.settingRow, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                    onPress={item.toggle ? undefined : item.onPress} activeOpacity={item.toggle ? 1 : 0.7}>
                    <Text style={styles.settingIcon}>{item.icon}</Text>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{item.label}</Text>
                    {item.toggle ? (
                        <Switch value={item.enabled} onValueChange={item.onToggle} trackColor={{ true: Colors.primary }} />
                    ) : (
                        <Text style={[styles.settingValue, { color: item.onPress ? Colors.primary : theme.textSecondary }]}>{item.value}</Text>
                    )}
                </TouchableOpacity>
            ))}

            {/* Analytics */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Analytics</Text>
            <TouchableOpacity style={[styles.settingRow, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                onPress={() => router.push('/analytics' as any)} activeOpacity={0.7}>
                <Text style={styles.settingIcon}>📊</Text>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Performance Analytics</Text>
                <Text style={[styles.settingValue, { color: Colors.primary }]}>View →</Text>
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: Colors.error + '10', borderColor: Colors.error + '30' }]}
                onPress={() => { logout(); router.replace('/auth'); }} activeOpacity={0.7}>
                <Text style={[styles.logoutText, { color: Colors.error }]}>🚪 Logout</Text>
            </TouchableOpacity>

            <Text style={[{ color: theme.textMuted, fontSize: 10, textAlign: 'center', marginTop: 24, opacity: 0.5 }]}>
                Version 1.0.9 (Sprint 9)
            </Text>

            <TouchableOpacity 
                style={{ marginTop: 10, padding: 8 }}
                onLongPress={() => router.push('/user-viewer' as any)}>
                <Text style={{ color: theme.textMuted, fontSize: 10, textAlign: 'center', opacity: 0.3 }}>
                    (Long press to view DB)
                </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    profileCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, ...Shadow.lg },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
    profileName: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
    profileSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginTop: 4 },
    levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    levelLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
    xpChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
    xpChipText: { color: '#fbbf24', fontWeight: '800', fontSize: 13 },
    xpBarBg: { width: '80%', height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
    xpBarFill: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 3 },
    profileStats: { flexDirection: 'row', marginTop: Spacing.lg, gap: Spacing.lg },
    stat: { alignItems: 'center' },
    statVal: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
    statLbl: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: 30 },
    badgesSection: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
    badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    badgesRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
    badgeItem: { alignItems: 'center', gap: 4 },
    badgeName: { fontSize: 11, fontWeight: '700' },
    goalSection: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
    goalItem: { fontSize: 14, marginBottom: 4 },
    statusCard: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.lg },
    statusTitle: { fontSize: FontSize.base, fontWeight: '700', marginBottom: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusValue: { fontSize: FontSize.base },
    syncTime: { fontSize: FontSize.xs, marginTop: 4 },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 8 },
    settingIcon: { fontSize: 20, marginRight: 12 },
    settingLabel: { flex: 1, fontSize: FontSize.base, fontWeight: '600' },
    settingValue: { fontSize: FontSize.sm },
    logoutBtn: { paddingVertical: 16, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', marginTop: Spacing.lg },
    logoutText: { fontWeight: '700', fontSize: FontSize.base },
});
