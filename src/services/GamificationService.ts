// JEE Connect - Gamification Service
// Sprint 9: XP, Streaks, Achievements, Daily Challenge, Spin, Adaptive Learning

import { getDatabase } from '../db/database';

// ─── Types ───
export interface XPEvent { action: string; amount: number; }
export interface StreakInfo { currentStreak: number; longestStreak: number; todayActive: boolean; lastActiveDate: string | null; }
export interface AchievementWithStatus { id: string; title: string; description: string; icon: string; category: string; xp_reward: number; unlocked: boolean; unlocked_at?: string; }
export interface DailyChallenge { question: any; solved: boolean; }
export interface SpinReward { type: 'xp' | 'streak_shield' | 'tip' | 'fun_fact'; label: string; value: number; message: string; }

// ─── XP Levels ───
const LEVELS = [
    { minXP: 0, title: 'Aspirant', emoji: '📘' },
    { minXP: 100, title: 'Learner', emoji: '📗' },
    { minXP: 300, title: 'Scholar', emoji: '📙' },
    { minXP: 600, title: 'Ranker', emoji: '🏆' },
    { minXP: 1000, title: 'Topper', emoji: '🥇' },
    { minXP: 2000, title: 'AIR 1 Material', emoji: '👑' },
];

// ─── XP Award Values ───
export const XP_VALUES = {
    test_complete: 50,
    correct_answer: 10,
    pyq_solved: 10,
    saathi_chat: 5,
    doubt_posted: 15,
    doubt_answered: 25,
    streak_daily: 20,
    daily_challenge: 30,
    perfect_score: 100,
    spin_reward: 0, // variable
};

// ─── Spin Rewards Pool ───
const SPIN_REWARDS: SpinReward[] = [
    { type: 'xp', label: '+10 Bonus XP', value: 10, message: '🎉 You won 10 bonus XP!' },
    { type: 'xp', label: '+25 Bonus XP', value: 25, message: '🎉 Amazing! 25 bonus XP!' },
    { type: 'xp', label: '+50 Bonus XP', value: 50, message: '🎉 Jackpot! 50 bonus XP!' },
    { type: 'streak_shield', label: 'Streak Shield', value: 1, message: '🛡️ Streak Shield! Your streak is protected for 1 day.' },
    { type: 'tip', label: 'Study Tip', value: 0, message: '💡 Pro Tip: Solve PYQs in timed conditions to build exam stamina!' },
    { type: 'fun_fact', label: 'Fun Fact', value: 0, message: '🧠 Fun Fact: IIT Bombay receives 10 lakh+ applications every year but admits only ~16,000 students!' },
    { type: 'xp', label: '+15 Bonus XP', value: 15, message: '🎉 Nice! 15 bonus XP!' },
    { type: 'tip', label: 'Study Tip', value: 0, message: '💡 Pro Tip: Review your wrong answers immediately after a test — that\'s when learning sticks!' },
];

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getTodayDateStr(): string {
    return new Date().toISOString().split('T')[0];
}

class GamificationServiceClass {
    // ═══════════════════════════════════════
    // XP SYSTEM
    // ═══════════════════════════════════════

    async awardXP(userEmail: string, action: string, amount: number): Promise<void> {
        const db = await getDatabase();
        const id = generateId();
        await db.runAsync(
            'INSERT INTO user_xp_log (id, user_email, action, xp_earned, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, userEmail, action, amount, new Date().toISOString()]
        );
        // Also update today's streak record
        await this.recordDailyActivity(userEmail, amount, 0, 0);
    }

    async getTotalXP(userEmail: string): Promise<number> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ xp_earned: number }>(
            'SELECT xp_earned FROM user_xp_log WHERE user_email = ?', [userEmail]
        );
        return rows.reduce((sum, r) => sum + (r.xp_earned || 0), 0);
    }

    async getXPForToday(userEmail: string): Promise<number> {
        const today = getTodayDateStr();
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ xp_earned: number }>(
            'SELECT xp_earned FROM user_xp_log WHERE user_email = ? AND created_at >= ?',
            [userEmail, today]
        );
        return rows.reduce((sum, r) => sum + (r.xp_earned || 0), 0);
    }

    async getWeeklyXP(userEmail: string): Promise<number> {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ xp_earned: number }>(
            'SELECT xp_earned FROM user_xp_log WHERE user_email = ? AND created_at >= ?',
            [userEmail, weekAgo]
        );
        return rows.reduce((sum, r) => sum + (r.xp_earned || 0), 0);
    }

    getLevel(totalXP: number): { title: string; emoji: string; nextLevelXP: number; progress: number } {
        let current = LEVELS[0];
        let nextLevel = LEVELS[1];
        for (let i = LEVELS.length - 1; i >= 0; i--) {
            if (totalXP >= LEVELS[i].minXP) {
                current = LEVELS[i];
                nextLevel = LEVELS[i + 1] || LEVELS[i];
                break;
            }
        }
        const xpInLevel = totalXP - current.minXP;
        const xpNeeded = nextLevel.minXP - current.minXP;
        const progress = xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1;
        return { title: current.title, emoji: current.emoji, nextLevelXP: nextLevel.minXP, progress };
    }

    // ═══════════════════════════════════════
    // STREAK SYSTEM
    // ═══════════════════════════════════════

    async recordDailyActivity(userEmail: string, xpEarned: number = 0, questionsSolved: number = 0, testsCompleted: number = 0): Promise<void> {
        const db = await getDatabase();
        const today = getTodayDateStr();
        const existing = await db.getFirstAsync<{ id: string; xp_earned: number; questions_solved: number; tests_completed: number }>(
            'SELECT * FROM daily_streaks WHERE user_email = ? AND date = ?', [userEmail, today]
        );
        if (existing) {
            await db.runAsync(
                'UPDATE daily_streaks SET xp_earned = ?, questions_solved = ?, tests_completed = ? WHERE id = ?',
                [(existing.xp_earned || 0) + xpEarned, (existing.questions_solved || 0) + questionsSolved, (existing.tests_completed || 0) + testsCompleted, existing.id]
            );
        } else {
            await db.runAsync(
                'INSERT INTO daily_streaks (id, user_email, date, xp_earned, questions_solved, tests_completed) VALUES (?, ?, ?, ?, ?, ?)',
                [generateId(), userEmail, today, xpEarned, questionsSolved, testsCompleted]
            );
        }
    }

    async getStreakInfo(userEmail: string): Promise<StreakInfo> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ date: string }>(
            'SELECT date FROM daily_streaks WHERE user_email = ? ORDER BY date DESC', [userEmail]
        );
        if (rows.length === 0) {
            return { currentStreak: 0, longestStreak: 0, todayActive: false, lastActiveDate: null };
        }

        const today = getTodayDateStr();
        const todayActive = rows[0]?.date === today;
        
        // Calculate current streak
        let streak = 0;
        const startDate = todayActive ? today : rows[0]?.date;
        if (!startDate) return { currentStreak: 0, longestStreak: 0, todayActive: false, lastActiveDate: null };
        
        const dateSet = new Set(rows.map(r => r.date));
        let checkDate = new Date(startDate);
        
        // If today is not active, check if yesterday was the last active day
        if (!todayActive) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            if (rows[0]?.date !== yesterdayStr) {
                // Streak is broken
                return { currentStreak: 0, longestStreak: 0, todayActive: false, lastActiveDate: rows[0]?.date || null };
            }
        }
        
        while (dateSet.has(checkDate.toISOString().split('T')[0])) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return { currentStreak: streak, longestStreak: streak, todayActive, lastActiveDate: rows[0]?.date || null };
    }

    getStreakEmoji(streak: number): string {
        if (streak >= 100) return '💎';
        if (streak >= 30) return '🔥🔥🔥';
        if (streak >= 7) return '🔥🔥';
        if (streak >= 1) return '🔥';
        return '❄️';
    }

    // ═══════════════════════════════════════
    // ACHIEVEMENTS
    // ═══════════════════════════════════════

    async getAchievements(userEmail: string): Promise<AchievementWithStatus[]> {
        const db = await getDatabase();
        const allAchievements = await db.getAllAsync<{ id: string; title: string; description: string; icon: string; category: string; xp_reward: number }>(
            'SELECT * FROM achievements'
        );
        const unlocked = await db.getAllAsync<{ achievement_id: string; unlocked_at: string }>(
            'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_email = ?', [userEmail]
        );
        const unlockedMap = new Map(unlocked.map(u => [u.achievement_id, u.unlocked_at]));

        return allAchievements.map(a => ({
            ...a,
            unlocked: unlockedMap.has(a.id),
            unlocked_at: unlockedMap.get(a.id),
        }));
    }

    async unlockAchievement(userEmail: string, achievementId: string): Promise<{ unlocked: boolean; xpReward: number; title: string; icon: string }> {
        const db = await getDatabase();
        // Check if already unlocked
        const existing = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM user_achievements WHERE user_email = ? AND achievement_id = ?', [userEmail, achievementId]
        );
        if (existing) return { unlocked: false, xpReward: 0, title: '', icon: '' };

        const achievement = await db.getFirstAsync<{ title: string; icon: string; xp_reward: number }>(
            'SELECT title, icon, xp_reward FROM achievements WHERE id = ?', [achievementId]
        );
        if (!achievement) return { unlocked: false, xpReward: 0, title: '', icon: '' };

        await db.runAsync(
            'INSERT INTO user_achievements (id, user_email, achievement_id, unlocked_at) VALUES (?, ?, ?, ?)',
            [generateId(), userEmail, achievementId, new Date().toISOString()]
        );

        // Award XP for the badge
        if (achievement.xp_reward > 0) {
            await this.awardXP(userEmail, `badge_${achievementId}`, achievement.xp_reward);
        }

        return { unlocked: true, xpReward: achievement.xp_reward, title: achievement.title, icon: achievement.icon };
    }

    async checkAndUnlockAchievements(userEmail: string): Promise<{ unlocked: boolean; title: string; icon: string }[]> {
        const results: { unlocked: boolean; title: string; icon: string }[] = [];
        const db = await getDatabase();

        // Get user stats
        const totalXP = await this.getTotalXP(userEmail);
        const streakInfo = await this.getStreakInfo(userEmail);
        const testCount = await db.getFirstAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM test_attempts WHERE status = 'completed' AND user_email = ?`, [userEmail]
        );
        const testsCompleted = testCount?.count || 0;

        // Check milestone achievements
        if (testsCompleted >= 1) {
            const r = await this.unlockAchievement(userEmail, 'ach-first-test');
            if (r.unlocked) results.push(r);
        }
        if (testsCompleted >= 5) {
            const r = await this.unlockAchievement(userEmail, 'ach-five-tests');
            if (r.unlocked) results.push(r);
        }
        if (totalXP >= 500) {
            const r = await this.unlockAchievement(userEmail, 'ach-xp-500');
            if (r.unlocked) results.push(r);
        }
        if (streakInfo.currentStreak >= 7) {
            const r = await this.unlockAchievement(userEmail, 'ach-week-warrior');
            if (r.unlocked) results.push(r);
        }

        // Time-based achievements
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 4) {
            const r = await this.unlockAchievement(userEmail, 'ach-night-owl');
            if (r.unlocked) results.push(r);
        }
        if (hour >= 4 && hour < 7) {
            const r = await this.unlockAchievement(userEmail, 'ach-early-bird');
            if (r.unlocked) results.push(r);
        }

        return results;
    }

    async checkPerfectScore(userEmail: string, correct: number, total: number): Promise<{ unlocked: boolean; title: string; icon: string } | null> {
        if (total > 0 && correct === total) {
            const r = await this.unlockAchievement(userEmail, 'ach-perfect-score');
            if (r.unlocked) return r;
        }
        return null;
    }

    // ═══════════════════════════════════════
    // DAILY CHALLENGE
    // ═══════════════════════════════════════

    async getDailyChallenge(): Promise<DailyChallenge | null> {
        const db = await getDatabase();
        const questions = await db.getAllAsync<any>('SELECT * FROM questions');
        if (questions.length === 0) return null;

        // Use today's date as a seed for deterministic selection
        const today = getTodayDateStr();
        const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
        const idx = seed % questions.length;
        return { question: questions[idx], solved: false };
    }

    async isDailyChallengeSolved(userEmail: string): Promise<boolean> {
        const db = await getDatabase();
        const today = getTodayDateStr();
        const setting = await db.getFirstAsync<{ value: string }>(
            'SELECT value FROM user_settings WHERE key = ?', [`daily_challenge_${userEmail}_${today}`]
        );
        return setting?.value === 'solved';
    }

    async solveDailyChallenge(userEmail: string): Promise<void> {
        const db = await getDatabase();
        const today = getTodayDateStr();
        await db.runAsync(
            'INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, ?)',
            [`daily_challenge_${userEmail}_${today}`, 'solved', new Date().toISOString()]
        );
        await this.awardXP(userEmail, 'daily_challenge', XP_VALUES.daily_challenge);
    }

    // ═══════════════════════════════════════
    // DAILY SPIN
    // ═══════════════════════════════════════

    async canSpin(userEmail: string): Promise<boolean> {
        const db = await getDatabase();
        const today = getTodayDateStr();
        const setting = await db.getFirstAsync<{ value: string }>(
            'SELECT value FROM user_settings WHERE key = ?', [`spin_${userEmail}_${today}`]
        );
        return !setting;
    }

    async doSpin(userEmail: string): Promise<SpinReward> {
        const db = await getDatabase();
        const today = getTodayDateStr();

        // Random reward
        const reward = SPIN_REWARDS[Math.floor(Math.random() * SPIN_REWARDS.length)];

        // Mark as used
        await db.runAsync(
            'INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, ?)',
            [`spin_${userEmail}_${today}`, 'used', new Date().toISOString()]
        );

        // Award XP if reward is XP type
        if (reward.type === 'xp' && reward.value > 0) {
            await this.awardXP(userEmail, 'daily_spin', reward.value);
        }

        return reward;
    }

    // ═══════════════════════════════════════
    // ADAPTIVE LEARNING
    // ═══════════════════════════════════════

    async getFocusTodayChapter(userEmail: string): Promise<{ chapter_id: string; chapter_name: string; subject_name: string; accuracy: number; weakness_level: string } | null> {
        // Import analytics inline to avoid circular deps
        const { analyticsService } = require('./AnalyticsService');
        const heatmap = await analyticsService.getWeaknessHeatmap(userEmail);
        
        // Find the weakest chapter that has been attempted (accuracy > 0 but lowest)
        const attempted = heatmap.filter((h: any) => h.total_attempted > 0);
        if (attempted.length === 0) {
            // No attempts yet — pick a random chapter
            const unattempted = heatmap.filter((h: any) => h.total_attempted === 0);
            if (unattempted.length > 0) {
                const pick = unattempted[Math.floor(Math.random() * unattempted.length)];
                return { chapter_id: pick.chapter_id, chapter_name: pick.chapter_name, subject_name: pick.subject_name, accuracy: 0, weakness_level: 'new' };
            }
            return null;
        }
        
        // Sort by accuracy ascending (weakest first)
        attempted.sort((a: any, b: any) => a.accuracy - b.accuracy);
        const weakest = attempted[0];
        return {
            chapter_id: weakest.chapter_id,
            chapter_name: weakest.chapter_name,
            subject_name: weakest.subject_name,
            accuracy: weakest.accuracy,
            weakness_level: weakest.weakness_level,
        };
    }

    // ═══════════════════════════════════════
    // SAATHI MEMORY
    // ═══════════════════════════════════════

    async saveSaathiMemory(userEmail: string, key: string, value: string): Promise<void> {
        const db = await getDatabase();
        const existing = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM saathi_memory WHERE user_email = ? AND key = ?', [userEmail, key]
        );
        if (existing) {
            await db.runAsync('UPDATE saathi_memory SET value = ?, updated_at = ? WHERE id = ?',
                [value, new Date().toISOString(), existing.id]);
        } else {
            await db.runAsync(
                'INSERT INTO saathi_memory (id, user_email, key, value, updated_at) VALUES (?, ?, ?, ?, ?)',
                [generateId(), userEmail, key, value, new Date().toISOString()]
            );
        }
    }

    async getSaathiMemory(userEmail: string, key: string): Promise<string | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ value: string }>(
            'SELECT value FROM saathi_memory WHERE user_email = ? AND key = ?', [userEmail, key]
        );
        return row?.value || null;
    }

    async getAllSaathiMemories(userEmail: string): Promise<Record<string, string>> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ key: string; value: string }>(
            'SELECT key, value FROM saathi_memory WHERE user_email = ?', [userEmail]
        );
        const mem: Record<string, string> = {};
        rows.forEach(r => { mem[r.key] = r.value; });
        return mem;
    }

    // ═══════════════════════════════════════
    // USER PROFILE EXTENSIONS
    // ═══════════════════════════════════════

    async setProfileValue(userEmail: string, key: string, value: string): Promise<void> {
        const db = await getDatabase();
        const existing = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM user_profile WHERE user_email = ? AND key = ?', [userEmail, key]
        );
        if (existing) {
            await db.runAsync('UPDATE user_profile SET value = ? WHERE id = ?', [value, existing.id]);
        } else {
            await db.runAsync(
                'INSERT INTO user_profile (id, user_email, key, value) VALUES (?, ?, ?, ?)',
                [generateId(), userEmail, key, value]
            );
        }
    }

    async getProfileValue(userEmail: string, key: string): Promise<string | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{ value: string }>(
            'SELECT value FROM user_profile WHERE user_email = ? AND key = ?', [userEmail, key]
        );
        return row?.value || null;
    }

    async getAllProfileValues(userEmail: string): Promise<Record<string, string>> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ key: string; value: string }>(
            'SELECT key, value FROM user_profile WHERE user_email = ?', [userEmail]
        );
        const profile: Record<string, string> = {};
        rows.forEach(r => { profile[r.key] = r.value; });
        return profile;
    }
}

export const gamificationService = new GamificationServiceClass();
