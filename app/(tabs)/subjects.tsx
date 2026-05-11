// JEE Connect - Subjects Tab
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { subjectRepository, Subject } from '@/src/repositories/SubjectRepository';

export default function SubjectsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;
    const [subjects, setSubjects] = useState<(Subject & { chapterCount: number })[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const subs = await subjectRepository.getAll();
                const withCounts = await Promise.all(subs.map(async (s) => {
                    const count = await subjectRepository.getChapterCount(s.id);
                    return { ...s, chapterCount: count };
                }));
                setSubjects(withCounts);
            } catch (e) { console.log(e); }
        })();
    }, []);

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.heading, { color: theme.text }]}>Choose a Subject</Text>
            <Text style={[styles.subheading, { color: theme.textSecondary }]}>Two taps to any chapter — optimized for speed</Text>

            {subjects.map(sub => (
                <TouchableOpacity key={sub.id}
                    style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                    onPress={() => router.push(`/subject/${sub.id}` as any)} activeOpacity={0.7}>
                    <View style={[styles.iconBg, { backgroundColor: sub.color + '20' }]}>
                        <Text style={{ fontSize: 36 }}>{sub.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>{sub.name}</Text>
                        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{sub.chapterCount} chapters</Text>
                    </View>
                    <View style={[styles.arrow, { backgroundColor: sub.color + '15' }]}>
                        <Text style={{ color: sub.color, fontWeight: '800', fontSize: 18 }}>→</Text>
                    </View>
                </TouchableOpacity>
            ))}

            {subjects.length === 0 && (
                <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>📚</Text>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>Loading Subjects...</Text>
                    <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>Physics, Chemistry & Mathematics</Text>
                </View>
            )}
            <View style={{ height: 32 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.md },
    heading: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
    subheading: { fontSize: FontSize.sm, marginBottom: Spacing.lg },
    card: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.sm, ...Shadow.sm },
    iconBg: { width: 64, height: 64, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    cardTitle: { fontSize: FontSize.lg, fontWeight: '800' },
    cardMeta: { fontSize: FontSize.sm, marginTop: 4 },
    arrow: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    emptyState: { alignItems: 'center', padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1 },
    emptyTitle: { fontSize: FontSize.md, fontWeight: '700' },
    emptyDesc: { fontSize: FontSize.sm, marginTop: 4 },
});
