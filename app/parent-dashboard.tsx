// JEE Connect - Parent Dashboard Screen (Sprint 8)
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { analyticsService, ParentDashboardData } from '@/src/services/AnalyticsService';
import { useAppStore } from '@/src/store/appStore';
import { getDatabase } from '@/src/db/database';

export default function ParentDashboardScreen() {
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userName, userEmail, logout, isParent, isAuthenticated } = useAppStore();
    const router = useRouter();

    const [data, setData] = useState<ParentDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [parentPhone, setParentPhone] = useState('');
    const [smsSetup, setSMSSetup] = useState(false);

    useEffect(() => { loadDashboard(); }, []);

    async function loadDashboard() {
        try {
            const d = await analyticsService.getParentDashboardData(userName, userEmail);
            setData(d);
            
            // Check for existing SMS settings
            const db = await getDatabase();
            const phoneSetting = await db.getFirstAsync<{ value: string }>('SELECT value FROM user_settings WHERE key = ?', ['parent_sms_phone']);
            if (phoneSetting?.value) {
                setParentPhone(phoneSetting.value);
                setSMSSetup(true);
            }
        } catch (e) { 
            console.log('[PARENT DB] Dashboard load error:', e); 
        } finally { 
            setLoading(false); 
        }
    }

    async function handleSetupSMS() {
        if (!parentPhone.trim() || parentPhone.length < 10) {
            const msg = 'Please enter a valid 10-digit phone number.';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Invalid Number', msg);
            return;
        }

        const summary = await analyticsService.generateWeeklySummary(userName, userEmail);
        const sent = await analyticsService.sendParentSMSAlert(parentPhone, summary);

        if (sent) {
            setSMSSetup(true);
            
            // PERSIST SETTINGS FOR AUTOMATIC WEEKLY ALERTS
            try {
                const db = await getDatabase();
                await db.runAsync('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', ['parent_sms_phone', parentPhone.trim()]);
                await db.runAsync('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', ['parent_sms_active', 'true']);
                console.log('[PARENT DB] SMS Settings persisted for weekly alerts.');
            } catch (e) {
                console.error('[PARENT DB] Failed to save SMS settings:', e);
            }

            const msg = 'SMS Sent Successfully! Weekly alerts are now active for Sundays at 10 PM. ✅';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Success', msg);
        } else {
            const msg = 'Failed to send SMS. Please check your Twilio configuration.';
            if (Platform.OS === 'web') alert(msg);
            else Alert.alert('Error', msg);
        }
    }

    if (loading || !data) return (
        <View style={[styles.center, { backgroundColor: theme.background }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );

    const moodEmoji = data.mood_average > 0.6 ? '😊' : data.mood_average > 0.3 ? '😐' : '😟';
    const moodText = data.mood_average > 0.6 ? 'Happy & Focused' : data.mood_average > 0.3 ? 'Moderate' : 'Needs Support';

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ 
                title: 'Parent Dashboard',
                headerLeft: () => null, // Remove back button
                headerBackVisible: false // Ensure it's hidden on all platforms
            }} />

            {/* Parent Hero */}
            <View style={[styles.heroCard, { backgroundColor: '#10b981' }]}>
                <TouchableOpacity 
                    style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
                    onPress={() => { logout(); router.replace('/auth'); }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>🚪 Logout Parent</Text>
                </TouchableOpacity>
                <Text style={styles.heroEmoji}>👨‍👩‍👦</Text>
                <Text style={styles.heroTitle}>Parent Dashboard</Text>
                <Text style={styles.heroSub}>{data.student_name}'s Progress Report</Text>
                <Text style={styles.heroNote}>Simple icons. No jargon. Just your child's effort.</Text>
            </View>

            {/* Stats Grid - Icon Based for easy understanding */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 At a Glance</Text>
            <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={{ fontSize: 36 }}>📝</Text>
                    <Text style={[styles.statNum, { color: Colors.primary }]}>{data.total_tests}</Text>
                    <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Tests Taken</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={{ fontSize: 36 }}>⏰</Text>
                    <Text style={[styles.statNum, { color: Colors.info }]}>{data.total_study_hours}h</Text>
                    <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Study Time</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={{ fontSize: 36 }}>🎯</Text>
                    <Text style={[styles.statNum, { color: Colors.success }]}>{data.overall_accuracy}%</Text>
                    <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Accuracy</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={{ fontSize: 36 }}>🔥</Text>
                    <Text style={[styles.statNum, { color: Colors.warning }]}>{data.current_streak}</Text>
                    <Text style={[styles.statLbl, { color: theme.textSecondary }]}>Day Streak</Text>
                </View>
            </View>

            {/* Mood Indicator */}
            <View style={[styles.moodCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Text style={{ fontSize: 40 }}>{moodEmoji}</Text>
                <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={[styles.moodTitle, { color: theme.text }]}>How they're feeling</Text>
                    <Text style={[styles.moodText, { color: theme.textSecondary }]}>{moodText}</Text>
                    <View style={[styles.moodBar, { backgroundColor: theme.border }]}>
                        <View style={[styles.moodFill, {
                            width: `${data.mood_average * 100}%`,
                            backgroundColor: data.mood_average > 0.6 ? Colors.success : data.mood_average > 0.3 ? Colors.warning : Colors.error,
                        }]} />
                    </View>
                </View>
            </View>

            {/* Recent Scores */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 Recent Test Scores</Text>
            {data.recent_scores.length > 0 ? data.recent_scores.map((score, i) => (
                <View key={i} style={[styles.scoreRow, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[{ color: theme.textMuted, fontSize: 12, width: 80 }]}>
                        {new Date(score.date).toLocaleDateString()}
                    </Text>
                    <View style={[styles.scoreBar, { backgroundColor: theme.border }]}>
                        <View style={[styles.scoreFill, {
                            width: `${score.total > 0 ? (score.score / score.total) * 100 : 0}%`,
                            backgroundColor: Colors.primary,
                        }]} />
                    </View>
                    <Text style={[{ color: theme.text, fontWeight: '700', fontSize: 13, width: 60, textAlign: 'right' }]}>
                        {score.score}/{score.total}
                    </Text>
                </View>
            )) : (
                <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📝</Text>
                    <Text style={[{ color: theme.textSecondary, fontSize: 13, textAlign: 'center' }]}>
                        No tests taken yet. Scores will appear here after the first mock test.
                    </Text>
                </View>
            )}

            {/* SMS Setup */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: Spacing.md }]}>📱 Weekly SMS Alerts</Text>
            <View style={[styles.smsCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Text style={[{ color: theme.text, fontSize: 14, marginBottom: 8 }]}>
                    Get weekly progress reports via SMS — even without a smartphone!
                </Text>
                <TextInput
                    style={[styles.phoneInput, { borderColor: theme.border, color: theme.text, backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa' }]}
                    value={parentPhone} onChangeText={setParentPhone}
                    placeholder="Enter parent's phone number"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad" maxLength={10}
                />
                <TouchableOpacity style={[styles.smsBtn, { backgroundColor: smsSetup ? Colors.success : Colors.primary }]}
                    onPress={handleSetupSMS} activeOpacity={0.7}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                        {smsSetup ? '✅ SMS Alerts Active' : '📲 Activate Weekly Alerts'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Info */}
            <View style={[styles.infoCard, { backgroundColor: Colors.info + '10', borderColor: Colors.info + '30' }]}>
                <Text style={[{ color: Colors.info, fontWeight: '700', marginBottom: 4 }]}>ℹ️ About This Dashboard</Text>
                <Text style={[{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }]}>
                    This dashboard is designed for parents who may not be tech-savvy. All data is shown using simple icons and large numbers. SMS alerts work on basic phones too!
                </Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heroCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, ...Shadow.lg },
    heroEmoji: { fontSize: 48, marginBottom: 8 },
    heroTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.md, fontWeight: '600', marginTop: 4 },
    heroNote: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginTop: 8, textAlign: 'center' },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    statBox: { flex: 1, minWidth: '45%', alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, ...Shadow.sm },
    statNum: { fontSize: FontSize.xxl, fontWeight: '800', marginTop: 4 },
    statLbl: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 2 },
    moodCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.lg, ...Shadow.sm },
    moodTitle: { fontSize: FontSize.base, fontWeight: '700' },
    moodText: { fontSize: FontSize.sm, marginTop: 2, marginBottom: 8 },
    moodBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
    moodFill: { height: '100%', borderRadius: 3 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: 4, gap: 8 },
    scoreBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
    scoreFill: { height: '100%', borderRadius: 4 },
    emptyBox: { alignItems: 'center', padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1 },
    smsCard: { padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.md },
    phoneInput: { borderWidth: 1.5, borderRadius: BorderRadius.md, padding: 14, fontSize: 16, fontWeight: '600', marginBottom: 12 },
    smsBtn: { paddingVertical: 14, borderRadius: BorderRadius.md, alignItems: 'center' },
    infoCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
});
