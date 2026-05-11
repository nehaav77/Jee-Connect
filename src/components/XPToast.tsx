// JEE Connect - XP Toast Notification Component
// Floating "+X XP" that appears when XP is awarded
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppStore } from '@/src/store/appStore';
import { Colors } from '@/src/constants/theme';

export default function XPToast() {
    const showXPToast = useAppStore(s => s.showXPToast);
    const slideAnim = useRef(new Animated.Value(-80)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (showXPToast) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 16, useNativeDriver: true, tension: 80, friction: 10 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();

            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(slideAnim, { toValue: -80, duration: 300, useNativeDriver: true }),
                    Animated.timing(opacityAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]).start();
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [showXPToast]);

    if (!showXPToast) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
            <View style={styles.toast}>
                <Text style={styles.emoji}>⚡</Text>
                <View>
                    <Text style={styles.xpText}>+{showXPToast.amount} XP</Text>
                    <Text style={styles.actionText}>{showXPToast.action}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        alignItems: 'center',
        pointerEvents: 'none',
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 999,
        gap: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    emoji: { fontSize: 22 },
    xpText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    actionText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
});
