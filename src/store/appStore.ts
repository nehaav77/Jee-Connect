// JEE Connect - Zustand Global Store
// Manages app-wide state with persistence

import { create } from 'zustand';
import emailjs from '@emailjs/browser';
import { userRepository } from '../repositories/UserRepository';
import { getDatabase } from '../db/database';
import { gamificationService } from '../services/GamificationService';

export type ConnectionType = 'wifi' | '4g' | '3g' | '2g' | 'none';
export type AppMode = 'urban' | 'lite';

interface XPToastData { amount: number; action: string; }

interface AppState {
    // Auth
    isAuthenticated: boolean;
    isParent: boolean;
    userEmail: string;
    isLoading: boolean;

    // Connectivity
    isOnline: boolean;
    connectionType: ConnectionType;
    appMode: AppMode;
    lastSyncTime: string | null;

    // User data
    userName: string;
    preferredLanguage: string;
    darkMode: boolean;

    // Active test session
    activeTestId: string | null;
    activeAttemptId: string | null;

    // Saathi AI
    saathiEnabled: boolean;
    stressLevel: number; // 0-1 scale

    // Sprint 2: Download & Bandwidth
    lowBandwidthMode: boolean;
    downloadProgress: number; // 0-100 overall

    // Sprint 9: Gamification
    currentXP: number;
    currentLevel: string;
    currentLevelEmoji: string;
    levelProgress: number;
    currentStreak: number;
    weeklyXPGoal: number;
    weeklyXPProgress: number;
    targetExam: string;
    targetYear: string;
    dreamCollege: string;
    studyTimePref: string;
    showXPToast: XPToastData | null;
    onboardingComplete: boolean;

    // Auth Actions
    login: (email: string, password?: string, isParent?: boolean) => Promise<{ success: boolean; message: string; user?: any }>;
    signup: (email: string, name: string, password?: string) => Promise<{ success: boolean; message: string; user?: any }>;
    logout: () => Promise<void>;
    initializeAuth: () => Promise<void>;
    requestOtp: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>;
    resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;

    // Actions
    setOnline: (online: boolean) => void;
    setConnectionType: (type: ConnectionType) => void;
    setAppMode: (mode: AppMode) => void;
    setLastSyncTime: (time: string) => void;
    setUserName: (name: string) => void;
    setPreferredLanguage: (lang: string) => void;
    toggleDarkMode: () => void;
    setActiveTest: (testId: string | null, attemptId: string | null) => void;
    setStressLevel: (level: number) => void;
    toggleSaathi: () => void;
    toggleLowBandwidth: () => void;
    setDownloadProgress: (progress: number) => void;

    // Sprint 9: Gamification Actions
    refreshGamificationData: (userEmail: string) => Promise<void>;
    triggerXPToast: (amount: number, action: string) => void;
    dismissXPToast: () => void;
    setOnboardingComplete: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Auth initial state
    isAuthenticated: false,
    isParent: false,
    userEmail: '',
    isLoading: false,

    // Initial state
    isOnline: false,
    connectionType: 'none',
    appMode: 'lite',
    lastSyncTime: null,

    userName: 'Student',
    preferredLanguage: 'en',
    darkMode: true,

    activeTestId: null,
    activeAttemptId: null,

    saathiEnabled: true,
    stressLevel: 0.5,

    lowBandwidthMode: false,
    downloadProgress: 0,

    // Sprint 9: Gamification initial state
    currentXP: 0,
    currentLevel: 'Aspirant',
    currentLevelEmoji: '📘',
    levelProgress: 0,
    currentStreak: 0,
    weeklyXPGoal: 500,
    weeklyXPProgress: 0,
    targetExam: '',
    targetYear: '',
    dreamCollege: '',
    studyTimePref: '',
    showXPToast: null,
    onboardingComplete: false,

    // Auth actions
    login: async (email, password, isParent = false) => {
        set({ isLoading: true });
        try {
            const user = await userRepository.findByEmail(email);
            if (!user) {
                return { success: false, message: 'No account found with this email. Please sign up.' };
            }

            if (user.password !== password) {
                return { success: false, message: 'Incorrect password. Please try again.' };
            }

            set({ isAuthenticated: true, isParent, userEmail: user.email, userName: user.name });

            // Persist session
            const db = await getDatabase();
            await db.runAsync('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', ['current_user_email', user.email]);
            await db.runAsync('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', ['is_parent_session', isParent ? 'true' : 'false']);

            return { success: true, message: isParent ? 'Welcome Parent!' : 'Welcome back!', user };
        } finally {
            set({ isLoading: false });
        }
    },

    signup: async (email, name, password) => {
        set({ isLoading: true });
        try {
            const existing = await userRepository.findByEmail(email);
            if (existing) {
                return { success: false, message: 'An account with this email already exists.' };
            }

            const user = await userRepository.create(email, name, password);
            set({ isAuthenticated: true, userEmail: user.email, userName: user.name });

            // Persist session
            const db = await getDatabase();
            await db.runAsync('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', ['current_user_email', user.email]);

            return { success: true, message: 'Account created successfully!', user };
        } catch (e) {
            console.error('Signup error:', e);
            return { success: false, message: 'Something went wrong. Please try again later.' };
        } finally {
            set({ isLoading: false });
        }
    },

    logout: async () => {
        set({ isAuthenticated: false, isParent: false, userEmail: '', userName: 'Student' });
        const db = await getDatabase();
        await db.runAsync('DELETE FROM user_settings WHERE key = ?', ['current_user_email']);
        await db.runAsync('DELETE FROM user_settings WHERE key = ?', ['is_parent_session']);
    },

    initializeAuth: async () => {
        try {
            const db = await getDatabase();
            const setting = await db.getFirstAsync<{ value: string }>('SELECT value FROM user_settings WHERE key = ?', ['current_user_email']);
            if (setting?.value) {
                const user = await userRepository.findByEmail(setting.value);
                if (user) {
                    const parentSetting = await db.getFirstAsync<{ value: string }>('SELECT value FROM user_settings WHERE key = ?', ['is_parent_session']);
                    set({
                        isAuthenticated: true,
                        userEmail: user.email,
                        userName: user.name,
                        isParent: parentSetting?.value === 'true'
                    });
                }
            }
        } catch (e) {
            console.error('Auth initialization error:', e);
        }
    },

    requestOtp: async (email) => {
        set({ isLoading: true });
        try {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            (global as any)._current_otp = { email, otp, timestamp: Date.now() };

            const SERVICE_ID = 'service_14wobqr';
            const TEMPLATE_ID = 'template_t3fhp1m';
            const PUBLIC_KEY = '_Rq5Y_R6AbPsxSewG';

            const templateParams = {
                email: email, 
                to_name: 'JEE Connect Student',
                otp_code: otp,
            };

            await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
            return { success: true, message: 'OTP sent successfully!' };
        } catch (e) {
            console.error('OTP Error:', e);
            return { success: false, message: 'Failed to send OTP. Please check your EmailJS config.' };
        } finally {
            set({ isLoading: false });
        }
    },

    resetPassword: async (email, otp, newPassword) => {
        const stored = (global as any)._current_otp;

        if (!stored || stored.email !== email || stored.otp !== otp) {
            return { success: false, message: 'Invalid or expired OTP.' };
        }

        if (Date.now() - stored.timestamp > 10 * 60 * 1000) {
            delete (global as any)._current_otp;
            return { success: false, message: 'OTP expired. Please request a new one.' };
        }

        try {
            const user = await userRepository.findByEmail(email);
            if (!user) return { success: false, message: 'User not found.' };

            // Update user password and save via repository to ensure sync
            user.password = newPassword;
            await userRepository.updateUser(user);

            delete (global as any)._current_otp;
            return { success: true, message: 'Password reset successfully! You can now login.' };
        } catch (e) {
            console.error('Reset Password Error:', e);
            return { success: false, message: 'Failed to update password.' };
        }
    },

    // Actions
    setOnline: (online) =>
        set((state) => ({
            isOnline: online,
            appMode: online && (state.connectionType === 'wifi' || state.connectionType === '4g')
                ? 'urban'
                : 'lite',
        })),

    setConnectionType: (type) =>
        set((state) => ({
            connectionType: type,
            appMode: state.isOnline && (type === 'wifi' || type === '4g') ? 'urban' : 'lite',
        })),

    setAppMode: (mode) => set({ appMode: mode }),
    setLastSyncTime: (time) => set({ lastSyncTime: time }),
    setUserName: (name) => set({ userName: name }),
    setPreferredLanguage: (lang) => set({ preferredLanguage: lang }),
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    setActiveTest: (testId, attemptId) =>
        set({ activeTestId: testId, activeAttemptId: attemptId }),
    setStressLevel: (level) => set({ stressLevel: Math.max(0, Math.min(1, level)) }),
    toggleSaathi: () => set((state) => ({ saathiEnabled: !state.saathiEnabled })),
    toggleLowBandwidth: () => set((state) => ({ lowBandwidthMode: !state.lowBandwidthMode })),
    setDownloadProgress: (progress) => set({ downloadProgress: Math.max(0, Math.min(100, progress)) }),

    // Sprint 9: Gamification actions
    refreshGamificationData: async (userEmail) => {
        try {
            const totalXP = await gamificationService.getTotalXP(userEmail);
            const level = gamificationService.getLevel(totalXP);
            const streakInfo = await gamificationService.getStreakInfo(userEmail);
            const weeklyXP = await gamificationService.getWeeklyXP(userEmail);
            const profile = await gamificationService.getAllProfileValues(userEmail);
            const onboarding = await gamificationService.getProfileValue(userEmail, 'onboarding_complete');
            set({
                currentXP: totalXP,
                currentLevel: level.title,
                currentLevelEmoji: level.emoji,
                levelProgress: level.progress,
                currentStreak: streakInfo.currentStreak,
                weeklyXPProgress: weeklyXP,
                targetExam: profile['target_exam'] || '',
                targetYear: profile['target_year'] || '',
                dreamCollege: profile['dream_college'] || '',
                studyTimePref: profile['study_time_pref'] || '',
                onboardingComplete: onboarding === 'true',
            });
        } catch (e) {
            console.log('[Store] Gamification refresh error:', e);
        }
    },
    triggerXPToast: (amount, action) => {
        set({ showXPToast: { amount, action } });
        setTimeout(() => set({ showXPToast: null }), 3000);
    },
    dismissXPToast: () => set({ showXPToast: null }),
    setOnboardingComplete: (v) => set({ onboardingComplete: v }),
}));
