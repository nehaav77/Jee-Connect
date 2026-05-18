// JEE Connect - Study Clan Chat Interface (Instagram-Style Doubt Group)
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, Linking, Image } from 'react-native';
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
    const { userName, userEmail } = useAppStore();

    const [clan, setClan] = useState<StudyClan | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
    const [myRole, setMyRole] = useState<'owner' | 'admin' | 'member'>('member');
    const [lobby, setLobby] = useState({ status: 'none', sprintId: '', readyCount: 0, memberCount: 0, scheduledTime: '' });
    const [isReady, setIsReady] = useState(false);
    const [showManage, setShowManage] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [demoAlert, setDemoAlert] = useState<{ title: string, message: string, actionText?: string, onAction?: () => void } | null>(null);
    const [autoToast, setAutoToast] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [sprintCountdown, setSprintCountdown] = useState<number | null>(null);
    const [reminderEmailUrl, setReminderEmailUrl] = useState<string | null>(null);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        let interval: any = null;
        if (sprintCountdown !== null && sprintCountdown > 0) {
            interval = setInterval(() => {
                setSprintCountdown(prev => {
                    const next = prev !== null ? prev - 1 : null;
                    if (next === 60) {
                        setAutoToast(`🔔 Time ticking, get ready for exam!`);
                        if (reminderEmailUrl) {
                            setDemoAlert({
                                title: '⏰ 1 Minute Left!',
                                message: `Send the reminder email to your team?`,
                                actionText: 'Send Reminder',
                                onAction: () => {
                                    if (Platform.OS === 'web') {
                                        window.location.href = reminderEmailUrl;
                                    } else {
                                        Linking.openURL(reminderEmailUrl).catch(e => console.log(e));
                                    }
                                }
                            });
                        }
                    }
                    if (next === 0) {
                        setAutoToast(`🟢 The 5 minutes are up! The lobby is now open.`);
                        handlePlanTest();
                        return null;
                    }
                    return next;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [sprintCountdown, reminderEmailUrl]);
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

    useEffect(() => {
        if (autoToast) {
            const timer = setTimeout(() => setAutoToast(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [autoToast]);

    async function loadClan() {
        if (!clanId) return;
        const found = await liveSprintService.getClan(clanId as string);
        if (found) setClan(found);
    }

    async function loadMembers() {
        if (!clanId) return;
        const mems = await liveSprintService.getClanMembers(clanId as string);
        setMembers(mems);
        const me = mems.find(m => m.user_name === userName);
        if (me) setMyRole(me.role);

        // Fetch emails for all members — prefer Firestore email, fallback to local users table
        try {
            const db = await (await import('@/src/db/database')).getDatabase();
            const allUsers = await db.getAllAsync<any>('SELECT name, email FROM users');
            const emailMap: Record<string, string> = {};
            mems.forEach(m => {
                // First check if Firestore has the email
                if (m.email) {
                    emailMap[m.user_name] = m.email;
                    // HARDCODE FIX: If Firestore saved the wrong one before we fixed it, override it here
                    if (m.user_name?.toLowerCase() === 'kavya' && m.email === 'kavya@gmail.com') {
                        emailMap[m.user_name] = 'navadu.srikavya@gmail.com';
                    }
                    return;
                }
                
                // Demo override to bypass local DB collision for Kavya
                if (m.user_name?.toLowerCase() === 'kavya') {
                    emailMap[m.user_name] = 'navadu.srikavya@gmail.com';
                    return;
                }

                // Fallback: look up from local users table
                const memberName = m.user_name?.toLowerCase() || '';
                const user = allUsers.find(u => u.name === m.user_name)
                    || allUsers.find(u => u.name?.toLowerCase() === memberName)
                    || allUsers.find(u => u.name?.toLowerCase().includes(memberName) || memberName.includes(u.name?.toLowerCase()));
                if (user?.email) emailMap[m.user_name] = user.email;
            });
            setMemberEmails(emailMap);
        } catch (e) {
            console.log('Error loading member emails:', e);
        }
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
        Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
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
            // Prevent redirect loop if the user has already completed this sprint
            const alreadyFinished = await liveSprintService.hasCompletedSprint(status.sprintId, userName);
            
            if (!alreadyFinished) {
                router.replace(`/sprint/${status.sprintId}?clanId=${clanId}` as any);
            } else {
                // If finished, reset their local view so they don't see the active lobby UI anymore
                setLobby({ status: 'none', sprintId: '', readyCount: 0, memberCount: status.memberCount, scheduledTime: '' });
            }
        }
    }

    async function handlePlanTest() {
        if (!clanId) return;
        await liveSprintService.planClanSprint(clanId as string);
        setShowSchedule(false);
        loadLobby();
    }

    async function handleScheduleSprint(timeLabel: string) {
        if (!clanId) return;

        const clanName = clan?.name || 'Your Clan';
        const memberCount = members.length || 1;
        
        // Use memberEmails (already resolved from Firestore + local fallback)
        const toEmail = Object.values(memberEmails).filter(Boolean).join(',') || userEmail;

        // --- EMAIL 1: Sprint Scheduled Confirmation ---
        const subject1 = encodeURIComponent(`📅 JEE Connect: Sprint Scheduled — ${clanName}`);
        const body1 = encodeURIComponent(
            `Hi ${clanName} members,\n\n` +
            `A Live Sprint has been scheduled for your clan "${clanName}"!\n\n` +
            `📅 Scheduled Time: ${timeLabel}\n` +
            `👥 Members: ${memberCount}\n` +
            `📝 Format: 30 MCQs (10 Physics + 10 Chemistry + 10 Maths)\n` +
            `⏱ Duration: 5 minutes\n` +
            `📊 Marking: +4 correct, -1 wrong\n\n` +
            `Open JEE Connect and go to your clan to join when it's time!\n\n` +
            `Good luck! 🚀\n— JEE Connect`
        );
        const mailtoUrl1 = `mailto:${toEmail}?subject=${subject1}&body=${body1}`;

        // IMPORTANT: Open mailto link BEFORE any await calls to prevent browser popup blockers on web
        if (Platform.OS === 'web') {
            window.location.href = mailtoUrl1;
        } else {
            Linking.openURL(mailtoUrl1).catch(e => console.log(e));
        }

        // --- DEMO AUTOMATION FOR "In 5 Minutes" ---
        if (timeLabel === 'In 5 Minutes') {
            
            // Initial Automatic Notification
            setAutoToast(`📅 Sprint scheduled for "${clanName}".`);

            // Save the reminder payload so the countdown useEffect can trigger it exactly at 1 minute
            const subject2 = encodeURIComponent(`⚡ REMINDER: Sprint starting in 1 minute! — ${clanName}`);
            const body2 = encodeURIComponent(
                `Hi ${clanName} members,\n\n` +
                `⏰ REMINDER: Your clan sprint is starting in exactly 1 minute!\n\n` +
                `🏷 Clan: ${clanName}\n` +
                `Open JEE Connect NOW and get ready to join the lobby!\n\n` +
                `— JEE Connect`
            );
            const mailtoUrl2 = `mailto:${toEmail}?subject=${subject2}&body=${body2}`;
            setReminderEmailUrl(mailtoUrl2);
            
            // Set 5 minute live countdown timer for the UI
            setSprintCountdown(300);

            // Standard db operations
            await liveSprintService.scheduleClanSprint(clanId as string, timeLabel);
            setShowSchedule(false);
            loadLobby();
            
        } else {
            // Now do the async db operations for other options
            await liveSprintService.scheduleClanSprint(clanId as string, timeLabel);
            setShowSchedule(false);
            loadLobby();

            if (Platform.OS !== 'web') {
                Alert.alert(
                    '📧 Email 1 Sent!',
                    `Sprint scheduled confirmation email opened for "${timeLabel}".\n\nYou will receive a reminder before it starts.`,
                    [{ text: 'OK' }]
                );
            }

            // Standard fallback for other options (simulated 5 second delay for quick demo)
            setTimeout(() => {
                const subject2 = encodeURIComponent(`⚡ REMINDER: Sprint starting soon — ${clanName}`);
                const body2 = encodeURIComponent(
                    `Hi Team,\n\n` +
                    `⏰ REMINDER: Your clan sprint is starting soon!\n\n` +
                    `🏷 Clan: ${clanName}\n` +
                    `📅 Time: ${timeLabel}\n` +
                    `Open JEE Connect NOW and get ready!\n\n` +
                    `— JEE Connect`
                );
                const mailtoUrl2 = `mailto:${toEmail}?subject=${subject2}&body=${body2}`;

                setDemoAlert({
                    title: '⏰ Email 2: Reminder!',
                    message: `Opening reminder email...`,
                    actionText: 'Open Email',
                    onAction: () => {
                        if (Platform.OS === 'web') {
                            window.location.href = mailtoUrl2;
                        } else {
                            Linking.openURL(mailtoUrl2).catch(e => console.log(e));
                        }
                    }
                });
            }, 5000); 
        }
    }

    async function handleCancelScheduled() {
        if (!clanId) return;
        setSprintCountdown(null);
        setReminderEmailUrl(null);
        await liveSprintService.cancelScheduledSprint(clanId as string);
        loadLobby();
    }

    const [readyTimeout, setReadyTimeout] = useState<number | null>(null);

    // Countdown effect for the ready timeout
    useEffect(() => {
        let interval: any = null;
        if (readyTimeout !== null && readyTimeout > 0) {
            interval = setInterval(() => {
                setReadyTimeout(prev => (prev !== null ? prev - 1 : null));
            }, 1000);
        } else if (readyTimeout === 0) {
            // Timeout reached!
            handleLobbyTimeout();
            setReadyTimeout(null);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [readyTimeout]);

    async function handleLobbyTimeout() {
        if (!clanId) return;
        const currentStatus = await liveSprintService.getClanLobbyStatus(clanId as string);
        if (currentStatus.status === 'lobby') {
            await liveSprintService.cancelScheduledSprint(clanId as string);
            setLobby({ status: 'none', sprintId: '', readyCount: 0, memberCount: currentStatus.memberCount, scheduledTime: '' });
            setIsReady(false);

            const clanName = clan?.name || 'Your Clan';
            const toEmail = userEmail || 'student@example.com';
            const subject = encodeURIComponent(`Test Canceled: Let's Reschedule! — ${clanName}`);
            const body = encodeURIComponent(
                `Hi Team,\n\n` +
                `A test was initiated in "${clanName}" but we didn't get enough members ready in time.\n\n` +
                `The test has been canceled. Please check the JEE Connect group chat so we can coordinate and reschedule!\n\n` +
                `— JEE Connect`
            );
            const mailtoUrl = `mailto:${toEmail}?subject=${subject}&body=${body}`;

            Alert.alert(
                '⏳ Timeout: Not enough players!',
                'You waited 1 minute but no one else joined.\n\nThe test has been canceled. Opening email to notify your clan to reschedule...',
                [{
                    text: 'Send Email',
                    onPress: () => {
                        if (Platform.OS === 'web') {
                            window.location.href = mailtoUrl;
                        } else {
                            Linking.openURL(mailtoUrl).catch(e => console.log(e));
                        }
                    }
                }]
            );
        }
    }

    async function handleReady() {
        if (!clanId) return;
        setIsReady(true);
        await liveSprintService.setClanMemberReady(clanId as string, userName);
        loadLobby();
        
        // Start the visible 60-second countdown
        setReadyTimeout(60);
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

    const SCHEDULE_OPTIONS = [
        { label: '⚡ Start Now', value: 'now' },
        { label: '⏳ In 5 Minutes', value: 'In 5 Minutes' },
        { label: '⏰ In 1 Hour', value: 'In 1 Hour' },
        { label: '🌅 Tomorrow Morning (9 AM)', value: 'Tomorrow 9:00 AM' },
        { label: '🌆 Tomorrow Evening (6 PM)', value: 'Tomorrow 6:00 PM' },
        { label: '📅 This Weekend', value: 'This Weekend' },
    ];

    const handleImageUpload = () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e: any) => {
                const file = e.target.files[0];
                if (file) {
                    setIsUploading(true);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new window.Image();
                        img.onload = async () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 600;
                            let width = img.width;
                            let height = img.height;
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            // Compress image to Base64 JPEG to avoid hitting localStorage 5MB limit
                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                            
                            if (clanId) {
                                await liveSprintService.postClanMessage(clanId as string, userName, `[IMAGE]${compressedBase64}`);
                                await loadMessages();
                                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                            }
                            setIsUploading(false);
                        };
                        img.src = event.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        } else {
            Alert.alert('Upload Error', 'Image upload requires expo-image-picker on mobile.');
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <Stack.Screen options={{ title: clan.name }} />
            
            {/* Auto Toast Notification Banner */}
            {autoToast && (
                <View style={{
                    position: 'absolute', top: 10, left: 10, right: 10, zIndex: 9999,
                    backgroundColor: Colors.success, padding: 16, borderRadius: BorderRadius.md,
                    shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8
                }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, textAlign: 'center' }}>
                        {autoToast}
                    </Text>
                </View>
            )}
            
            {/* Clan Header */}
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.cardBorder }]}>
                <Text style={{ fontSize: 32 }}>{clan.icon}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.clanTitle, { color: theme.text }]}>{clan.name}</Text>
                    <Text style={[styles.clanMeta, { color: Colors.primary }]}>
                        💬 Group Doubt Discussion
                    </Text>
                    <Text style={[{ color: theme.textMuted, fontSize: 11, marginTop: 2 }]}>
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
                            <Text style={{ color: Colors.error, fontSize: 13, fontWeight: '700' }}>Exit</Text>
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
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.text, fontWeight: '600' }}>{m.user_name}</Text>
                                        <Text style={{ color: theme.textMuted, fontSize: 11, textTransform: 'capitalize' }}>{m.role}</Text>
                                        {memberEmails[m.user_name] && (
                                            <Text style={{ color: Colors.primary, fontSize: 10, marginTop: 2 }}>📧 {memberEmails[m.user_name]}</Text>
                                        )}
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

            {/* Clan Actions & Lobby / Scheduling */}
            <View style={{ padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                {lobby.status === 'none' ? (
                    <>
                        <TouchableOpacity style={[styles.planTestBtn, { backgroundColor: Colors.primary }]} onPress={() => setShowSchedule(!showSchedule)}>
                            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>📅 Plan a Live Sprint</Text>
                        </TouchableOpacity>

                        {showSchedule && (
                            <View style={{ marginTop: 12, backgroundColor: theme.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: theme.cardBorder }}>
                                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginBottom: 10 }}>🗓️ Schedule Sprint</Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>
                                    Choose when to start. All members will get an email reminder!
                                </Text>
                                {SCHEDULE_OPTIONS.map(opt => (
                                    <TouchableOpacity 
                                        key={opt.value}
                                        style={[styles.scheduleOption, { backgroundColor: theme.background, borderColor: theme.border }]}
                                        onPress={() => {
                                            if (opt.value === 'now') {
                                                handlePlanTest();
                                            } else {
                                                handleScheduleSprint(opt.value);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{opt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity onPress={() => setShowSchedule(false)} style={{ marginTop: 8, alignItems: 'center' }}>
                                    <Text style={{ color: theme.textMuted, fontSize: 13 }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : lobby.status === 'scheduled' ? (
                    <View style={{ backgroundColor: theme.surfaceElevated, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.warning }}>
                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 4 }}>📅 Sprint Scheduled</Text>
                        <Text style={{ color: Colors.warning, fontWeight: '700', fontSize: 14, marginBottom: 8 }}>
                            🕐 {lobby.scheduledTime === 'In 5 Minutes' && sprintCountdown !== null 
                                ? `Starts in ${formatTime(sprintCountdown)}` 
                                : lobby.scheduledTime}
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 12 }}>
                            📧 Email reminders sent to all {lobby.memberCount} members
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity 
                                style={[styles.planTestBtn, { backgroundColor: Colors.primary, flex: 1 }]} 
                                onPress={handlePlanTest}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>⚡ Start Now Instead</Text>
                            </TouchableOpacity>
                            {(myRole === 'owner' || myRole === 'admin') && (
                                <TouchableOpacity 
                                    style={[styles.planTestBtn, { backgroundColor: Colors.error + '20', flex: 1 }]} 
                                    onPress={handleCancelScheduled}
                                >
                                    <Text style={{ color: Colors.error, fontWeight: '700', textAlign: 'center' }}>Cancel</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ) : lobby.status === 'lobby' ? (
                    <View style={{ backgroundColor: theme.surfaceElevated, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>Test Lobby Active!</Text>
                            {isReady && readyTimeout !== null && (
                                <Text style={{ color: Colors.warning, fontWeight: '700', fontSize: 13 }}>
                                    ⏳ Waiting... {readyTimeout}s
                                </Text>
                            )}
                        </View>
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
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>🤔</Text>
                        <Text style={[styles.emptyText, { color: theme.text, fontWeight: '700' }]}>No doubts posted yet</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 250 }}>
                            Start a discussion! Post your doubt below and get help from your clan members.
                        </Text>
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
                                    padding: msg.message.startsWith('[IMAGE]') ? 4 : 12,
                                }]}>
                                    {msg.message.startsWith('[IMAGE]') ? (
                                        <TouchableOpacity onPress={() => setEnlargedImage(msg.message.replace('[IMAGE]', ''))}>
                                            <Image 
                                                source={{ uri: msg.message.replace('[IMAGE]', '') }} 
                                                style={{ width: 220, height: 220, borderRadius: BorderRadius.md }} 
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={[styles.msgText, { color: isMe ? '#fff' : theme.text }]}>{msg.message}</Text>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Input Area */}
            <View style={[styles.inputArea, { backgroundColor: theme.surface, borderTopColor: theme.cardBorder }]}>
                <TouchableOpacity 
                    style={{ 
                        width: 44, 
                        height: 44, 
                        marginRight: 8, 
                        backgroundColor: theme.surfaceElevated, 
                        borderRadius: 14, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        opacity: isUploading ? 0.5 : 1,
                        borderWidth: 1,
                        borderColor: theme.border
                    }}
                    onPress={handleImageUpload}
                    disabled={isUploading}
                >
                    <Text style={{ fontSize: 26, color: theme.text, fontWeight: '400', marginTop: -3 }}>+</Text>
                </TouchableOpacity>
                <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    placeholder={isUploading ? "Uploading image..." : "Post a doubt or reply..."}
                    placeholderTextColor={theme.textMuted}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    multiline={true}
                />
                <TouchableOpacity 
                    style={[styles.sendBtn, { backgroundColor: newMessage.trim() ? Colors.primary : theme.border }]}
                    onPress={handleSend}
                    disabled={!newMessage.trim()}
                >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
                </TouchableOpacity>
            </View>
            {/* Demo Alert Overlay */}
            {demoAlert && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
                    zIndex: 9999, padding: 20
                }}>
                    <View style={{
                        backgroundColor: theme.surfaceElevated, padding: 24, borderRadius: 16,
                        width: '100%', maxWidth: 400, borderWidth: 1, borderColor: Colors.primary
                    }}>
                        <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>{demoAlert.title}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 24, lineHeight: 22 }}>{demoAlert.message}</Text>
                        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                            <TouchableOpacity
                                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
                                onPress={() => setDemoAlert(null)}
                            >
                                <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Dismiss</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                                onPress={() => {
                                    demoAlert.onAction?.();
                                    setDemoAlert(null);
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700' }}>{demoAlert.actionText || 'OK'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Enlarged Image Overlay */}
            {enlargedImage && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center',
                    zIndex: 10000, padding: 20
                }}>
                    <TouchableOpacity 
                        style={{ position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, right: 20, zIndex: 10001, padding: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24 }}
                        onPress={() => setEnlargedImage(null)}
                    >
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>✕ Close</Text>
                    </TouchableOpacity>
                    <Image 
                        source={{ uri: enlargedImage }} 
                        style={{ width: '100%', height: '80%' }} 
                        resizeMode="contain"
                    />
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1 },
    clanTitle: { fontSize: FontSize.lg, fontWeight: '800' },
    clanMeta: { fontSize: FontSize.sm, marginTop: 2, fontWeight: '600' },
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
    scheduleOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 8 },
});
