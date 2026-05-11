// JEE Connect - Study Clan Chat Interface
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { liveSprintService, StudyClan } from '@/src/services/LiveSprintService';
import { useAppStore } from '@/src/store/appStore';

export default function ClanChatScreen() {
    const { clanId } = useLocalSearchParams<{ clanId: string }>();
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { userName } = useAppStore();

    const [clan, setClan] = useState<StudyClan | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [myRole, setMyRole] = useState<'owner' | 'admin' | 'member'>('member');
    const [lobby, setLobby] = useState({ status: 'none', sprintId: '', readyCount: 0, memberCount: 0 });
    const [isReady, setIsReady] = useState(false);
    const [showManage, setShowManage] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const router = useRouter();

    useEffect(() => {
        loadClan();
        loadMessages();
        loadRequests();
        loadMembers();
        loadLobby();
        
        // Polling for live updates (messages, requests, lobby)
        const interval = setInterval(() => {
            loadMessages();
            loadRequests();
            loadMembers();
            loadLobby();
        }, 3000);
        return () => clearInterval(interval);
    }, [clanId]);

    async function loadClan() {
        // Because of our local mock limitations, we need to fetch all clans
        const db = await (await import('@/src/db/database')).getDatabase();
        const found = await db.getFirstAsync<StudyClan>('SELECT * FROM study_clans WHERE id = ?', [clanId]);
        if (found) setClan(found);
    }

    async function loadMembers() {
        if (!clanId) return;
        const mems = await liveSprintService.getClanMembers(clanId as string);
        setMembers(mems);
        const me = mems.find(m => m.user_name === userName);
        if (me) setMyRole(me.role);
    }

    async function loadRequests() {
        if (!clanId) return;
        const reqs = await liveSprintService.getPendingRequests(clanId as string);
        setRequests(reqs);
    }

    async function handleAcceptRequest(requestId: string) {
        if (!clanId) return;
        await liveSprintService.acceptJoinRequest(requestId, clanId as string, userName);
        loadRequests();
        loadClan(); // Refresh member count
        loadMembers();
    }

    async function handleRemoveMember(targetUser: string) {
        if (!clanId) return;
        await liveSprintService.removeClanMember(clanId as string, targetUser);
        loadMembers();
        loadClan();
    }

    async function handleMakeAdmin(targetUser: string) {
        if (!clanId) return;
        await liveSprintService.promoteClanAdmin(clanId as string, targetUser);
        loadMembers();
    }

    async function handleDeleteClan() {
        if (!clanId) return;
        Alert.alert("Delete Clan", "Are you sure you want to permanently delete this clan?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                await liveSprintService.deleteClan(clanId as string);
                router.replace('/sprints');
            }}
        ]);
    }

    async function handleLeaveClan() {
        if (!clanId) return;
        Alert.alert("Leave Clan", "Are you sure you want to leave this clan?", [
            { text: "Cancel", style: "cancel" },
            { text: "Leave", style: "destructive", onPress: async () => {
                await liveSprintService.removeClanMember(clanId as string, userName);
                router.replace('/sprints');
            }}
        ]);
    }

    async function loadLobby() {
        if (!clanId) return;
        const status = await liveSprintService.getClanLobbyStatus(clanId as string);
        setLobby(status);

        if (status.status === 'active' && status.sprintId) {
            router.replace(`/sprint/${status.sprintId}` as any);
        }
    }

    async function handlePlanTest() {
        if (!clanId) return;
        await liveSprintService.planClanSprint(clanId as string);
        loadLobby();
    }

    async function handleReady() {
        if (!clanId) return;
        setIsReady(true);
        await liveSprintService.setClanMemberReady(clanId as string, userName);
        loadLobby();
    }

    async function loadMessages() {
        if (!clanId) return;
        const msgs = await liveSprintService.getClanMessages(clanId as string);
        setMessages(msgs);
    }

    async function handleSend() {
        if (!newMessage.trim() || !clanId) return;
        await liveSprintService.postClanMessage(clanId as string, userName, newMessage.trim());
        setNewMessage('');
        await loadMessages();
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }

    if (!clan) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: theme.textMuted }}>Loading clan...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <Stack.Screen options={{ title: clan.name }} />
            
            {/* Clan Header */}
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
                <Text style={{ fontSize: 32 }}>{clan.icon}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.clanTitle, { color: theme.text }]}>{clan.name}</Text>
                    <Text style={[styles.clanMeta, { color: theme.textSecondary }]}>
                        👥 {clan.member_count} members · 👑 {clan.owner_name === userName ? 'You' : clan.owner_name}
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(myRole === 'owner' || myRole === 'admin') && (
                        <TouchableOpacity onPress={() => setShowManage(!showManage)} style={{ backgroundColor: theme.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>Manage</Text>
                        </TouchableOpacity>
                    )}
                    {myRole !== 'owner' && (
                        <TouchableOpacity onPress={handleLeaveClan} style={{ backgroundColor: Colors.error + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                            <Text style={{ color: Colors.error, fontSize: 13, fontWeight: '700' }}>Leave</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Manage Section (Owner / Admin Only) */}
            {showManage && (myRole === 'owner' || myRole === 'admin') && (
                <View style={{ padding: Spacing.md, backgroundColor: theme.surfaceElevated, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, maxHeight: 300 }}>
                    
                    {/* Delete Clan */}
                    {myRole === 'owner' && (
                        <TouchableOpacity onPress={handleDeleteClan} style={{ backgroundColor: Colors.error + '20', padding: 8, borderRadius: 8, marginBottom: 12, alignItems: 'center' }}>
                            <Text style={{ color: Colors.error, fontWeight: '700' }}>Delete Entire Clan</Text>
                        </TouchableOpacity>
                    )}

                    {/* Join Requests */}
                    <Text style={{ color: theme.text, fontWeight: '700', marginBottom: 8 }}>Pending Requests ({requests.length})</Text>
                    {requests.length === 0 ? (
                        <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>No pending join requests.</Text>
                    ) : (
                        <View style={{ gap: 8, marginBottom: 16 }}>
                            {requests.map(req => (
                                <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.background, padding: 8, borderRadius: 8 }}>
                                    <Text style={{ color: theme.text }}>{req.user_name}</Text>
                                    <TouchableOpacity onPress={() => handleAcceptRequest(req.id)} style={{ backgroundColor: Colors.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Accept</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Member List */}
                    <Text style={{ color: theme.text, fontWeight: '700', marginBottom: 8 }}>Members</Text>
                    <ScrollView nestedScrollEnabled style={{ flexGrow: 0, maxHeight: 150 }}>
                        <View style={{ gap: 8 }}>
                            {members.map(m => (
                                <View key={m.user_name} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.background, padding: 8, borderRadius: 8 }}>
                                    <View>
                                        <Text style={{ color: theme.text, fontWeight: '600' }}>{m.user_name}</Text>
                                        <Text style={{ color: theme.textMuted, fontSize: 11, textTransform: 'capitalize' }}>{m.role}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        {myRole === 'owner' && m.role === 'member' && m.user_name !== userName && (
                                            <TouchableOpacity onPress={() => handleMakeAdmin(m.user_name)} style={{ backgroundColor: Colors.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                                <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: '600' }}>Make Admin</Text>
                                            </TouchableOpacity>
                                        )}
                                        {(myRole === 'owner' || (myRole === 'admin' && m.role === 'member')) && m.user_name !== userName && (
                                            <TouchableOpacity onPress={() => handleRemoveMember(m.user_name)} style={{ backgroundColor: Colors.error + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                                <Text style={{ color: Colors.error, fontSize: 11, fontWeight: '600' }}>Remove</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Clan Actions & Lobby */}
            <View style={{ padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                {lobby.status === 'none' ? (
                    <TouchableOpacity style={[styles.planTestBtn, { backgroundColor: Colors.primary }]} onPress={handlePlanTest}>
                        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>⚡ Plan a Live Test</Text>
                    </TouchableOpacity>
                ) : lobby.status === 'lobby' ? (
                    <View style={{ backgroundColor: theme.surfaceElevated, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary }}>
                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 8 }}>Test Lobby Active!</Text>
                        <Text style={{ color: theme.textSecondary, marginBottom: 12 }}>
                            {lobby.readyCount}/{lobby.memberCount} ready · Needs at least 2 to start
                        </Text>
                        <TouchableOpacity 
                            style={[styles.planTestBtn, { backgroundColor: isReady ? Colors.success : Colors.primary }]} 
                            onPress={handleReady}
                            disabled={isReady}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                                {isReady ? '✅ You are Ready' : 'Click to Ready Up'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </View>

            {/* Chat Area */}
            <ScrollView 
                ref={scrollViewRef}
                style={styles.chatArea} 
                contentContainerStyle={styles.chatContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Say hi to your clan!</Text>
                    </View>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_name === userName;
                        return (
                            <View key={msg.id} style={[styles.msgWrapper, isMe ? styles.msgRight : styles.msgLeft]}>
                                {!isMe && <Text style={[styles.msgAuthor, { color: theme.textSecondary }]}>{msg.user_name}</Text>}
                                <View style={[styles.msgBubble, { 
                                    backgroundColor: isMe ? Colors.primary : theme.surfaceElevated,
                                    borderBottomRightRadius: isMe ? 0 : BorderRadius.lg,
                                    borderBottomLeftRadius: isMe ? BorderRadius.lg : 0,
                                }]}>
                                    <Text style={[styles.msgText, { color: isMe ? '#fff' : theme.text }]}>{msg.message}</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputArea, { backgroundColor: theme.surface, borderTopColor: theme.cardBorder }]}>
                <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.textMuted}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                />
                <TouchableOpacity 
                    style={[styles.sendBtn, { backgroundColor: newMessage.trim() ? Colors.primary : theme.border }]}
                    onPress={handleSend}
                    disabled={!newMessage.trim()}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1 },
    clanTitle: { fontSize: FontSize.lg, fontWeight: '800' },
    clanMeta: { fontSize: FontSize.sm, marginTop: 4 },
    chatArea: { flex: 1 },
    chatContent: { padding: Spacing.md, gap: Spacing.md },
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: FontSize.base, fontWeight: '500' },
    msgWrapper: { maxWidth: '80%' },
    msgRight: { alignSelf: 'flex-end' },
    msgLeft: { alignSelf: 'flex-start' },
    msgAuthor: { fontSize: 10, fontWeight: '600', marginBottom: 4, marginLeft: 4 },
    msgBubble: { padding: 12, borderRadius: BorderRadius.lg },
    msgText: { fontSize: FontSize.base },
    inputArea: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, borderTopWidth: 1 },
    input: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: 16, paddingVertical: 10, fontSize: FontSize.base },
    sendBtn: { marginLeft: Spacing.sm, paddingHorizontal: 20, paddingVertical: 12, borderRadius: BorderRadius.full, justifyContent: 'center' },
    planTestBtn: { padding: 12, borderRadius: BorderRadius.md },
});
