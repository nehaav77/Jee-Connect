// JEE Connect - Mock Test Instructions & Rules Screen (NTA-style)
import React, { useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize } from '@/src/constants/theme';
import { testRepository } from '@/src/repositories/TestRepository';
import { useAppStore } from '@/src/store/appStore';

const { width: SW } = Dimensions.get('window');

const GENERAL_INSTRUCTIONS = [
    'The total duration of the examination is 180 minutes (3 hours).',
    'The clock will be set at the server. The countdown timer at the top right corner of the screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You need not terminate the examination or submit your answers.',
    'The Question Palette displayed on the right side of the screen will show the status of each question using one of the following symbols/colors:',
    'You can click on the ">" arrow which appears to the left of the question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on "<" which appears on the right side of the question window.',
    'You can click on your "Profile" image on the top right corner of your screen to change the language during the exam for entire question paper. On clicking of Profile image you will get a dropdown to change the question content to the desired language.',
];

const NAVIGATING_INSTRUCTIONS = [
    'To answer a question, do the following:',
    'Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.',
    'Click on "Save & Next" to save your answer for the current question and then go to the next question.',
    'Click on "Mark for Review & Next" to save your answer for the current question and also mark it for review, and then go to the next question.',
];

const ANSWERING_INSTRUCTIONS = [
    'For Multiple Choice Questions (MCQ): To select your answer, click on the button of one of the options.',
    'To deselect your chosen answer, click on the button of the chosen option again or click on the "Clear Response" button.',
    'To change your chosen answer, click on the button of another option.',
    'For Numerical Answer Type Questions: To enter a numerical answer, use the virtual numerical keypad.',
    'To clear your answer, click on the "Clear Response" button.',
    'To save your answer, you MUST click on the "Save & Next" button.',
    'To mark the question for review, click on the "Mark for Review & Next" button.',
];

const SECTION_INSTRUCTIONS = [
    'This question paper consists of 3 sections — Physics, Chemistry, and Mathematics.',
    'Each section has 20 MCQs and 10 Numerical value questions (out of which only 5 are to be attempted).',
    'For MCQ: Correct answer gives +4 marks. Wrong answer gives -1 mark.',
    'For Numerical: Correct answer gives +4 marks. No negative marking for wrong answers.',
    'There is no penalty for un-attempted questions.',
];

const EXAM_CONDUCT_RULES = [
    'The exam must be taken in full-screen mode. EXITING FULL SCREEN WILL RESULT IN IMMEDIATE DISQUALIFICATION with a score of 0.',
    'Do not use any external help, AI tools, calculators (unless provided), or reference materials.',
    'Ensure a stable internet connection (for syncing) before starting the exam.',
    'Once the exam begins, you cannot pause or restart. The timer runs continuously.',
    'You cannot submit the exam until at least 50% of the allotted time has elapsed.',
    'Your answers are auto-saved periodically. However, always click "Save & Next" to ensure saving.',
];

export default function TestInstructionsScreen() {
    const { testId } = useLocalSearchParams<{ testId: string }>();
    const router = useRouter();
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userEmail, userName } = useAppStore();
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleBeginExam() {
        if (!agreed || loading) return;
        setLoading(true);
        try {
            const attemptId = await testRepository.startAttempt(testId!, userEmail);

            // On web, request fullscreen before navigating
            if (Platform.OS === 'web' && document.documentElement.requestFullscreen) {
                try {
                    await document.documentElement.requestFullscreen();
                } catch (e) { /* user may deny, continue anyway */ }
            }

            router.replace({ pathname: '/test/[testId]', params: { testId: testId!, attemptId } } as any);
        } catch (e) {
            console.log('Start test error:', e);
            setLoading(false);
        }
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: '#1a237e' }]}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>JEE (Main) — Mock Test</Text>
                    <Text style={styles.headerSubtitle}>Computer Based Test (CBT)</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
            </View>

            {/* Candidate Info Bar */}
            <View style={[styles.candidateBar, { backgroundColor: isDark ? '#1e293b' : '#e8eaf6' }]}>
                <View style={styles.candidateInfo}>
                    <Text style={[styles.candidateLabel, { color: theme.textSecondary }]}>Candidate Name:</Text>
                    <Text style={[styles.candidateValue, { color: theme.text }]}>{userName || 'Student'}</Text>
                </View>
                <View style={styles.candidateInfo}>
                    <Text style={[styles.candidateLabel, { color: theme.textSecondary }]}>Exam:</Text>
                    <Text style={[styles.candidateValue, { color: theme.text }]}>JEE (Main) Mock Test</Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Important Notice */}
                <View style={[styles.noticeBox, { backgroundColor: '#fff3e0', borderColor: '#ff9800' }]}>
                    <Text style={styles.noticeIcon}>⚠️</Text>
                    <Text style={[styles.noticeText, { color: '#e65100' }]}>
                        Please read ALL the instructions carefully before starting the examination. 
                        Once you start the exam, it cannot be paused or restarted.
                    </Text>
                </View>

                {/* Section 1: General Instructions */}
                <View style={styles.section}>
                    <View style={[styles.sectionHeader, { backgroundColor: '#1565c0' }]}>
                        <Text style={styles.sectionHeaderText}>📋 General Instructions</Text>
                    </View>
                    <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        {GENERAL_INSTRUCTIONS.map((item, i) => (
                            <View key={i} style={styles.instructionRow}>
                                <Text style={[styles.bulletNum, { color: Colors.primary }]}>{i + 1}.</Text>
                                <Text style={[styles.instructionText, { color: theme.text }]}>{item}</Text>
                            </View>
                        ))}

                        {/* Question Status Legend */}
                        <View style={[styles.legendContainer, { backgroundColor: isDark ? '#1a1a2e' : '#f5f5f5', borderColor: theme.border }]}>
                            <Text style={[styles.legendTitle, { color: theme.text }]}>Question Status Legend:</Text>
                            <View style={styles.legendGrid}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendBox, { backgroundColor: '#9e9e9e' }]}>
                                        <Text style={styles.legendBoxText}>1</Text>
                                    </View>
                                    <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Not Visited</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendBox, { backgroundColor: '#dc3545' }]}>
                                        <Text style={styles.legendBoxText}>2</Text>
                                    </View>
                                    <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Not Answered</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendBox, { backgroundColor: '#28a745' }]}>
                                        <Text style={styles.legendBoxText}>3</Text>
                                    </View>
                                    <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Answered</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendBox, { backgroundColor: '#6f42c1', borderRadius: 20 }]}>
                                        <Text style={styles.legendBoxText}>4</Text>
                                    </View>
                                    <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Marked for Review</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendBox, { backgroundColor: '#6f42c1', borderRadius: 20 }]}>
                                        <Text style={styles.legendBoxText}>5</Text>
                                        <View style={styles.ansRevDot} />
                                    </View>
                                    <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Answered & Marked for Review (will be evaluated)</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Section 2: Navigating Questions */}
                <View style={styles.section}>
                    <View style={[styles.sectionHeader, { backgroundColor: '#2e7d32' }]}>
                        <Text style={styles.sectionHeaderText}>🧭 Navigating to a Question</Text>
                    </View>
                    <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        {NAVIGATING_INSTRUCTIONS.map((item, i) => (
                            <View key={i} style={styles.instructionRow}>
                                <Text style={[styles.bulletNum, { color: '#2e7d32' }]}>{i + 1}.</Text>
                                <Text style={[styles.instructionText, { color: theme.text }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Section 3: Answering Questions */}
                <View style={styles.section}>
                    <View style={[styles.sectionHeader, { backgroundColor: '#e65100' }]}>
                        <Text style={styles.sectionHeaderText}>✏️ Answering a Question</Text>
                    </View>
                    <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        {ANSWERING_INSTRUCTIONS.map((item, i) => (
                            <View key={i} style={styles.instructionRow}>
                                <Text style={[styles.bulletNum, { color: '#e65100' }]}>{i + 1}.</Text>
                                <Text style={[styles.instructionText, { color: theme.text }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Section 4: Marking Scheme */}
                <View style={styles.section}>
                    <View style={[styles.sectionHeader, { backgroundColor: '#6a1b9a' }]}>
                        <Text style={styles.sectionHeaderText}>📊 Section-wise Marking Scheme</Text>
                    </View>
                    <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        {SECTION_INSTRUCTIONS.map((item, i) => (
                            <View key={i} style={styles.instructionRow}>
                                <Text style={[styles.bulletNum, { color: '#6a1b9a' }]}>{i + 1}.</Text>
                                <Text style={[styles.instructionText, { color: theme.text }]}>{item}</Text>
                            </View>
                        ))}

                        {/* Marking Table */}
                        <View style={[styles.markingTable, { borderColor: theme.border }]}>
                            <View style={[styles.tableRow, { backgroundColor: '#1565c0' }]}>
                                <Text style={[styles.tableCell, styles.tableHeader, { flex: 2 }]}>Question Type</Text>
                                <Text style={[styles.tableCell, styles.tableHeader]}>Correct</Text>
                                <Text style={[styles.tableCell, styles.tableHeader]}>Wrong</Text>
                                <Text style={[styles.tableCell, styles.tableHeader]}>Unattempted</Text>
                            </View>
                            <View style={[styles.tableRow, { backgroundColor: isDark ? '#1e293b' : '#e3f2fd' }]}>
                                <Text style={[styles.tableCell, { flex: 2, color: theme.text }]}>MCQ (Single Correct)</Text>
                                <Text style={[styles.tableCell, { color: '#28a745', fontWeight: '700' }]}>+4</Text>
                                <Text style={[styles.tableCell, { color: '#dc3545', fontWeight: '700' }]}>-1</Text>
                                <Text style={[styles.tableCell, { color: theme.textMuted }]}>0</Text>
                            </View>
                            <View style={[styles.tableRow, { backgroundColor: isDark ? '#162032' : '#f5f5f5' }]}>
                                <Text style={[styles.tableCell, { flex: 2, color: theme.text }]}>Numerical Value</Text>
                                <Text style={[styles.tableCell, { color: '#28a745', fontWeight: '700' }]}>+4</Text>
                                <Text style={[styles.tableCell, { color: theme.textMuted }]}>0</Text>
                                <Text style={[styles.tableCell, { color: theme.textMuted }]}>0</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Section 5: Exam Conduct Rules */}
                <View style={styles.section}>
                    <View style={[styles.sectionHeader, { backgroundColor: '#c62828' }]}>
                        <Text style={styles.sectionHeaderText}>🔒 Exam Conduct Rules (IMPORTANT)</Text>
                    </View>
                    <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        {EXAM_CONDUCT_RULES.map((item, i) => (
                            <View key={i} style={styles.instructionRow}>
                                <Text style={[styles.bulletNum, { color: '#c62828' }]}>⚠</Text>
                                <Text style={[styles.instructionText, { color: theme.text, fontWeight: i < 4 ? '600' : '400' }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Checkbox Agreement */}
                <View style={[styles.agreementBox, { 
                    backgroundColor: agreed ? (isDark ? '#1b5e20' + '30' : '#e8f5e9') : (isDark ? '#b71c1c' + '20' : '#ffebee'),
                    borderColor: agreed ? '#4caf50' : '#ef5350'
                }]}>
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => setAgreed(!agreed)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, {
                            borderColor: agreed ? '#4caf50' : '#ef5350',
                            backgroundColor: agreed ? '#4caf50' : 'transparent',
                        }]}>
                            {agreed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.agreementText, { color: theme.text }]}>
                            I have read and understood all the instructions given above. I agree to abide by the rules of the examination. 
                            I understand that any violation of the exam conduct rules may result in automatic submission of my paper. 
                            I am ready to proceed with the exam.
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.proceedBtn, {
                            backgroundColor: agreed ? '#1565c0' : '#9e9e9e',
                            opacity: agreed ? 1 : 0.6,
                        }]}
                        onPress={handleBeginExam}
                        disabled={!agreed || loading}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.proceedBtnText}>
                            {loading ? 'Starting Exam...' : agreed ? '🚀 I am ready to begin — START EXAM' : '☝️ Please accept the declaration first'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 16,
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 0.3 },
    headerSubtitle: { color: '#bbdefb', fontSize: 13, marginTop: 2 },
    backBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
    backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    candidateBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 24,
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    candidateInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    candidateLabel: { fontSize: 13, fontWeight: '600' },
    candidateValue: { fontSize: 13, fontWeight: '700' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        marginBottom: 24,
        gap: 10,
    },
    noticeIcon: { fontSize: 22 },
    noticeText: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 22 },
    section: { marginBottom: 20 },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    sectionHeaderText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    sectionBody: {
        padding: 16,
        borderWidth: 1,
        borderTopWidth: 0,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    instructionRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
    bulletNum: { fontWeight: '800', fontSize: 14, minWidth: 20 },
    instructionText: { flex: 1, fontSize: 14, lineHeight: 22 },
    legendContainer: {
        padding: 16,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 8,
    },
    legendTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
    legendGrid: { gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    legendBox: {
        width: 32,
        height: 32,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    legendBoxText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    legendLabel: { fontSize: 13, flex: 1 },
    ansRevDot: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#28a745',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    markingTable: {
        marginTop: 16,
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    tableRow: { flexDirection: 'row' },
    tableCell: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 13,
        textAlign: 'center',
    },
    tableHeader: { color: '#fff', fontWeight: '700', fontSize: 13 },
    agreementBox: {
        borderRadius: 12,
        borderWidth: 2,
        padding: 16,
        marginTop: 8,
        marginBottom: 20,
    },
    checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        borderWidth: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkmark: { color: '#fff', fontWeight: '800', fontSize: 18 },
    agreementText: { flex: 1, fontSize: 14, lineHeight: 22, fontWeight: '500' },
    buttonRow: { alignItems: 'center', marginTop: 4 },
    proceedBtn: {
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
        maxWidth: 600,
    },
    proceedBtnText: { color: '#fff', fontWeight: '800', fontSize: 17, textAlign: 'center' },
});
