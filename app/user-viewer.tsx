import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getDatabase } from '@/src/db/database';
import { Colors, Spacing, BorderRadius, FontSize } from '@/src/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

export default function UserViewerScreen() {
    const cs = useColorScheme();
    const isDark = cs === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const router = useRouter();

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const db = await getDatabase();
            const results = await db.getAllAsync('SELECT * FROM users ORDER BY created_at DESC');
            setUsers(results);
        } catch (e) {
            console.error('Error loading users:', e);
        } finally {
            setLoading(false);
        }
    }

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{item.email}</Text>
                <Text style={[styles.userPass, { color: Colors.info }]}>Password: {item.password}</Text>
            </View>
            <View style={styles.dateInfo}>
                <Text style={[styles.userDate, { color: theme.textMuted }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ 
                title: 'User Database (Debug)',
                headerShown: true,
                headerStyle: { backgroundColor: theme.surface },
                headerTintColor: theme.text
            }} />
            
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Registered Users</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Total: {users.length}
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={{ color: theme.textMuted }}>No users registered yet.</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity 
                style={[styles.backBtn, { backgroundColor: Colors.primary }]}
                onPress={() => router.back()}
            >
                <Text style={styles.backBtnText}>Close Viewer</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
    title: { fontSize: FontSize.xl, fontWeight: '800' },
    subtitle: { fontSize: FontSize.sm, marginTop: 4 },
    list: { padding: Spacing.md },
    userCard: { 
        padding: Spacing.md, 
        borderRadius: BorderRadius.md, 
        borderWidth: 1, 
        marginBottom: Spacing.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    userInfo: { flex: 1 },
    userName: { fontSize: FontSize.base, fontWeight: '700' },
    userEmail: { fontSize: FontSize.sm, marginTop: 2 },
    userPass: { fontSize: FontSize.xs, marginTop: 4, fontWeight: '600' },
    dateInfo: { alignItems: 'flex-end' },
    userDate: { fontSize: FontSize.xs },
    backBtn: { margin: Spacing.lg, padding: 16, borderRadius: BorderRadius.md, alignItems: 'center' },
    backBtnText: { color: '#fff', fontWeight: '800' },
    empty: { alignItems: 'center', marginTop: 100 }
});
