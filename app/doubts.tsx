// JEE Connect - Doubt Marketplace Screen (Sprint 7)
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { liveSprintService, DoubtPost, DoubtAnswer } from '@/src/services/LiveSprintService';
import { useAppStore } from '@/src/store/appStore';

const BAD_WORDS = ['loser', 'idiot', 'stupid', 'dumb', 'fuck', 'shit', 'bitch', 'asshole'];

function containsProfanity(text: string): boolean {
    const lower = text.toLowerCase();
    return BAD_WORDS.some(word => lower.includes(word));
}

export default function DoubtsScreen() {
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userName, isOnline } = useAppStore();

    const [doubts, setDoubts] = useState<DoubtPost[]>([]);
    const [showCompose, setShowCompose] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [newSubject, setNewSubject] = useState('Physics');
    const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

    // Detail view state
    const [selectedDoubt, setSelectedDoubt] = useState<DoubtPost | null>(null);
    const [doubtAnswers, setDoubtAnswers] = useState<DoubtAnswer[]>([]);
    const [replyText, setReplyText] = useState('');
    const [loadingAnswers, setLoadingAnswers] = useState(false);

    // Edit/Delete state
    const [editingDoubtId, setEditingDoubtId] = useState<string | null>(null);
    const [editDoubtText, setEditDoubtText] = useState('');
    const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
    const [editAnswerText, setEditAnswerText] = useState('');

    useEffect(() => { loadDoubts(); }, []);

    async function loadDoubts() {
        const d = await liveSprintService.getRecentDoubts();
        setDoubts(d);
    }

    async function handlePostDoubt() {
        if (!newQuestion.trim()) return;
        if (containsProfanity(newQuestion)) {
            if (Platform.OS === 'web') window.alert('Your post contains inappropriate language. Please revise it.');
            else Alert.alert('Inappropriate Content', 'Your post contains inappropriate language. Please revise it.');
            return;
        }
        await liveSprintService.postDoubt(newQuestion, newSubject, '', userName);
        setNewQuestion('');
        setShowCompose(false);
        await loadDoubts();
        if (Platform.OS === 'web') alert('Doubt posted! 🎉');
        else Alert.alert('Posted!', 'Your doubt has been shared with the community.');
    }

    async function openDoubtDetail(doubt: DoubtPost) {
        setSelectedDoubt(doubt);
        setLoadingAnswers(true);
        const ans = await liveSprintService.getAnswersForDoubt(doubt.id);
        setDoubtAnswers(ans);
        setLoadingAnswers(false);
    }

    async function handlePostReply() {
        if (!replyText.trim() || !selectedDoubt) return;
        if (containsProfanity(replyText)) {
            if (Platform.OS === 'web') window.alert('Your reply contains inappropriate language. Please revise it.');
            else Alert.alert('Inappropriate Content', 'Your reply contains inappropriate language. Please revise it.');
            return;
        }
        await liveSprintService.postAnswer(selectedDoubt.id, replyText, userName);
        setReplyText('');
        const ans = await liveSprintService.getAnswersForDoubt(selectedDoubt.id);
        setDoubtAnswers(ans);
        await loadDoubts();
        // Update the selected doubt's answer count locally
        setSelectedDoubt(prev => prev ? { ...prev, answers_count: ans.length } : null);
    }

    async function handleResolve() {
        if (!selectedDoubt) return;
        await liveSprintService.resolveDoubt(selectedDoubt.id);
        setSelectedDoubt(prev => prev ? { ...prev, is_resolved: true } : null);
        await loadDoubts();
    }

    function handleDeleteDoubt(id: string) {
        const doDelete = async () => {
            await liveSprintService.deleteDoubt(id);
            if (selectedDoubt?.id === id) setSelectedDoubt(null);
            await loadDoubts();
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Delete this doubt?')) doDelete();
        } else {
            Alert.alert('Delete Doubt', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete }
            ]);
        }
    }

    async function handleSaveEditDoubt() {
        if (!editingDoubtId || !editDoubtText.trim()) return;
        if (containsProfanity(editDoubtText)) {
            if (Platform.OS === 'web') window.alert('Your post contains inappropriate language. Please revise it.');
            else Alert.alert('Inappropriate Content', 'Your post contains inappropriate language. Please revise it.');
            return;
        }
        await liveSprintService.editDoubt(editingDoubtId, editDoubtText);
        setEditingDoubtId(null);
        setEditDoubtText('');
        await loadDoubts();
        if (selectedDoubt?.id === editingDoubtId) {
            setSelectedDoubt(prev => prev ? { ...prev, question_text: editDoubtText } : null);
        }
    }

    function handleDeleteAnswer(answerId: string) {
        if (!selectedDoubt) return;
        const doDelete = async () => {
            await liveSprintService.deleteAnswer(answerId, selectedDoubt.id);
            const ans = await liveSprintService.getAnswersForDoubt(selectedDoubt.id);
            setDoubtAnswers(ans);
            await loadDoubts();
            setSelectedDoubt(prev => prev ? { ...prev, answers_count: ans.length } : null);
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Delete this reply?')) doDelete();
        } else {
            Alert.alert('Delete Reply', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete }
            ]);
        }
    }

    async function handleSaveEditAnswer() {
        if (!editingAnswerId || !editAnswerText.trim() || !selectedDoubt) return;
        if (containsProfanity(editAnswerText)) {
            if (Platform.OS === 'web') window.alert('Your reply contains inappropriate language. Please revise it.');
            else Alert.alert('Inappropriate Content', 'Your reply contains inappropriate language. Please revise it.');
            return;
        }
        await liveSprintService.editAnswer(editingAnswerId, editAnswerText);
        setEditingAnswerId(null);
        setEditAnswerText('');
        const ans = await liveSprintService.getAnswersForDoubt(selectedDoubt.id);
        setDoubtAnswers(ans);
    }

    function timeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    const filtered = doubts.filter(d => {
        if (filter === 'open') return !d.is_resolved;
        if (filter === 'resolved') return d.is_resolved;
        return true;
    });

    const subjectIcon = (s: string) =>
        s === 'Physics' ? '⚛️' : s === 'Chemistry' ? '🧪' : s === 'Mathematics' ? '📐' : '📖';

    const subjectColor = (s: string) =>
        s === 'Physics' ? '#6366f1' : s === 'Chemistry' ? '#10b981' : '#f59e0b';

    // ─── DETAIL VIEW ───
    if (selectedDoubt) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <Stack.Screen options={{ title: 'Doubt Detail' }} />
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Back button */}
                    <TouchableOpacity style={{ marginBottom: 12 }} onPress={() => { setSelectedDoubt(null); setDoubtAnswers([]); setReplyText(''); }}>
                        <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 15 }}>← Back to Doubts</Text>
                    </TouchableOpacity>

                    {/* Doubt Card */}
                    <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                        <View style={styles.doubtHeader}>
                            <View style={[styles.subjectTag, { backgroundColor: subjectColor(selectedDoubt.subject) + '20' }]}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: subjectColor(selectedDoubt.subject) }}>
                                    {subjectIcon(selectedDoubt.subject)} {selectedDoubt.subject}
                                </Text>
                            </View>
                            {selectedDoubt.is_resolved && (
                                <View style={[styles.resolvedTag, { backgroundColor: Colors.success + '20' }]}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.success }}>✅ Resolved</Text>
                                </View>
                            )}
                        </View>

                        {editingDoubtId === selectedDoubt.id ? (
                            <View style={{ marginBottom: 12 }}>
                                <TextInput
                                    style={[styles.replyInput, { borderColor: theme.border, color: theme.text, backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa', marginBottom: 8 }]}
                                    value={editDoubtText}
                                    onChangeText={setEditDoubtText}
                                    multiline
                                />
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity style={[styles.sendBtn, { backgroundColor: Colors.primary, flex: 1, paddingVertical: 8 }]} onPress={handleSaveEditDoubt}>
                                        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.surfaceElevated, flex: 1, paddingVertical: 8 }]} onPress={() => setEditingDoubtId(null)}>
                                        <Text style={{ color: theme.text, fontWeight: '700', textAlign: 'center' }}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <Text style={[styles.detailQuestion, { color: theme.text }]}>{selectedDoubt.question_text}</Text>
                        )}

                        <View style={styles.doubtFooter}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={[styles.avatar, { backgroundColor: subjectColor(selectedDoubt.subject) + '30' }]}>
                                    <Text style={{ fontSize: 14 }}>👤</Text>
                                </View>
                                <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>{selectedDoubt.posted_by}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                {selectedDoubt.posted_by === userName && (
                                    <>
                                        <TouchableOpacity onPress={() => { setEditingDoubtId(selectedDoubt.id); setEditDoubtText(selectedDoubt.question_text); }}>
                                            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteDoubt(selectedDoubt.id)}>
                                            <Text style={{ color: Colors.error, fontSize: 12, fontWeight: '600' }}>Delete</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{timeAgo(selectedDoubt.created_at)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Resolve button (only for the author) */}
                    {selectedDoubt.posted_by === userName && !selectedDoubt.is_resolved && (
                        <TouchableOpacity style={[styles.resolveBtn, { backgroundColor: Colors.success + '15', borderColor: Colors.success + '40' }]}
                            onPress={handleResolve} activeOpacity={0.7}>
                            <Text style={{ color: Colors.success, fontWeight: '700', fontSize: 14 }}>✅ Mark as Resolved</Text>
                        </TouchableOpacity>
                    )}

                    {/* Answers Section */}
                    <View style={{ marginTop: 8 }}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            💬 Replies ({doubtAnswers.length})
                        </Text>

                        {loadingAnswers ? (
                            <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 20 }}>Loading replies...</Text>
                        ) : doubtAnswers.length === 0 ? (
                            <View style={[styles.emptyReplies, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                                <Text style={{ fontSize: 36, marginBottom: 8 }}>🤔</Text>
                                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>No replies yet</Text>
                                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>Be the first to help!</Text>
                            </View>
                        ) : (
                            doubtAnswers.map((ans, idx) => (
                                <View key={ans.id} style={[styles.answerCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
                                            <Text style={{ fontSize: 12 }}>👤</Text>
                                        </View>
                                        <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>{ans.answered_by}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                                            {ans.answered_by === userName && (
                                                <>
                                                    <TouchableOpacity onPress={() => { setEditingAnswerId(ans.id); setEditAnswerText(ans.answer_text); }}>
                                                        <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '600' }}>Edit</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleDeleteAnswer(ans.id)}>
                                                        <Text style={{ color: Colors.error, fontSize: 11, fontWeight: '600' }}>Delete</Text>
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                            <Text style={{ color: theme.textMuted, fontSize: 11 }}>{timeAgo(ans.created_at)}</Text>
                                        </View>
                                    </View>
                                    {editingAnswerId === ans.id ? (
                                        <View style={{ marginVertical: 8 }}>
                                            <TextInput
                                                style={[styles.replyInput, { borderColor: theme.border, color: theme.text, backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa', marginBottom: 8 }]}
                                                value={editAnswerText}
                                                onChangeText={setEditAnswerText}
                                                multiline
                                            />
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: Colors.primary, flex: 1, paddingVertical: 8 }]} onPress={handleSaveEditAnswer}>
                                                    <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Save</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.surfaceElevated, flex: 1, paddingVertical: 8 }]} onPress={() => setEditingAnswerId(null)}>
                                                    <Text style={{ color: theme.text, fontWeight: '700', textAlign: 'center' }}>Cancel</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        <Text style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>{ans.answer_text}</Text>
                                    )}
                                    {ans.is_accepted && (
                                        <View style={[styles.acceptedBadge, { backgroundColor: Colors.success + '15' }]}>
                                            <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700' }}>✅ Accepted Answer</Text>
                                        </View>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>

                {/* Reply Input (pinned to bottom) */}
                <View style={[styles.replyBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                    <TextInput
                        style={[styles.replyInput, { borderColor: theme.border, color: theme.text, backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa' }]}
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="Write your reply..."
                        placeholderTextColor={theme.textMuted}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: replyText.trim() ? Colors.primary : theme.surfaceElevated }]}
                        onPress={handlePostReply}
                        disabled={!replyText.trim()}
                        activeOpacity={0.7}>
                        <Text style={{ color: replyText.trim() ? '#fff' : theme.textMuted, fontWeight: '700', fontSize: 15 }}>Send</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── LIST VIEW ───
    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ title: 'Doubt Marketplace' }} />

            {/* Header */}
            <View style={[styles.headerCard, { backgroundColor: Colors.primary }]}>
                <Text style={styles.headerTitle}>🤝 Doubt Marketplace</Text>
                <Text style={styles.headerSub}>Post doubts, help peers, earn reputation</Text>
            </View>

            {/* Filter Row */}
            <View style={styles.filterRow}>
                {(['all', 'open', 'resolved'] as const).map(f => (
                    <TouchableOpacity key={f}
                        style={[styles.filterBtn, filter === f && { backgroundColor: Colors.primary }]}
                        onPress={() => setFilter(f)} activeOpacity={0.7}>
                        <Text style={[{ fontWeight: '600', fontSize: 13, color: filter === f ? '#fff' : theme.textSecondary }]}>
                            {f === 'all' ? '📋 All' : f === 'open' ? '❓ Open' : '✅ Resolved'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Post Doubt Button */}
            <TouchableOpacity style={[styles.composeBtn, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}
                onPress={() => setShowCompose(!showCompose)} activeOpacity={0.7}>
                <Text style={[{ color: Colors.primary, fontWeight: '700', fontSize: 15 }]}>
                    {showCompose ? '✕ Cancel' : '✍️ Post a Doubt'}
                </Text>
            </TouchableOpacity>

            {/* Compose Form */}
            {showCompose && (
                <View style={[styles.composeForm, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.composeLbl, { color: theme.text }]}>Your Question:</Text>
                    <TextInput
                        style={[styles.composeInput, { borderColor: theme.border, color: theme.text, backgroundColor: isDark ? '#1a1a2e' : '#f8f9fa' }]}
                        value={newQuestion} onChangeText={setNewQuestion}
                        placeholder="Describe your doubt clearly..."
                        placeholderTextColor={theme.textMuted}
                        multiline numberOfLines={3} maxLength={500}
                    />
                    <Text style={[styles.composeLbl, { color: theme.text, marginTop: 8 }]}>Subject:</Text>
                    <View style={styles.subjectRow}>
                        {['Physics', 'Chemistry', 'Mathematics'].map(s => (
                            <TouchableOpacity key={s}
                                style={[styles.subjectChip, { backgroundColor: newSubject === s ? Colors.primary : theme.surfaceElevated }]}
                                onPress={() => setNewSubject(s)}>
                                <Text style={{ color: newSubject === s ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>
                                    {subjectIcon(s)} {s}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={[styles.submitBtn, { backgroundColor: Colors.primary }]}
                        onPress={handlePostDoubt} activeOpacity={0.7}>
                        <Text style={{ color: '#fff', fontWeight: '700' }}>Post Doubt 🚀</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Doubt Cards */}
            {filtered.map(doubt => (
                <TouchableOpacity key={doubt.id}
                    style={[styles.doubtCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                    onPress={() => openDoubtDetail(doubt)} activeOpacity={0.7}>
                    <View style={styles.doubtHeader}>
                        <View style={[styles.subjectTag, { backgroundColor: subjectColor(doubt.subject) + '20' }]}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: subjectColor(doubt.subject) }}>
                                {subjectIcon(doubt.subject)} {doubt.subject}
                            </Text>
                        </View>
                        {doubt.is_resolved && (
                            <View style={[styles.resolvedTag, { backgroundColor: Colors.success + '20' }]}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.success }}>✅ Resolved</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.doubtText, { color: theme.text }]}>{doubt.question_text}</Text>
                    <View style={styles.doubtFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 12 }}>👤</Text>
                            <Text style={[{ color: theme.textMuted, fontSize: 12 }]}>{doubt.posted_by}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Text style={[{ color: Colors.primary, fontSize: 12, fontWeight: '600' }]}>💬 {doubt.answers_count} replies</Text>
                            <Text style={[{ color: theme.textMuted, fontSize: 11 }]}>{timeAgo(doubt.created_at)}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            ))}

            {filtered.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>🤝</Text>
                    <Text style={[{ fontSize: 16, fontWeight: '700', color: theme.text }]}>No Doubts Yet</Text>
                    <Text style={[{ fontSize: 13, color: theme.textSecondary, marginTop: 4, textAlign: 'center' }]}>
                        Be the first to post a doubt!
                    </Text>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    headerCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.md, ...Shadow.lg },
    headerTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginTop: 4 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
    filterBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.full, alignItems: 'center' },
    composeBtn: { paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', marginBottom: Spacing.md },
    composeForm: { padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.md },
    composeLbl: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
    composeInput: { borderWidth: 1.5, borderRadius: BorderRadius.md, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
    subjectRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
    submitBtn: { paddingVertical: 14, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: 8 },
    doubtCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
    doubtHeader: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    subjectTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    resolvedTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    doubtText: { fontSize: FontSize.base, lineHeight: 22, marginBottom: 8 },
    doubtFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    emptyState: { alignItems: 'center', padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1 },
    // Detail view styles
    detailCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadow.md },
    detailQuestion: { fontSize: 17, lineHeight: 26, fontWeight: '500', marginBottom: 12 },
    avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
    emptyReplies: { alignItems: 'center', padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: 12 },
    answerCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: 10, ...Shadow.sm },
    acceptedBadge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
    resolveBtn: { paddingVertical: 12, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: 'center', marginBottom: 12 },
    replyBar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, gap: 8 },
    replyInput: { flex: 1, borderWidth: 1.5, borderRadius: BorderRadius.md, padding: 10, fontSize: 14, maxHeight: 80, textAlignVertical: 'top' },
    sendBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
});
