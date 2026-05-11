// JEE Connect - Live Sprint Service
// Sprint 7: WebSocket-based live speed tests, leaderboards, and study clans

import { getDatabase } from '../db/database';
import { generateId } from '../repositories/BaseRepository';

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

    // Get leaderboard for a sprint
    async getLeaderboard(sprintId: string): Promise<LeaderboardEntry[]> {
        const db = await getDatabase();
        try {
            const entries = await db.getAllAsync<LeaderboardEntry>(
                'SELECT * FROM leaderboard_entries WHERE sprint_id = ? ORDER BY rank ASC LIMIT 50',
                [sprintId]
            );
            
            // Format user names to include clan name if they belong to one
            const members = await db.getAllAsync<any>('SELECT * FROM clan_members');
            const clans = await db.getAllAsync<StudyClan>('SELECT * FROM study_clans');
            
            const formattedEntries = entries.map(entry => {
                const membership = members.find(m => m.user_name === entry.user_name);
                if (membership) {
                    const clan = clans.find(c => c.id === membership.clan_id);
                    if (clan) {
                        return { ...entry, user_name: `${entry.user_name} (${clan.name})` };
                    }
                }
                return entry;
            });
            
            return formattedEntries;
        } catch {
            return [];
        }
    }

    // Submit a sprint attempt and update leaderboard
    async submitSprintAttempt(sprintId: string, userName: string, score: number, accuracy: number, timeTakenSec: number): Promise<void> {
        const db = await getDatabase();
        try {
            const id = 'lb-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            await db.runAsync(
                `INSERT INTO leaderboard_entries (id, user_name, score, accuracy, time_taken_sec, rank, sprint_id)
                 VALUES (?, ?, ?, ?, ?, 0, ?)`,
                [id, userName, score, accuracy, timeTakenSec, sprintId]
            );

            // Re-calculate ranks for this sprint
            const entries = await db.getAllAsync<LeaderboardEntry>(
                'SELECT * FROM leaderboard_entries WHERE sprint_id = ? ORDER BY score DESC, time_taken_sec ASC',
                [sprintId]
            );
            
            for (let i = 0; i < entries.length; i++) {
                await db.runAsync(
                    'UPDATE leaderboard_entries SET rank = ? WHERE id = ?',
                    [i + 1, entries[i].id]
                );
            }

            // Award points to the user's clan if they scored positive
            if (score > 0) {
                const member = await db.getFirstAsync<any>('SELECT clan_id FROM clan_members WHERE user_name = ?', [userName]);
                if (member && member.clan_id) {
                    const clan = await db.getFirstAsync<StudyClan>('SELECT weekly_score FROM study_clans WHERE id = ?', [member.clan_id]);
                    if (clan) {
                        await db.runAsync('UPDATE study_clans SET weekly_score = ? WHERE id = ?', [(clan.weekly_score || 0) + score, member.clan_id]);
                    }
                }
            }
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

    // Get active study clans for user
    async getStudyClans(userName: string): Promise<StudyClan[]> {
        const db = await getDatabase();
        try {
            // Because webStore mock lacks complex JOINs, we fetch locally
            const allClans = await db.getAllAsync<StudyClan>('SELECT * FROM study_clans');
            const members = await db.getAllAsync<any>('SELECT * FROM clan_members');
            const requests = await db.getAllAsync<any>('SELECT * FROM clan_requests');

            const myClans: StudyClan[] = [];

            for (const clan of allClans) {
                const isMember = members.find(m => m.clan_id === clan.id && m.user_name === userName);
                if (isMember) {
                    myClans.push({ ...clan, membership_status: isMember.role });
                    continue;
                }
                const isPending = requests.find(r => r.clan_id === clan.id && r.user_name === userName && r.status === 'pending');
                if (isPending) {
                    myClans.push({ ...clan, membership_status: 'pending' });
                }
            }

            return myClans.sort((a, b) => a.rank - b.rank);
        } catch {
            return [];
        }
    }

    // Get public clans that the user is NOT a part of
    async getExploreClans(userName: string): Promise<StudyClan[]> {
        const db = await getDatabase();
        try {
            const allClans = await db.getAllAsync<StudyClan>('SELECT * FROM study_clans');
            const members = await db.getAllAsync<any>('SELECT * FROM clan_members');
            const requests = await db.getAllAsync<any>('SELECT * FROM clan_requests');

            const exploreClans: StudyClan[] = [];

            for (const clan of allClans) {
                const isMember = members.some(m => m.clan_id === clan.id && m.user_name === userName);
                const isPending = requests.some(r => r.clan_id === clan.id && r.user_name === userName && r.status === 'pending');
                
                if (!isMember && !isPending) {
                    exploreClans.push({ ...clan, membership_status: 'none' as any });
                }
            }

            return exploreClans.sort((a, b) => b.member_count - a.member_count);
        } catch {
            return [];
        }
    }

    // Create a new private study clan
    async createClan(name: string, userName: string): Promise<string> {
        const db = await getDatabase();
        const inviteCode = 'clan-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        try {
            await db.runAsync(
                'INSERT INTO study_clans (id, name, icon, owner_name, member_count, weekly_score, rank) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [inviteCode, name, '👥', userName, 1, 0, 0]
            );
            await db.runAsync(
                'INSERT INTO clan_members (clan_id, user_name, role) VALUES (?, ?, ?)',
                [inviteCode, userName, 'owner']
            );
            return inviteCode;
        } catch (e) {
            console.log('[LiveSprint] Create clan error:', e);
            return '';
        }
    }

    // Request to join a study clan by invite code
    async joinClan(inviteCode: string, userName: string): Promise<boolean> {
        const db = await getDatabase();
        try {
            // Check if clan genuinely exists in the local database
            const existing = await db.getFirstAsync<any>('SELECT id FROM study_clans WHERE id = ?', [inviteCode]);
            if (!existing) return false;

            const id = 'req-' + Date.now();
            await db.runAsync(
                'INSERT INTO clan_requests (id, clan_id, user_name, status) VALUES (?, ?, ?, ?)',
                [id, inviteCode, userName, 'pending']
            );
            return true;
        } catch (e) {
            console.log('[LiveSprint] Join clan error:', e);
            return false;
        }
    }

    // Get pending requests for clans owned by user
    async getPendingRequests(clanId: string): Promise<any[]> {
        const db = await getDatabase();
        try {
            const reqs = await db.getAllAsync<any>('SELECT * FROM clan_requests WHERE clan_id = ? AND status = ?', [clanId, 'pending']);
            return reqs || [];
        } catch {
            return [];
        }
    }

    async acceptJoinRequest(requestId: string, clanId: string, _ownerName: string): Promise<void> {
        const db = await getDatabase();
        try {
            // Look up the actual requester's name from the request record
            const request = await db.getFirstAsync<any>('SELECT * FROM clan_requests WHERE id = ?', [requestId]);
            if (!request) return;
            const requesterName = request.user_name;

            await db.runAsync('UPDATE clan_requests SET status = ? WHERE id = ?', ['accepted', requestId]);
            await db.runAsync('INSERT INTO clan_members (clan_id, user_name, role) VALUES (?, ?, ?)', [clanId, requesterName, 'member']);
            
            // Increment member count
            const clan = await db.getFirstAsync<StudyClan>('SELECT * FROM study_clans WHERE id = ?', [clanId]);
            if (clan) {
                await db.runAsync('UPDATE study_clans SET member_count = ? WHERE id = ?', [clan.member_count + 1, clanId]);
            }
        } catch (e) {
            console.log('[LiveSprint] Accept join request error:', e);
        }
    }

    // Simulate an incoming request for testing offline
    async simulateIncomingRequest(clanId: string): Promise<void> {
        // Feature removed. Genuine database logic enforces true cross-device request simulation.
    }

    // Clan Battles & Lobby Management
    async planClanSprint(clanId: string): Promise<string> {
        const db = await getDatabase();
        try {
            const sprintId = 'sprint-clan-' + Date.now();
            await db.runAsync(
                'UPDATE study_clans SET planned_sprint_id = ?, planned_sprint_status = ? WHERE id = ?',
                [sprintId, 'lobby', clanId]
            );
            // Clear old ready states
            await db.runAsync('DELETE FROM clan_lobby_ready WHERE clan_id = ?', [clanId]);
            return sprintId;
        } catch (e) {
            console.log('[LiveSprint] Plan clan sprint error:', e);
            return '';
        }
    }

    async setClanMemberReady(clanId: string, userName: string): Promise<void> {
        const db = await getDatabase();
        try {
            const existing = await db.getFirstAsync<any>('SELECT * FROM clan_lobby_ready WHERE clan_id = ? AND user_name = ?', [clanId, userName]);
            if (!existing) {
                await db.runAsync('INSERT INTO clan_lobby_ready (clan_id, user_name) VALUES (?, ?)', [clanId, userName]);
            }
            
            // Check if at least 2 members are ready (per user requirements)
            const readyRows = await db.getAllAsync<any>('SELECT user_name FROM clan_lobby_ready WHERE clan_id = ?', [clanId]);
            
            if (readyRows.length >= 2) {
                // At least 2 ready -> start test
                await db.runAsync('UPDATE study_clans SET planned_sprint_status = ? WHERE id = ?', ['active', clanId]);
            }
        } catch (e) {
            console.log('[LiveSprint] Set clan member ready error:', e);
        }
    }

    async getClanLobbyStatus(clanId: string): Promise<{ status: string, sprintId: string, readyCount: number, memberCount: number }> {
        const db = await getDatabase();
        try {
            const clan = await db.getFirstAsync<any>('SELECT member_count, planned_sprint_id, planned_sprint_status FROM study_clans WHERE id = ?', [clanId]);
            if (!clan) return { status: 'none', sprintId: '', readyCount: 0, memberCount: 0 };
            
            const readyRows = await db.getAllAsync<any>('SELECT user_name FROM clan_lobby_ready WHERE clan_id = ?', [clanId]);
            
            return {
                status: clan.planned_sprint_status || 'none',
                sprintId: clan.planned_sprint_id || '',
                readyCount: readyRows.length,
                memberCount: clan.member_count || 1
            };
        } catch {
            return { status: 'none', sprintId: '', readyCount: 0, memberCount: 0 };
        }
    }

    // --- Clan Management Methods ---

    // Get all members of a clan
    async getClanMembers(clanId: string): Promise<any[]> {
        const db = await getDatabase();
        try {
            const members = await db.getAllAsync<any>('SELECT * FROM clan_members WHERE clan_id = ? ORDER BY role DESC', [clanId]);
            return members || [];
        } catch {
            return [];
        }
    }

    // Delete a clan entirely
    async deleteClan(clanId: string): Promise<void> {
        const db = await getDatabase();
        try {
            await db.runAsync('DELETE FROM study_clans WHERE id = ?', [clanId]);
            await db.runAsync('DELETE FROM clan_members WHERE clan_id = ?', [clanId]);
            await db.runAsync('DELETE FROM clan_requests WHERE clan_id = ?', [clanId]);
            await db.runAsync('DELETE FROM clan_messages WHERE clan_id = ?', [clanId]);
        } catch (e) {
            console.log('[LiveSprint] Delete clan error:', e);
        }
    }

    // Remove a member from a clan
    async removeClanMember(clanId: string, targetUserName: string): Promise<void> {
        const db = await getDatabase();
        try {
            await db.runAsync('DELETE FROM clan_members WHERE clan_id = ? AND user_name = ?', [clanId, targetUserName]);
            // Decrement member count
            const clan = await db.getFirstAsync<StudyClan>('SELECT * FROM study_clans WHERE id = ?', [clanId]);
            if (clan && clan.member_count > 0) {
                await db.runAsync('UPDATE study_clans SET member_count = ? WHERE id = ?', [clan.member_count - 1, clanId]);
            }
        } catch (e) {
            console.log('[LiveSprint] Remove member error:', e);
        }
    }

    // Promote a member to admin
    async promoteClanAdmin(clanId: string, targetUserName: string): Promise<void> {
        const db = await getDatabase();
        try {
            await db.runAsync("UPDATE clan_members SET role = 'admin' WHERE clan_id = ? AND user_name = ?", [clanId, targetUserName]);
        } catch (e) {
            console.log('[LiveSprint] Promote admin error:', e);
        }
    }

    // Chat in study clans
    async getClanMessages(clanId: string): Promise<any[]> {
        const db = await getDatabase();
        try {
            return await db.getAllAsync<any>(
                'SELECT * FROM clan_messages WHERE clan_id = ? ORDER BY created_at ASC',
                [clanId]
            );
        } catch {
            return [];
        }
    }

    async postClanMessage(clanId: string, userName: string, message: string): Promise<void> {
        const db = await getDatabase();
        try {
            const id = 'cmsg-' + Date.now();
            await db.runAsync(
                'INSERT INTO clan_messages (id, clan_id, user_name, message) VALUES (?, ?, ?, ?)',
                [id, clanId, userName, message]
            );
        } catch (e) {
            console.log('[LiveSprint] Post clan message error:', e);
        }
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
            return await db.getAllAsync<DoubtAnswer>(
                'SELECT * FROM doubt_answers WHERE doubt_id = ? ORDER BY created_at ASC',
                [doubtId]
            );
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
