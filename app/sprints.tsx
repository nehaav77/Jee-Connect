// JEE Connect - Live Sprints & Study Clans Screen (Sprint 7)
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { liveSprintService, LiveSprint, LeaderboardEntry, StudyClan } from '@/src/services/LiveSprintService';
import { useAppStore } from '@/src/store/appStore';

export default function SprintsScreen() {
    const router = useRouter();
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { isOnline, userName } = useAppStore();

    const [sprints, setSprints] = useState<LiveSprint[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [clans, setClans] = useState<StudyClan[]>([]);
    const [selectedSprint, setSelectedSprint] = useState<string | null>(null);
    const [tab, setTab] = useState<'sprints' | 'clans' | 'leaderboard'>('sprints');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [newClanName, setNewClanName] = useState('');
    const [joinInviteCode, setJoinInviteCode] = useState('');

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const s = await liveSprintService.getAvailableSprints();
        setSprints(s);
        const c = await liveSprintService.getStudyClans(userName);
        const ec = await liveSprintService.getExploreClans(userName);
        setClans([...c, ...ec]);
        if (s.length > 0) {
            const lb = await liveSprintService.getLeaderboard(s[0].id);
            setLeaderboard(lb);
            setSelectedSprint(s[0].id);
        }
    }

    function handleJoinSprint(sprint: LiveSprint) {
        router.push(`/sprint/${sprint.id}` as any);
    }

    async function handleCreateClan() {
        if (!newClanName.trim()) return;
        const code = await liveSprintService.createClan(newClanName.trim(), userName);
        if (code) {
            Alert.alert('Clan Created!', `Your Clan Invite Code is:\n\n${code}\n\nShare this code with your friends!`);
            setIsCreateModalOpen(false);
            setNewClanName('');
            loadData();
        }
    }

    async function handleJoinClan() {
        if (!joinInviteCode.trim()) return;
        const success = await liveSprintService.joinClan(joinInviteCode.trim(), userName);
        if (success) {
            Alert.alert('Request Sent', 'Your request to join has been sent to the clan owner. Please wait for approval.');
            setIsJoinModalOpen(false);
            setJoinInviteCode('');
            loadData();
        } else {
            Alert.alert('Error', 'Clan not found. Please check the Invite Code.');
        }
    }

    async function handleExploreJoin(clanId: string) {
        const success = await liveSprintService.joinClan(clanId, userName);
        if (success) {
            Alert.alert('Request Sent', 'Your request to join has been sent to the clan owner.');
            loadData();
        } else {
            Alert.alert('Error', 'Failed to send request.');
        }
    }

    const statusColor = (s: LiveSprint['status']) =>
        s === 'active' ? Colors.success : s === 'waiting' ? Colors.warning : theme.textMuted;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ title: 'Live Sprints' }} />

            {/* Tab Switcher */}
            <View style={styles.tabRow}>
                {(['sprints', 'clans', 'leaderboard'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && { backgroundColor: Colors.primary }]}
                        onPress={() => setTab(t)} activeOpacity={0.7}>
                        <Text style={[styles.tabText, { color: tab === t ? '#fff' : theme.textSecondary }]}>
                            {t === 'sprints' ? '⚡ Sprints' : t === 'clans' ? '👥 Clans' : '🏆 Rankings'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'sprints' && (
                <>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Active & Upcoming</Text>
                    {sprints.map(sprint => (
                        <TouchableOpacity key={sprint.id}
                            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                            onPress={() => handleJoinSprint(sprint)} activeOpacity={0.7}>
                            <View style={styles.cardRow}>
                                <Text style={{ fontSize: 28 }}>{sprint.subject === 'Physics' ? '⚛️' : sprint.subject === 'Chemistry' ? '🧪' : '📐'}</Text>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.cardTitle, { color: theme.text }]}>{sprint.title}</Text>
                                    <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                                        {sprint.num_questions} Qs · {Math.floor(sprint.duration_sec / 60)}min · Practice Only
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <View style={[styles.statusDot, { backgroundColor: Colors.primary + '20' }]}>
                                        <Text style={[{ color: Colors.primary, fontSize: 11, fontWeight: '700' }]}>
                                            PRACTICE
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </>
            )}

            {tab === 'clans' && (
                <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Study Clans</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={{ backgroundColor: theme.surfaceElevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.border }} onPress={() => setIsJoinModalOpen(true)}>
                                <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 13 }}>Use Code</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }} onPress={() => setIsCreateModalOpen(true)}>
                                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>+ Create Clan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Create Clan Modal UI simulation (inline for simplicity) */}
                    {isCreateModalOpen && (
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: Colors.primary, marginBottom: 20 }]}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Create a New Clan</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ flex: 1, backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border, padding: 8 }}>
                                    <React.Fragment>
                                        <TextInput 
                                            placeholder="Enter Clan Name" 
                                            placeholderTextColor={theme.textMuted}
                                            value={newClanName} 
                                            onChangeText={setNewClanName} 
                                            style={{ color: theme.text, width: '100%' }}
                                        />
                                    </React.Fragment>
                                </View>
                                <TouchableOpacity style={{ backgroundColor: Colors.primary, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 }} onPress={handleCreateClan}>
                                    <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ backgroundColor: Colors.error + '20', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 }} onPress={() => setIsCreateModalOpen(false)}>
                                    <Text style={{ color: Colors.error, fontWeight: '700' }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Join Clan Modal UI simulation */}
                    {isJoinModalOpen && (
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: Colors.primary, marginBottom: 20 }]}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 8 }}>Join a Clan</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ flex: 1, backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border, padding: 8 }}>
                                    <React.Fragment>
                                        <TextInput 
                                            placeholder="Enter Invite Code (e.g. clan-XXX)" 
                                            placeholderTextColor={theme.textMuted}
                                            value={joinInviteCode} 
                                            onChangeText={setJoinInviteCode} 
                                            style={{ color: theme.text, width: '100%' }}
                                        />
                                    </React.Fragment>
                                </View>
                                <TouchableOpacity style={{ backgroundColor: Colors.primary, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 }} onPress={handleJoinClan}>
                                    <Text style={{ color: '#fff', fontWeight: '700' }}>Join</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ backgroundColor: Colors.error + '20', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 8 }} onPress={() => setIsJoinModalOpen(false)}>
                                    <Text style={{ color: Colors.error, fontWeight: '700' }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {clans.length === 0 ? (
                        <View style={{ alignItems: 'center', padding: Spacing.xl, opacity: 0.7 }}>
                            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏕️</Text>
                            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16 }}>No clans available.</Text>
                            <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>Create a clan to get started!</Text>
                        </View>
                    ) : (
                        clans.map((clan, idx) => {
                            const isPending = clan.membership_status === 'pending';
                            const isNone = clan.membership_status === 'none';
                            const isMine = !isPending && !isNone;
                            return (
                                <TouchableOpacity key={clan.id}
                                    style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder, opacity: isPending ? 0.7 : 1 }]}
                                    onPress={() => {
                                        if (isPending) {
                                            Alert.alert('Pending Approval', 'You must wait for the clan owner to accept your request.');
                                        } else if (isMine) {
                                            router.push(`/clan/${clan.id}` as any);
                                        }
                                    }} activeOpacity={isNone ? 1 : 0.7}>
                                    <View style={styles.cardRow}>
                                        <Text style={{ fontSize: 28, marginHorizontal: 12 }}>{clan.icon}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.cardTitle, { color: theme.text }]}>{clan.name}</Text>
                                            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                                                👥 {clan.member_count} members
                                            </Text>
                                        </View>
                                        {isPending && (
                                            <View style={[styles.statusDot, { backgroundColor: Colors.warning + '20', alignSelf: 'center' }]}>
                                                <Text style={{ color: Colors.warning, fontSize: 11, fontWeight: '700' }}>PENDING</Text>
                                            </View>
                                        )}
                                        {isMine && (
                                            <View style={[styles.statusDot, { backgroundColor: Colors.success + '20', alignSelf: 'center' }]}>
                                                <Text style={{ color: Colors.success, fontSize: 11, fontWeight: '700' }}>OPEN</Text>
                                            </View>
                                        )}
                                        {isNone && (
                                            <TouchableOpacity 
                                                style={{ backgroundColor: Colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'center' }}
                                                onPress={() => handleExploreJoin(clan.id)}>
                                                <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 12 }}>Join Request</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </>
            )}

            {tab === 'leaderboard' && (
                <>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>National Rankings</Text>
                    {leaderboard.length === 0 ? (
                        <View style={{ alignItems: 'center', padding: Spacing.xl, opacity: 0.7 }}>
                            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏆</Text>
                            <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16 }}>No rankings yet.</Text>
                            <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>Complete a live sprint to be the first one on the board!</Text>
                        </View>
                    ) : (
                        leaderboard.map((entry, idx) => (
                            <View key={entry.id}
                                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                                <View style={styles.cardRow}>
                                    <View style={[styles.rankCircle, { backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : theme.surfaceElevated }]}>
                                        <Text style={{ fontWeight: '800', color: idx < 3 ? '#000' : theme.text }}>#{entry.rank}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={[styles.cardTitle, { color: theme.text }]}>{entry.user_name}</Text>
                                        {entry.clan_name ? (
                                            <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '700', marginTop: 1 }}>
                                                👥 {entry.clan_name}
                                            </Text>
                                        ) : null}
                                        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                                            🎯 {entry.accuracy}% accuracy · ⏱ {Math.floor(entry.time_taken_sec / 60)}m {entry.time_taken_sec % 60}s
                                        </Text>
                                    </View>
                                    <View style={[styles.scoreBox, { backgroundColor: Colors.primary + '15' }]}>
                                        <Text style={[{ color: Colors.primary, fontWeight: '800', fontSize: 18 }]}>{entry.score}</Text>
                                        <Text style={[{ color: Colors.primary, fontSize: 10, fontWeight: '600' }]}>pts</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.full, marginBottom: Spacing.md },
    statusText: { fontSize: FontSize.sm, fontWeight: '600' },
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.full, alignItems: 'center' },
    tabText: { fontWeight: '700', fontSize: FontSize.sm },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
    actionBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', flex: 1 },
    card: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadow.sm },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    cardTitle: { fontSize: FontSize.base, fontWeight: '700' },
    cardMeta: { fontSize: FontSize.xs, marginTop: 2 },
    statusDot: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
    rankCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    scoreBox: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.md },
});
