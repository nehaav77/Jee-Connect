// JEE Connect - Login / Signup Screen
import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
    Platform, ScrollView, Animated, Alert, Dimensions,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { useAppStore } from '@/src/store/appStore';
import { useRouter } from 'expo-router';

const { width: SW } = Dimensions.get('window');

export default function AuthScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const { login, signup, requestOtp, resetPassword } = useAppStore();
    const router = useRouter();

    const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'reset' | 'parents'>('login');
    const isSignup = authMode === 'signup';
    const isForgot = authMode === 'forgot';
    const isReset = authMode === 'reset';
    const isParents = authMode === 'parents';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;

    // Cross-platform Alert Helper
    const showAlert = (title: string, message: string) => {
        console.log(`[AUTH ALERT] ${title}: ${message}`);
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    function toggleMode() {
        const nextMode = isSignup ? 'login' : 'signup';
        setAuthMode(nextMode);
        setPassword('');
        setConfirmPassword('');
        
        Animated.spring(slideAnim, {
            toValue: nextMode === 'signup' ? 1 : 0,
            useNativeDriver: true,
            tension: 60,
            friction: 12,
        }).start();
    }

    function validate(): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) { showAlert('Error', 'Please enter your email'); return false; }
        if (!emailRegex.test(email.trim())) { showAlert('Invalid Format', 'Please enter a valid email address (e.g. name@domain.com)'); return false; }
        if (password.length < 6) { showAlert('Weak Password', 'Password must be at least 6 characters for security.'); return false; }
        if (isSignup) {
            if (!name.trim()) { showAlert('Error', 'Please enter your name'); return false; }
            if (password !== confirmPassword) { showAlert('Error', 'Passwords do not match'); return false; }
        }
        return true;
    }

    async function handleForgotPassword() {
        if (!email.trim()) {
            showAlert('Email Required', 'Please enter your email address to recover your password.');
            return;
        }
        setLoading(true);
        console.log('[AUTH] OTP requested for:', email);
        const result = await requestOtp(email.trim());
        setLoading(false);
        
        if (result.success) {
            showAlert('OTP Sent (SIMULATED)', `${result.message}\n\nYOUR OTP CODE IS: ${result.otp}`);
            setAuthMode('reset');
        } else {
            showAlert('Error', result.message);
        }
    }

    async function handleResetPassword() {
        if (!otp.trim() || otp.length !== 6) {
            showAlert('Invalid OTP', 'Please enter the 6-digit OTP sent to your email.');
            return;
        }
        if (password.length < 6) {
            showAlert('Weak Password', 'New password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        const result = await resetPassword(email.trim(), otp.trim(), password);
        setLoading(false);

        if (result.success) {
            showAlert('Success', result.message);
            setAuthMode('login');
            setPassword('');
        } else {
            showAlert('Failed', result.message);
        }
    }

    async function handleDebugPrintUsers() {
        console.log('[DEBUG] Querying user table...');
        const { userRepository } = require('@/src/repositories/UserRepository');
        await userRepository.debugListAll();
        showAlert('Debug Info', 'Database contents printed to the console (F12 or Metro logs).');
    }

    const handleExportDatabase = async () => {
        const { userRepository } = require('@/src/repositories/UserRepository');
        const users = await userRepository.getAll();
        
        let sql = "-- JEE Connect Database Export\n";
        sql += "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, password TEXT, created_at TEXT);\n";
        users.forEach((u: any) => {
            sql += `INSERT INTO users (id, email, name, password, created_at) VALUES ('${u.id}', '${u.email}', '${u.name}', '${u.password}', '${u.created_at}');\n`;
        });

        if (Platform.OS === 'web') {
            const blob = new Blob([sql], { type: 'text/sql' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'jee_connect_db.sql';
            a.click();
            showAlert('Success', 'Database exported as jee_connect_db.sql. Check your Downloads folder!');
        } else {
            console.log('--- SQL EXPORT ---\n', sql);
            showAlert('Native Export', 'SQL script printed to console. Copy it to a .sql file on your system.');
        }
    };

    async function handleSubmit() {
        console.log('[AUTH] handleSubmit triggered. Mode:', authMode.toUpperCase());
        if (!validate()) {
            console.log('[AUTH] Validation failed');
            return;
        }
        setLoading(true);

        try {
            let result;
            if (isParents) {
                console.log('[AUTH] Attempting parents login for:', email);
                result = await login(email.trim(), password, true); // true = isParent
            } else if (isSignup) {
                console.log('[AUTH] Attempting signup for:', email);
                result = await signup(email.trim(), name.trim() || 'Student', password);
            } else {
                console.log('[AUTH] Attempting login for:', email);
                result = await login(email.trim(), password);
            }

            console.log('[AUTH] Result received:', result);
            setLoading(false);

            if (result.success) {
                console.log('[AUTH] Success! Navigating...');
                // AUTO-PRINT DATABASE TO TERMINAL FOR ADMIN
                if (__DEV__) {
                    const { userRepository } = require('@/src/repositories/UserRepository');
                    userRepository.debugListAll();
                }
                
                if (isParents) {
                    router.replace('/parent-dashboard' as any);
                } else if (isSignup) {
                    router.replace('/onboarding' as any);
                } else {
                    router.replace('/(tabs)');
                }
            } else {
                console.log('[AUTH] Failure:', result.message);
                showAlert('Authentication Failed', result.message);
            }
        } catch (e) {
            console.error('[AUTH] Critical error during handleSubmit:', e);
            setLoading(false);
            showAlert('Critical Error', 'An unexpected error occurred. Check the console logs.');
        }
    }

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Logo & Branding */}
                <View style={styles.brandSection}>
                    <View style={[styles.logoCircle, { backgroundColor: Colors.primary }]}>
                        <Text style={styles.logoEmoji}>🚀</Text>
                    </View>
                    
                    <Text style={[styles.appName, { color: theme.text }]}>JEE Connect</Text>
                    <Text style={[styles.tagline, { color: theme.textSecondary }]}>
                        The Resilient Learning Ecosystem
                    </Text>
                </View>

                {/* Auth Card */}
                <View style={[styles.authCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    {/* Tab Toggle */}
                    <View style={[styles.tabToggle, { backgroundColor: theme.surfaceElevated }]}>
                        <TouchableOpacity style={[styles.tabBtn, (authMode === 'login' || authMode === 'forgot' || authMode === 'reset') && styles.tabBtnActive]}
                            onPress={() => setAuthMode('login')} activeOpacity={0.7}>
                            <Text style={[styles.tabText, { color: (authMode === 'login' || authMode === 'forgot' || authMode === 'reset') ? '#fff' : theme.textSecondary }]}>Student</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tabBtn, isSignup && styles.tabBtnActive]}
                            onPress={() => setAuthMode('signup')} activeOpacity={0.7}>
                            <Text style={[styles.tabText, { color: isSignup ? '#fff' : theme.textSecondary }]}>Sign Up</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tabBtn, isParents && styles.tabBtnActive]}
                            onPress={() => setAuthMode('parents')} activeOpacity={0.7}>
                            <Text style={[styles.tabText, { color: isParents ? '#fff' : theme.textSecondary }]}>Parents</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Reset Header */}
                    {(isForgot || isReset) && (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[styles.appName, { color: theme.text, fontSize: 20 }]}>Password Reset</Text>
                            <TouchableOpacity onPress={() => setAuthMode('login')}>
                                <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '700' }}>← Back to login</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Name Field (Signup only) */}
                    {isSignup && (
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                                placeholder="Enter your name"
                                placeholderTextColor={theme.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>
                    )}

                    {/* Email Field */}
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                            placeholder="your@email.com"
                            placeholderTextColor={theme.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* OTP Field (Reset only) */}
                    {isReset && (
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>6-Digit OTP</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                                placeholder="123456"
                                placeholderTextColor={theme.textMuted}
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                        </View>
                    )}

                    {/* Password Field */}
                    {(authMode !== 'forgot') && (
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>
                                {isReset ? 'New Password' : 'Password'}
                            </Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                                placeholder="Min 6 characters"
                                placeholderTextColor={theme.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    )}

                    {/* Confirm Password (Signup only) */}
                    {isSignup && (
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                                placeholder="Re-enter password"
                                placeholderTextColor={theme.textMuted}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: Colors.primary, opacity: loading ? 0.7 : 1 }]}
                        onPress={isForgot ? handleForgotPassword : isReset ? handleResetPassword : handleSubmit}
                        disabled={loading}
                        activeOpacity={0.8}>
                        <Text style={styles.submitText}>
                            {loading ? '⏳ Please wait...' : isForgot ? 'Send OTP →' : isReset ? 'Reset Password' : isParents ? 'Parent Login →' : isSignup ? 'Create Account' : 'Student Login →'}
                        </Text>
                    </TouchableOpacity>

                    {/* Forgot Password (Login only) */}
                    {(authMode === 'login' || authMode === 'parents') && (
                        <TouchableOpacity style={styles.forgotBtn} onPress={() => setAuthMode('forgot')} activeOpacity={0.7}>
                            <Text style={[styles.forgotText, { color: Colors.primary }]}>Forgot password?</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Features Preview */}
                <View style={styles.features}>
                    {[
                        { icon: '📴', text: 'Works 100% offline' },
                        { icon: '🔒', text: 'AES-256 encrypted data' },
                        { icon: '🤖', text: 'AI study companion' },
                    ].map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                            <Text style={{ fontSize: 16 }}>{f.icon}</Text>
                            <Text style={[styles.featureText, { color: theme.textSecondary }]}>{f.text}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, maxWidth: 440, alignSelf: 'center', width: '100%' },
    brandSection: { alignItems: 'center', marginBottom: Spacing.xl },
    logoCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16, ...Shadow.lg },
    logoEmoji: { fontSize: 40 },
    appName: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    tagline: { fontSize: FontSize.sm, marginTop: 4 },
    authCard: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.xl, ...Shadow.md },
    tabToggle: { flexDirection: 'row', borderRadius: BorderRadius.full, padding: 4, marginBottom: Spacing.lg },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.full, alignItems: 'center' },
    tabBtnActive: { backgroundColor: Colors.primary },
    tabText: { fontWeight: '700', fontSize: FontSize.sm },
    fieldGroup: { marginBottom: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: FontSize.base, minHeight: 48 },
    submitBtn: { paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.sm },
    submitText: { color: '#fff', fontWeight: '800', fontSize: FontSize.base },
    forgotBtn: { alignItems: 'center', marginTop: Spacing.md },
    forgotText: { fontWeight: '600', fontSize: FontSize.sm },
    features: { marginTop: Spacing.xl, gap: 12 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureText: { fontSize: FontSize.sm },
});
