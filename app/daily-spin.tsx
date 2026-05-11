// JEE Connect - Daily Spin / Lottery Screen (Sprint 9)
import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/appStore';
import { gamificationService, SpinReward } from '@/src/services/GamificationService';

const { width: SW } = Dimensions.get('window');

export default function DailySpinScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userEmail, triggerXPToast, refreshGamificationData } = useAppStore();

    const [canSpin, setCanSpin] = useState(false);
    const [spinning, setSpinning] = useState(false);
    const [reward, setReward] = useState<SpinReward | null>(null);
    const [revealed, setRevealed] = useState(false);

    const flipAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            if (userEmail) {
                gamificationService.canSpin(userEmail).then(setCanSpin);
            }
        }, [userEmail])
    );

    async function handleSpin() {
        if (!canSpin || spinning || !userEmail) return;
        setSpinning(true);
        setRevealed(false);

        // Card shake animation
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.03, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        // Spin logic
        const result = await gamificationService.doSpin(userEmail);
        setReward(result);

        // Reveal animation
        setTimeout(() => {
            Animated.parallel([
                Animated.spring(flipAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
                Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true, tension: 60, friction: 8 }),
            ]).start(() => {
                Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            });

            // Glow pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                    Animated.timing(glowAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
                ])
            ).start();

            setRevealed(true);
            setSpinning(false);
            setCanSpin(false);

            if (result.type === 'xp' && result.value > 0) {
                triggerXPToast(result.value, 'Daily Spin');
            }
            refreshGamificationData(userEmail);
        }, 600);
    }

    const rewardEmojis: Record<string, string> = {
        xp: '⚡',
        streak_shield: '🛡️',
        tip: '💡',
        fun_fact: '🧠',
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: Colors.secondary }]}>
                <Text style={{ fontSize: 48 }}>🎰</Text>
                <Text style={styles.headerTitle}>Daily Reward</Text>
                <Text style={styles.headerSub}>Tap the card to reveal your daily reward!</Text>
            </View>

            {/* Card Area */}
            <View style={styles.cardArea}>
                <Animated.View style={[styles.card, {
                    backgroundColor: revealed ? (reward?.type === 'xp' ? Colors.primary : Colors.secondary) : theme.surface,
                    borderColor: revealed ? 'transparent' : theme.cardBorder,
                    transform: [{ scale: scaleAnim }],
                }]}>
                    {!revealed ? (
                        <TouchableOpacity style={styles.cardContent} onPress={handleSpin} activeOpacity={0.7} disabled={!canSpin || spinning}>
                            {canSpin ? (
                                <>
                                    <Text style={{ fontSize: 64 }}>🎁</Text>
                                    <Text style={[styles.cardPrompt, { color: theme.text }]}>
                                        {spinning ? 'Opening...' : 'Tap to Open!'}
                                    </Text>
                                    <Text style={[styles.cardHint, { color: theme.textMuted }]}>
                                        One free reward every day
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={{ fontSize: 64 }}>⏳</Text>
                                    <Text style={[styles.cardPrompt, { color: theme.text }]}>Come Back Tomorrow!</Text>
                                    <Text style={[styles.cardHint, { color: theme.textMuted }]}>
                                        You've already claimed today's reward
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <Animated.View style={[styles.cardContent, { opacity: flipAnim }]}>
                            <Text style={{ fontSize: 64 }}>{rewardEmojis[reward?.type || 'xp']}</Text>
                            <Text style={styles.rewardLabel}>{reward?.label}</Text>
                            <Text style={styles.rewardMessage}>{reward?.message}</Text>
                            {reward?.type === 'xp' && reward.value > 0 && (
                                <View style={styles.xpRewardChip}>
                                    <Text style={styles.xpRewardText}>+{reward.value} XP Added!</Text>
                                </View>
                            )}
                        </Animated.View>
                    )}
                </Animated.View>
            </View>

            {/* Info Section */}
            <View style={[styles.infoSection, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Text style={[styles.infoTitle, { color: theme.text }]}>Possible Rewards</Text>
                <View style={styles.infoGrid}>
                    {[
                        { emoji: '⚡', label: 'Bonus XP', desc: '10-50 XP' },
                        { emoji: '🛡️', label: 'Streak Shield', desc: 'Protect streak' },
                        { emoji: '💡', label: 'Study Tips', desc: 'Pro advice' },
                        { emoji: '🧠', label: 'Fun Facts', desc: 'JEE trivia' },
                    ].map((item, i) => (
                        <View key={i} style={styles.infoItem}>
                            <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                            <Text style={[styles.infoItemLabel, { color: theme.text }]}>{item.label}</Text>
                            <Text style={[styles.infoItemDesc, { color: theme.textMuted }]}>{item.desc}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingVertical: 32, alignItems: 'center', ...Shadow.lg },
    headerTitle: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800', marginTop: 8 },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 4 },
    cardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
    card: {
        width: SW * 0.75, height: SW * 0.85, borderRadius: BorderRadius.xl, borderWidth: 2,
        justifyContent: 'center', alignItems: 'center', ...Shadow.lg,
    },
    cardContent: { alignItems: 'center', padding: 24, gap: 12 },
    cardPrompt: { fontSize: FontSize.xl, fontWeight: '800', marginTop: 8 },
    cardHint: { fontSize: FontSize.sm, textAlign: 'center' },
    rewardLabel: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800', marginTop: 8 },
    rewardMessage: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.base, textAlign: 'center', lineHeight: 22, marginTop: 8 },
    xpRewardChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, marginTop: 12 },
    xpRewardText: { color: '#fff', fontWeight: '800', fontSize: FontSize.base },
    infoSection: { margin: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
    infoTitle: { fontSize: FontSize.base, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    infoGrid: { flexDirection: 'row', justifyContent: 'space-around' },
    infoItem: { alignItems: 'center', gap: 4 },
    infoItemLabel: { fontSize: 12, fontWeight: '700' },
    infoItemDesc: { fontSize: 10 },
});
