// JEE Connect - Tab Navigator Layout
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: theme.textMuted,
                tabBarStyle: {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    borderTopWidth: 0.5,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    paddingTop: 8,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                headerStyle: { backgroundColor: theme.surface },
                headerTintColor: theme.text,
                headerShadowVisible: false,
                headerTitleStyle: { fontWeight: '700' },
            }}>
            <Tabs.Screen name="index" options={{
                title: 'Home',
                tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
                headerTitle: 'JEE Connect',
            }} />
            <Tabs.Screen name="subjects" options={{
                title: 'Subjects',
                tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
            }} />
            <Tabs.Screen name="tests" options={{
                title: 'Tests',
                tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
            }} />
            <Tabs.Screen name="saathi" options={{
                title: 'Saathi AI',
                tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
            }} />
            <Tabs.Screen name="profile" options={{
                title: 'Profile',
                tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
            }} />
        </Tabs>
    );
}
