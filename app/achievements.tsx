// JEE Connect - Achievements & Badges Screen (Sprint 9)
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/appStore';
import { gamificationService, AchievementWithStatus } from '@/src/services/GamificationService';

const { width: SW } = Dimensions.get('window');
const CARD_SIZE = (SW - 48 - 16) / 3; // 3 columns with gaps

export default function AchievementsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userEmail, currentXP, currentLevel, currentLevelEmoji } = useAppStore();

    const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
    const [selectedBadge, setSelectedBadge] = useState<AchievementWithStatus | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (userEmail) {
                gamificationService.getAchievements(userEmail).then(setAchievements);
            }
        }, [userEmail])
    );

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;

    const categories = ['milestone', 'streak', 'performance', 'subject', 'time', 'social'];
    const categoryLabels: Record<string, string> = {
        milestone: '🏅 Milestones',
        streak: '🔥 Streaks',
        performance: '💯 Performance',
        subject: '📚 Subject Mastery',
        time: '⏰ Time-Based',
        social: '🤝 Social',
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* Header Stats */}
            <View style={[styles.headerCard, { backgroundColor: Colors.primary }]}>
                <Text style={{ fontSize: 48 }}>🏆</Text>
                <Text style={styles.headerTitle}>Achievements</Text>
                <Text style={styles.headerSub}>{unlockedCount} of {totalCount} badges unlocked</Text>
                <View style={styles.headerProgressBg}>
                    <View style={[styles.headerProgressFill, { width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }]} />
                </View>
                <View style={styles.headerRow}>
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatVal}>{currentXP}</Text>
                        <Text style={styles.headerStatLbl}>Total XP</Text>
                    </View>
                    <View style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                    <View style={styles.headerStat}>
                        <Text style={styles.headerStatVal}>{currentLevelEmoji} {currentLevel}</Text>
                        <Text style={styles.headerStatLbl}>Level</Text>
                    </View>
                </View>
            </View>

            {/* Badge Grid by Category */}
            {categories.map(cat => {
                const badges = achievements.filter(a => a.category === cat);
                if (badges.length === 0) return null;
                return (
                    <View key={cat}>
                        <Text style={[styles.catTitle, { color: theme.text }]}>{categoryLabels[cat] || cat}</Text>
                        <View style={styles.grid}>
                            {badges.map(badge => (
                                <TouchableOpacity
                                    key={badge.id}
                                    style={[styles.badgeCard, {
                                        backgroundColor: badge.unlocked ? theme.surface : theme.surfaceElevated,
                                        borderColor: badge.unlocked ? Colors.primary + '40' : theme.cardBorder,
                                        opacity: badge.unlocked ? 1 : 0.5,
                                    }]}
                                    onPress={() => setSelectedBadge(selectedBadge?.id === badge.id ? null : badge)}
                                    activeOpacity={0.7}>
                                    <Text style={{ fontSize: 32 }}>{badge.icon}</Text>
                                    <Text style={[styles.badgeName, { color: badge.unlocked ? theme.text : theme.textMuted }]} numberOfLines={1}>
                                        {badge.title}
                                    </Text>
                                    {badge.unlocked && <Text style={styles.unlockedTag}>✅</Text>}
                                    {!badge.unlocked && <Text style={[styles.lockedTag, { color: theme.textMuted }]}>🔒</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Selected badge detail */}
                        {selectedBadge && badges.some(b => b.id === selectedBadge.id) && (
                            <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                                <View style={styles.detailRow}>
                                    <Text style={{ fontSize: 40 }}>{selectedBadge.icon}</Text>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.detailTitle, { color: theme.text }]}>{selectedBadge.title}</Text>
                                        <Text style={[styles.detailDesc, { color: theme.textSecondary }]}>{selectedBadge.description}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailFooter}>
                                    <View style={[styles.rewardChip, { backgroundColor: Colors.primary + '15' }]}>
                                        <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>+{selectedBadge.xp_reward} XP</Text>
                                    </View>
                                    <Text style={{ color: selectedBadge.unlocked ? Colors.success : theme.textMuted, fontWeight: '600', fontSize: 13 }}>
                                        {selectedBadge.unlocked ? `Unlocked ${selectedBadge.unlocked_at ? new Date(selectedBadge.unlocked_at).toLocaleDateString() : ''}` : 'Not yet unlocked'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                );
            })}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    headerCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, ...Shadow.lg },
    headerTitle: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800', marginTop: 8 },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 4 },
    headerProgressBg: { width: '80%', height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginTop: 12, overflow: 'hidden' },
    headerProgressFill: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 4 },
    headerRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
    headerStat: { alignItems: 'center' },
    headerStatVal: { color: '#fff', fontSize: 16, fontWeight: '800' },
    headerStatLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
    catTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm, marginTop: Spacing.sm },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
    badgeCard: {
        width: CARD_SIZE, alignItems: 'center', padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, gap: 6,
    },
    badgeName: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
    unlockedTag: { fontSize: 12, position: 'absolute', top: 6, right: 6 },
    lockedTag: { fontSize: 12, position: 'absolute', top: 6, right: 6 },
    detailCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    detailTitle: { fontSize: FontSize.base, fontWeight: '800' },
    detailDesc: { fontSize: FontSize.sm, marginTop: 4 },
    detailFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    rewardChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
});
