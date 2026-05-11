// JEE Connect - Post-Signup Onboarding Wizard (Sprint 9)
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/appStore';
import { gamificationService } from '@/src/services/GamificationService';

const { width: SW } = Dimensions.get('window');

export default function OnboardingScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userEmail, setOnboardingComplete, refreshGamificationData } = useAppStore();
    const router = useRouter();

    const [step, setStep] = useState(0);
    const [targetExam, setTargetExam] = useState('');
    const [targetYear, setTargetYear] = useState('');
    const [dreamCollege, setDreamCollege] = useState('');
    const [studyTime, setStudyTime] = useState('');
    const [subjectPriority, setSubjectPriority] = useState<string[]>([]);

    async function handleFinish() {
        if (userEmail) {
            if (targetExam) await gamificationService.setProfileValue(userEmail, 'target_exam', targetExam);
            if (targetYear) await gamificationService.setProfileValue(userEmail, 'target_year', targetYear);
            if (dreamCollege) await gamificationService.setProfileValue(userEmail, 'dream_college', dreamCollege);
            if (studyTime) await gamificationService.setProfileValue(userEmail, 'study_time_pref', studyTime);
            if (subjectPriority.length > 0) await gamificationService.setProfileValue(userEmail, 'subject_priority', JSON.stringify(subjectPriority));
            await gamificationService.setProfileValue(userEmail, 'onboarding_complete', 'true');
            // Award welcome XP
            await gamificationService.awardXP(userEmail, 'onboarding_complete', 20);
            setOnboardingComplete(true);
            refreshGamificationData(userEmail);
        }
        router.replace('/(tabs)');
    }

    function handleSkip() {
        if (userEmail) {
            gamificationService.setProfileValue(userEmail, 'onboarding_complete', 'true');
            setOnboardingComplete(true);
        }
        router.replace('/(tabs)');
    }

    const examOptions = [
        { value: 'jee_main', label: 'JEE Main', emoji: '📝', desc: 'NTA conducted, gateway to NITs/IIITs' },
        { value: 'jee_advanced', label: 'JEE Advanced', emoji: '🏆', desc: 'For IIT admissions' },
        { value: 'both', label: 'Both', emoji: '🎯', desc: 'Full preparation for Main + Advanced' },
    ];

    const yearOptions = ['2026', '2027', '2028'];
    const timeOptions = [
        { value: 'morning', label: 'Morning', emoji: '🌅', desc: '6 AM - 12 PM' },
        { value: 'afternoon', label: 'Afternoon', emoji: '☀️', desc: '12 PM - 6 PM' },
        { value: 'night', label: 'Night', emoji: '🌙', desc: '6 PM - 12 AM' },
    ];
    const subjectOptions = ['Physics', 'Chemistry', 'Mathematics'];

    function toggleSubjectPriority(s: string) {
        if (subjectPriority.includes(s)) {
            setSubjectPriority(subjectPriority.filter(x => x !== s));
        } else {
            setSubjectPriority([...subjectPriority, s]);
        }
    }

    const steps = [
        // Step 0: Target Exam
        <View key="exam">
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🎯</Text>
            <Text style={[styles.stepTitle, { color: theme.text }]}>What exam are you preparing for?</Text>
            <Text style={[styles.stepSub, { color: theme.textSecondary }]}>We'll tailor question difficulty and test patterns</Text>
            <View style={styles.optionsGrid}>
                {examOptions.map(opt => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.optionCard, {
                            backgroundColor: targetExam === opt.value ? Colors.primary + '15' : theme.surface,
                            borderColor: targetExam === opt.value ? Colors.primary : theme.cardBorder,
                        }]}
                        onPress={() => setTargetExam(opt.value)}
                        activeOpacity={0.7}>
                        <Text style={{ fontSize: 32 }}>{opt.emoji}</Text>
                        <Text style={[styles.optionLabel, { color: targetExam === opt.value ? Colors.primary : theme.text }]}>{opt.label}</Text>
                        <Text style={[styles.optionDesc, { color: theme.textMuted }]}>{opt.desc}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>,

        // Step 1: Target Year & Dream College
        <View key="year">
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>📅</Text>
            <Text style={[styles.stepTitle, { color: theme.text }]}>When is your exam?</Text>
            <Text style={[styles.stepSub, { color: theme.textSecondary }]}>We'll show a countdown on your home screen</Text>
            <View style={[styles.optionsRow, { marginBottom: 20 }]}>
                {yearOptions.map(y => (
                    <TouchableOpacity
                        key={y}
                        style={[styles.yearBtn, {
                            backgroundColor: targetYear === y ? Colors.primary : theme.surface,
                            borderColor: targetYear === y ? Colors.primary : theme.cardBorder,
                        }]}
                        onPress={() => setTargetYear(y)}>
                        <Text style={{ color: targetYear === y ? '#fff' : theme.text, fontWeight: '700', fontSize: 16 }}>JEE {y}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Dream College (optional)</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g., IIT Bombay"
                placeholderTextColor={theme.textMuted}
                value={dreamCollege}
                onChangeText={setDreamCollege}
            />
            <Text style={[{ color: theme.textMuted, fontSize: 12, marginTop: 6 }]}>We'll use this for motivation messages! 💪</Text>
        </View>,

        // Step 2: Study Preferences
        <View key="prefs">
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>⏰</Text>
            <Text style={[styles.stepTitle, { color: theme.text }]}>When do you study best?</Text>
            <Text style={[styles.stepSub, { color: theme.textSecondary }]}>We'll adapt reminders and Saathi's greetings</Text>
            <View style={styles.optionsGrid}>
                {timeOptions.map(opt => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.optionCard, {
                            backgroundColor: studyTime === opt.value ? Colors.primary + '15' : theme.surface,
                            borderColor: studyTime === opt.value ? Colors.primary : theme.cardBorder,
                        }]}
                        onPress={() => setStudyTime(opt.value)}
                        activeOpacity={0.7}>
                        <Text style={{ fontSize: 32 }}>{opt.emoji}</Text>
                        <Text style={[styles.optionLabel, { color: studyTime === opt.value ? Colors.primary : theme.text }]}>{opt.label}</Text>
                        <Text style={[styles.optionDesc, { color: theme.textMuted }]}>{opt.desc}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 20 }]}>
                Rank your subjects by confidence (tap in order)
            </Text>
            <View style={styles.optionsRow}>
                {subjectOptions.map((s, i) => {
                    const idx = subjectPriority.indexOf(s);
                    return (
                        <TouchableOpacity
                            key={s}
                            style={[styles.subjectChip, {
                                backgroundColor: idx >= 0 ? Colors.primary : theme.surface,
                                borderColor: idx >= 0 ? Colors.primary : theme.cardBorder,
                            }]}
                            onPress={() => toggleSubjectPriority(s)}>
                            <Text style={{ color: idx >= 0 ? '#fff' : theme.text, fontWeight: '700' }}>
                                {idx >= 0 ? `${idx + 1}. ` : ''}{s}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>,
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Progress dots */}
            <View style={styles.dotsRow}>
                {steps.map((_, i) => (
                    <View key={i} style={[styles.dot, {
                        backgroundColor: i === step ? Colors.primary : theme.border,
                        width: i === step ? 24 : 8,
                    }]} />
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {steps[step]}
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: Colors.primary }]}
                    onPress={() => {
                        if (step < steps.length - 1) setStep(step + 1);
                        else handleFinish();
                    }}
                    activeOpacity={0.8}>
                    <Text style={styles.nextBtnText}>
                        {step < steps.length - 1 ? 'Next →' : 'Get Started! 🚀'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 16, paddingBottom: 8 },
    dot: { height: 8, borderRadius: 4 },
    scrollContent: { flexGrow: 1, padding: Spacing.xl, paddingTop: 8 },
    stepTitle: { fontSize: FontSize.xl, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    stepSub: { fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl },
    optionsGrid: { gap: 12 },
    optionCard: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center', gap: 6 },
    optionLabel: { fontSize: FontSize.base, fontWeight: '800' },
    optionDesc: { fontSize: FontSize.xs, textAlign: 'center' },
    optionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    yearBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center' },
    fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8 },
    input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: FontSize.base, minHeight: 48 },
    subjectChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1.5 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderTopWidth: 0.5 },
    nextBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: BorderRadius.md },
    nextBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.base },
});
