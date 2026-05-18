// JEE Connect - Live Sprint Service
// Sprint 7: WebSocket-based live speed tests, leaderboards, and study clans

import { getDatabase } from '../db/database';
import { generateId } from '../repositories/BaseRepository';
import { firestoreDb } from '../db/firebaseConfig';
import { collection, query, where, getDocs, setDoc, doc, updateDoc, arrayUnion, getDoc, deleteDoc } from 'firebase/firestore';

export interface LiveSprint {
    id: string;
    title: string;
    subject: string;
    num_questions: number;
    duration_sec: number;
    status: 'waiting' | 'active' | 'completed';
    participants: number;
    max_participants: number;
    created_at: string;
}

export interface LeaderboardEntry {
    id: string;
    user_name: string;
    score: number;
    accuracy: number;
    time_taken_sec: number;
    rank: number;
    sprint_id: string;
    clan_name?: string;
}

export interface StudyClan {
    id: string;
    name: string;
    icon: string;
    owner_name?: string;
    member_count: number;
    weekly_score: number;
    rank: number;
    membership_status?: 'owner' | 'member' | 'admin' | 'pending' | 'none';
    planned_sprint_id?: string;
}

export interface DoubtPost {
    id: string;
    question_text: string;
    subject: string;
    chapter: string;
    posted_by: string;
    answers_count: number;
    is_resolved: boolean;
    created_at: string;
    image_uri?: string;
}

export interface DoubtAnswer {
    id: string;
    doubt_id: string;
    answer_text: string;
    answered_by: string;
    upvotes: number;
    is_accepted: boolean;
    created_at: string;
}

class LiveSprintServiceClass {
    // In production: private ws: WebSocket | null = null;

    // Get available live sprints
    async getAvailableSprints(): Promise<LiveSprint[]> {
        // Stub: return simulated lobbies
        return [
            {
                id: 'sprint-1', title: 'Physics Speed Round',
                subject: 'Physics', num_questions: 10, duration_sec: 300,
                status: 'waiting', participants: 12, max_participants: 50,
                created_at: new Date().toISOString(),
            },
            {
                id: 'sprint-2', title: 'Chemistry Blitz',
                subject: 'Chemistry', num_questions: 15, duration_sec: 450,
                status: 'waiting', participants: 8, max_participants: 30,
                created_at: new Date().toISOString(),
            },
            {
                id: 'sprint-3', title: 'Math Marathon',
                subject: 'Mathematics', num_questions: 20, duration_sec: 600,
                status: 'active', participants: 25, max_participants: 50,
                created_at: new Date().toISOString(),
            },
        ];
    }

    // Get overall leaderboard for all active clan members
    async getLeaderboard(sprintId?: string): Promise<LeaderboardEntry[]> {
        try {
            // 1. Fetch all active clans from Firestore
            const clansRef = collection(firestoreDb, 'study_clans');
            const snapshot = await getDocs(clansRef);
            
            // 2. Fetch all sprint attempts from Firestore to aggregate scores globally
            const lbRef = collection(firestoreDb, 'leaderboard_entries');
            const lbSnap = await getDocs(lbRef);
            const allEntries: LeaderboardEntry[] = [];
            lbSnap.forEach(d => allEntries.push(d.data() as LeaderboardEntry));
            
            const userStats = new Map<string, { score: number, accuracy: number, time_taken_sec: number, attempts: number, clan_name: string }>();
            
            // 3. Initialize all members from all active clans with 0 score (ensures everyone appears)
            snapshot.forEach(docSnap => {
                const clan = docSnap.data() as any;
                const members = clan.members || [];
                members.forEach((m: any) => {
                    if (!userStats.has(m.user_name)) {
                        userStats.set(m.user_name, { score: 0, accuracy: 0, time_taken_sec: 0, attempts: 0, clan_name: clan.name });
                    }
                });
            });
            
            // 4. Aggregate their actual scores from attempts
            allEntries.forEach(entry => {
                if (userStats.has(entry.user_name)) {
                    const stats = userStats.get(entry.user_name)!;
                    stats.score += entry.score;
                    stats.accuracy += entry.accuracy;
                    stats.time_taken_sec += entry.time_taken_sec;
                    stats.attempts += 1;
                }
            });
            
            // 5. Format into leaderboard entries
            const formattedEntries: LeaderboardEntry[] = Array.from(userStats.entries()).map(([user_name, stats]) => {
                return {
                    id: 'lb-overall-' + user_name,
                    user_name,
                    score: stats.score,
                    accuracy: stats.attempts > 0 ? Math.round(stats.accuracy / stats.attempts) : 0,
                    time_taken_sec: stats.time_taken_sec,
                    rank: 0,
                    sprint_id: 'overall',
                    clan_name: stats.clan_name
                };
            });
            
            // 6. Sort by score (descending), then time (ascending)
            formattedEntries.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.time_taken_sec - b.time_taken_sec;
            });
            
            // 7. Assign ranks
            formattedEntries.forEach((entry, idx) => {
                entry.rank = idx + 1;
            });
            
            return formattedEntries;
        } catch (e) {
            console.log('[LiveSprint] Leaderboard error:', e);
            return [];
        }
    }

    // Check if a user has completed a specific sprint attempt locally
    async hasCompletedSprint(sprintId: string, userName: string): Promise<boolean> {
        try {
            const db = await getDatabase();
            const entries = await db.getAllAsync<LeaderboardEntry>(
                'SELECT * FROM leaderboard_entries WHERE sprint_id = ? AND user_name = ?',
                [sprintId, userName]
            );
            return entries.length > 0;
        } catch {
            return false;
        }
    }

    // Submit a sprint attempt and update leaderboard
    async submitSprintAttempt(sprintId: string, userName: string, score: number, accuracy: number, timeTakenSec: number): Promise<void> {
        const db = await getDatabase();
        try {
            const id = 'lb-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            
            // 1. Push to Firestore for global cross-device leaderboard sync
            try {
                const entryDoc = doc(collection(firestoreDb, 'leaderboard_entries'), id);
                await setDoc(entryDoc, {
                    id,
                    user_name: userName,
                    score,
                    accuracy,
                    time_taken_sec: timeTakenSec,
                    sprint_id: sprintId,
                    timestamp: Date.now()
                });
            } catch (e) {
                console.log('[LiveSprint] Firestore submit error:', e);
            }

            // 2. Save locally to prevent redirect loops (hasCompletedSprint relies on this)
            await db.runAsync(
                `INSERT INTO leaderboard_entries (id, user_name, score, accuracy, time_taken_sec, rank, sprint_id)
                 VALUES (?, ?, ?, ?, ?, 0, ?)`,
                [id, userName, score, accuracy, timeTakenSec, sprintId]
            );

        } catch (e) {
            console.log('[LiveSprint] Submit attempt error:', e);
        }
    }

    // Fetch random questions for a sprint based on subject
    async getQuestionsForSprint(subject: string, limit: number): Promise<any[]> {
        const db = await getDatabase();
        try {
            // Fetch and filter in JS to support the basic webStore mock DB which lacks JOIN/IN support
            const allSubjects = await db.getAllAsync<any>('SELECT * FROM subjects');
            const sub = allSubjects.find(s => s.name === subject);
            if (!sub) return [];

            const allUnits = await db.getAllAsync<any>('SELECT * FROM units');
            const units = allUnits.filter(u => String(u.subject_id) === String(sub.id));
            const unitIds = units.map(u => String(u.id));

            const allChapters = await db.getAllAsync<any>('SELECT * FROM chapters');
            const chapters = allChapters.filter(c => unitIds.includes(String(c.unit_id)));
            const chapterIds = chapters.map(c => String(c.id));

            const allQuestions = await db.getAllAsync<any>('SELECT * FROM questions');
            let questions = allQuestions.filter(q => chapterIds.includes(String(q.chapter_id)));
            
            // Randomize and limit
            questions.sort(() => 0.5 - Math.random());
            return questions.slice(0, limit);
        } catch (e) {
            console.log('[LiveSprint] Get sprint questions error:', e);
            return [];
        }
    }

    // Fetch 30 MCQ-only questions for clan sprint (10 per subject)
    async getClanSprintQuestions(): Promise<any[]> {
        const db = await getDatabase();
        try {
            const allSubjects = await db.getAllAsync<any>('SELECT * FROM subjects');
            const allUnits = await db.getAllAsync<any>('SELECT * FROM units');
            const allChapters = await db.getAllAsync<any>('SELECT * FROM chapters');
            const allQuestions = await db.getAllAsync<any>('SELECT * FROM questions');

            const result: any[] = [];

            for (const sub of allSubjects) {
                const units = allUnits.filter(u => String(u.subject_id) === String(sub.id));
                const unitIds = units.map(u => String(u.id));
                const chapters = allChapters.filter(c => unitIds.includes(String(c.unit_id)));
                const chapterIds = chapters.map(c => String(c.id));

                let subjectQs = allQuestions.filter(q =>
                    chapterIds.includes(String(q.chapter_id)) &&
                    q.question_type === 'mcq'
                );

                // Randomize and pick 10
                subjectQs.sort(() => 0.5 - Math.random());
                result.push(...subjectQs.slice(0, 10));
            }

            // Final shuffle so subjects are mixed
            result.sort(() => 0.5 - Math.random());
            return result;
        } catch (e) {
            console.log('[LiveSprint] Get clan sprint questions error:', e);
            return [];
        }
    }

    // Get active study clans for user
    async getStudyClans(userName: string): Promise<StudyClan[]> {
        try {
            const clansRef = collection(firestoreDb, 'study_clans');
            const snapshot = await getDocs(clansRef);
            const myClans: StudyClan[] = [];
            
            snapshot.forEach(docSnap => {
                const clan = docSnap.data() as any;
                const members = clan.members || [];
                const requests = clan.requests || [];
                
                const isMember = members.find((m: any) => m.user_name === userName);
                if (isMember) {
                    myClans.push({ ...clan, membership_status: isMember.role });
                } else {
                    const isPending = requests.find((r: any) => r.user_name === userName && r.status === 'pending');
                    if (isPending) {
                        myClans.push({ ...clan, membership_status: 'pending' });
                    }
                }
            });
            return myClans.sort((a, b) => a.rank - b.rank);
        } catch(e) { console.log(e); return []; }
    }

    // Get public clans that the user is NOT a part of
    async getExploreClans(userName: string): Promise<StudyClan[]> {
        try {
            const clansRef = collection(firestoreDb, 'study_clans');
            const snapshot = await getDocs(clansRef);
            const exploreClans: StudyClan[] = [];
            
            snapshot.forEach(docSnap => {
                const clan = docSnap.data() as any;
                const members = clan.members || [];
                const requests = clan.requests || [];
                
                const isMember = members.some((m: any) => m.user_name === userName);
                const isPending = requests.some((r: any) => r.user_name === userName && r.status === 'pending');
                
                if (!isMember && !isPending) {
                    exploreClans.push({ ...clan, membership_status: 'none' });
                }
            });
            return exploreClans.sort((a, b) => b.member_count - a.member_count);
        } catch(e) { console.log(e); return []; }
    }

    // Get a specific clan by its ID
    async getClan(clanId: string): Promise<StudyClan | null> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return null;
            return snap.data() as StudyClan;
        } catch (e) {
            console.log('[LiveSprint] Get clan error:', e);
            return null;
        }
    }


    // Create a new private study clan
    async createClan(name: string, userName: string, userEmail?: string): Promise<string> {
        const inviteCode = 'clan-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', inviteCode);
            await setDoc(clanDoc, {
                id: inviteCode,
                name,
                icon: '👥',
                owner_name: userName,
                member_count: 1,
                weekly_score: 0,
                rank: 0,
                members: [{ user_name: userName, role: 'owner', email: userEmail || '' }],
                requests: [],
                planned_sprint_id: null,
                planned_sprint_status: 'none',
                scheduled_sprint_time: null,
                ready_members: []
            });
            return inviteCode;
        } catch (e) {
            console.log('[LiveSprint] Create clan error:', e);
            return '';
        }
    }

    // Request to join a study clan by invite code
    async joinClan(inviteCode: string, userName: string, userEmail?: string): Promise<boolean> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', inviteCode);
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return false;
            
            const reqId = 'req-' + Date.now();
            await updateDoc(clanDoc, {
                requests: arrayUnion({ id: reqId, user_name: userName, status: 'pending', email: userEmail || '' })
            });
            return true;
        } catch (e) {
            console.log('[LiveSprint] Join clan error:', e);
            return false;
        }
    }

    // Get pending requests for clans owned by user
    async getPendingRequests(clanId: string): Promise<any[]> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return [];
            return (snap.data().requests || []).filter((r: any) => r.status === 'pending');
        } catch {
            return [];
        }
    }

    async acceptJoinRequest(requestId: string, clanId: string, _ownerName: string): Promise<void> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return;
            const data = snap.data();
            
            // Find request
            const requests = data.requests || [];
            const reqIdx = requests.findIndex((r: any) => r.id === requestId);
            if (reqIdx === -1) return;
            
            const requesterName = requests[reqIdx].user_name;
            const requesterEmail = requests[reqIdx].email || '';
            requests.splice(reqIdx, 1); // remove request
            
            const members = data.members || [];
            members.push({ user_name: requesterName, role: 'member', email: requesterEmail });
            
            await updateDoc(clanDoc, {
                requests,
                members,
                member_count: members.length
            });
        } catch (e) {
            console.log('[LiveSprint] Accept join request error:', e);
        }
    }

    // Simulate an incoming request for testing offline
    async simulateIncomingRequest(clanId: string): Promise<void> {}

    // Clan Battles & Lobby Management
    async planClanSprint(clanId: string): Promise<string> {
        try {
            const sprintId = 'sprint-clan-' + Date.now();
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            await updateDoc(clanDoc, {
                planned_sprint_id: sprintId,
                planned_sprint_status: 'lobby',
                ready_members: []
            });
            return sprintId;
        } catch (e) {
            return '';
        }
    }

    async scheduleClanSprint(clanId: string, timeLabel: string): Promise<void> {
        try {
            const sprintId = 'sprint-clan-' + Date.now();
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            await updateDoc(clanDoc, {
                planned_sprint_id: sprintId,
                planned_sprint_status: 'scheduled',
                scheduled_sprint_time: timeLabel,
                ready_members: []
            });
        } catch (e) {}
    }

    async cancelScheduledSprint(clanId: string): Promise<void> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            await updateDoc(clanDoc, {
                planned_sprint_id: null,
                planned_sprint_status: 'none',
                scheduled_sprint_time: null,
                ready_members: []
            });
        } catch (e) {}
    }

    async setClanMemberReady(clanId: string, userName: string): Promise<void> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            
            // 1. Atomically add the user to ready_members to prevent race conditions
            await updateDoc(clanDoc, {
                ready_members: arrayUnion(userName)
            });
            
            // 2. Fetch the newly updated document to check the count
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return;
            
            const ready_members = snap.data().ready_members || [];
            
            // 3. If enough members are ready, transition lobby to 'active'
            if (ready_members.length >= 2) {
                await updateDoc(clanDoc, {
                    planned_sprint_status: 'active'
                });
            }
        } catch (e) {
            console.log('[LiveSprint] setClanMemberReady error:', e);
        }
    }

    async getClanLobbyStatus(clanId: string): Promise<{ status: string, sprintId: string, readyCount: number, memberCount: number, scheduledTime: string }> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return { status: 'none', sprintId: '', readyCount: 0, memberCount: 0, scheduledTime: '' };
            
            const data = snap.data();
            return {
                status: data.planned_sprint_status || 'none',
                sprintId: data.planned_sprint_id || '',
                readyCount: (data.ready_members || []).length,
                memberCount: data.member_count || 1,
                scheduledTime: data.scheduled_sprint_time || ''
            };
        } catch {
            return { status: 'none', sprintId: '', readyCount: 0, memberCount: 0, scheduledTime: '' };
        }
    }

    // --- Clan Management Methods ---

    // Get all members of a clan
    async getClanMembers(clanId: string): Promise<any[]> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return [];
            return (snap.data().members || []).map((m: any) => ({ ...m, clan_id: clanId }));
        } catch {
            return [];
        }
    }

    // Delete a clan entirely
    async deleteClan(clanId: string): Promise<void> {
        try {
            await deleteDoc(doc(firestoreDb, 'study_clans', clanId));
        } catch (e) {}
    }

    // Remove a member from a clan
    async removeClanMember(clanId: string, targetUserName: string): Promise<void> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return;
            const data = snap.data();
            let members = data.members || [];
            members = members.filter((m: any) => m.user_name !== targetUserName);
            await updateDoc(clanDoc, { members, member_count: members.length });
        } catch (e) {}
    }

    // Promote a member to admin
    async promoteClanAdmin(clanId: string, targetUserName: string): Promise<void> {
        try {
            const clanDoc = doc(firestoreDb, 'study_clans', clanId);
            const snap = await getDoc(clanDoc);
            if (!snap.exists()) return;
            const data = snap.data();
            let members = data.members || [];
            const idx = members.findIndex((m: any) => m.user_name === targetUserName);
            if (idx > -1) {
                members[idx].role = 'admin';
                await updateDoc(clanDoc, { members });
            }
        } catch (e) {}
    }

    // Chat in study clans
    async getClanMessages(clanId: string): Promise<any[]> {
        try {
            const msgsRef = collection(firestoreDb, 'clan_messages');
            const q = query(msgsRef, where('clan_id', '==', clanId));
            const snap = await getDocs(q);
            const msgs = snap.docs.map(doc => doc.data());
            return msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } catch {
            return [];
        }
    }

    async postClanMessage(clanId: string, userName: string, message: string): Promise<void> {
        try {
            const id = 'cmsg-' + Date.now();
            const msgDoc = doc(firestoreDb, 'clan_messages', id);
            await setDoc(msgDoc, {
                id,
                clan_id: clanId,
                user_name: userName,
                message,
                created_at: new Date().toISOString()
            });
        } catch (e) {}
    }

    // Doubt Marketplace operations
    async getRecentDoubts(): Promise<DoubtPost[]> {
        const db = await getDatabase();
        try {
            return await db.getAllAsync<DoubtPost>(
                'SELECT * FROM doubt_marketplace ORDER BY created_at DESC LIMIT 20'
            );
        } catch {
            return [
                {
                    id: 'doubt-1', question_text: 'How to solve projectile motion problems when angle is not given?',
                    subject: 'Physics', chapter: 'Kinematics', posted_by: 'Amit K.',
                    answers_count: 3, is_resolved: false, created_at: new Date().toISOString(),
                },
                {
                    id: 'doubt-2', question_text: 'Difference between SN1 and SN2 mechanisms for secondary substrates?',
                    subject: 'Chemistry', chapter: 'Organic', posted_by: 'Neha S.',
                    answers_count: 5, is_resolved: true, created_at: new Date().toISOString(),
                },
                {
                    id: 'doubt-3', question_text: 'Best method to solve definite integrals with |x| terms?',
                    subject: 'Mathematics', chapter: 'Calculus', posted_by: 'Rohan P.',
                    answers_count: 2, is_resolved: false, created_at: new Date().toISOString(),
                },
            ];
        }
    }

    async postDoubt(question: string, subject: string, chapter: string, postedBy: string): Promise<string> {
        const db = await getDatabase();
        const id = generateId();
        try {
            await db.runAsync(
                `INSERT INTO doubt_marketplace (id, question_text, subject, chapter, posted_by, answers_count, is_resolved)
                 VALUES (?, ?, ?, ?, ?, 0, 0)`,
                [id, question, subject, chapter, postedBy]
            );
        } catch (e) {
            console.log('[LiveSprint] Post doubt error:', e);
        }
        return id;
    }

    async postAnswer(doubtId: string, answer: string, answeredBy: string): Promise<string> {
        const db = await getDatabase();
        const id = generateId();
        try {
            await db.runAsync(
                `INSERT INTO doubt_answers (id, doubt_id, answer_text, answered_by, upvotes, is_accepted)
                 VALUES (?, ?, ?, ?, 0, 0)`,
                [id, doubtId, answer, answeredBy]
            );
            await db.runAsync(
                `UPDATE doubt_marketplace SET answers_count = answers_count + 1 WHERE id = ?`,
                [doubtId]
            );
        } catch (e) {
            console.log('[LiveSprint] Post answer error:', e);
        }
        return id;
    }

    async getAnswersForDoubt(doubtId: string): Promise<DoubtAnswer[]> {
        const db = await getDatabase();
        try {
            const answers = await db.getAllAsync<DoubtAnswer>(
                'SELECT * FROM doubt_answers WHERE doubt_id = ? ORDER BY created_at ASC',
                [doubtId]
            );
            if (answers && answers.length > 0) {
                return answers;
            }
            
            // Return mock answers if none found (for mock doubts)
            if (doubtId === 'doubt-1') {
                return [{ id: 'ans-1', doubt_id: doubtId, answer_text: "Use the kinematic equations, particularly the ones that don't require the angle if you have other parameters.", answered_by: 'Rahul M.', upvotes: 2, is_accepted: false, created_at: new Date().toISOString() }, { id: 'ans-1b', doubt_id: doubtId, answer_text: "Draw a free body diagram first, it usually helps visualize the missing components.", answered_by: 'Priya S.', upvotes: 1, is_accepted: true, created_at: new Date().toISOString() }, { id: 'ans-1c', doubt_id: doubtId, answer_text: "Check if you can use conservation of energy instead.", answered_by: 'Teacher_John', upvotes: 5, is_accepted: false, created_at: new Date().toISOString() }];
            }
            if (doubtId === 'doubt-2') {
                 return [{ id: 'ans-2', doubt_id: doubtId, answer_text: "For secondary substrates, SN2 is favored by strong nucleophiles and polar aprotic solvents, while SN1 is favored by weak nucleophiles and polar protic solvents.", answered_by: 'Priya S.', upvotes: 4, is_accepted: true, created_at: new Date().toISOString() }, { id: 'ans-2b', doubt_id: doubtId, answer_text: "Look at the leaving group too!", answered_by: 'Amit K.', upvotes: 1, is_accepted: false, created_at: new Date().toISOString() }, { id: 'ans-2c', doubt_id: doubtId, answer_text: "SN1 usually gives a racemic mixture.", answered_by: 'Teacher_Sarah', upvotes: 2, is_accepted: false, created_at: new Date().toISOString() }, { id: 'ans-2d', doubt_id: doubtId, answer_text: "Don't forget rearrangements in SN1.", answered_by: 'Deva Gayathri', upvotes: 0, is_accepted: false, created_at: new Date().toISOString() }, { id: 'ans-2e', doubt_id: doubtId, answer_text: "Yup, polar aprotic is key for SN2.", answered_by: 'Rohan P.', upvotes: 1, is_accepted: false, created_at: new Date().toISOString() }];
            }
            if (doubtId === 'doubt-3') {
                 return [{ id: 'ans-3', doubt_id: doubtId, answer_text: "Split the integral at the critical points where the absolute value changes sign.", answered_by: 'Vikram A.', upvotes: 1, is_accepted: true, created_at: new Date().toISOString() }, { id: 'ans-3b', doubt_id: doubtId, answer_text: "Draw the graph of the function to see the areas.", answered_by: 'Neha S.', upvotes: 2, is_accepted: false, created_at: new Date().toISOString() }];
            }
            return [];
        } catch {
            return [];
        }
    }

    async resolveDoubt(doubtId: string): Promise<void> {
        const db = await getDatabase();
        try {
            await db.runAsync(
                'UPDATE doubt_marketplace SET is_resolved = 1 WHERE id = ?',
                [doubtId]
            );
        } catch (e) {
            console.log('[LiveSprint] Resolve doubt error:', e);
        }
    }

    async editDoubt(doubtId: string, newText: string): Promise<void> {
        const db = await getDatabase();
        try {
            await db.runAsync('UPDATE doubt_marketplace SET question_text = ? WHERE id = ?', [newText, doubtId]);
        } catch (e) {
            console.log('[LiveSprint] Edit doubt error:', e);
        }
    }

    async deleteDoubt(doubtId: string): Promise<void> {
        const db = await getDatabase();
        try {
            await db.runAsync('DELETE FROM doubt_answers WHERE doubt_id = ?', [doubtId]);
            await db.runAsync('DELETE FROM doubt_marketplace WHERE id = ?', [doubtId]);
        } catch (e) {
            console.log('[LiveSprint] Delete doubt error:', e);
        }
    }

    async editAnswer(answerId: string, newText: string): Promise<void> {
        const db = await getDatabase();
        try {
            await db.runAsync('UPDATE doubt_answers SET answer_text = ? WHERE id = ?', [newText, answerId]);
        } catch (e) {
            console.log('[LiveSprint] Edit answer error:', e);
        }
    }

    async deleteAnswer(answerId: string, doubtId: string): Promise<void> {
        const db = await getDatabase();
        try {
            await db.runAsync('DELETE FROM doubt_answers WHERE id = ?', [answerId]);
            await db.runAsync('UPDATE doubt_marketplace SET answers_count = answers_count - 1 WHERE id = ?', [doubtId]);
        } catch (e) {
            console.log('[LiveSprint] Delete answer error:', e);
        }
    }
}

export const liveSprintService = new LiveSprintServiceClass();
