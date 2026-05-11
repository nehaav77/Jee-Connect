// JEE Connect - Subject Detail → Units & Chapters (Two-click navigation)
import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '@/src/constants/theme';
import { subjectRepository, UnitWithChapters, Subject } from '@/src/repositories/SubjectRepository';

export default function SubjectDetailScreen() {
    const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? Colors.dark : Colors.light;

    const [subject, setSubject] = useState<Subject | null>(null);
    const [units, setUnits] = useState<UnitWithChapters[]>([]);
    const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, [subjectId]);

    async function load() {
        try {
            const sub = await subjectRepository.getById(subjectId!);
            setSubject(sub);
            const hierarchy = await subjectRepository.getSubjectHierarchy(subjectId!);
            setUnits(hierarchy);
            if (hierarchy.length > 0) setExpandedUnit(hierarchy[0].id);
        } catch (e) { console.log(e); }
        finally { setLoading(false); }
    }

    if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Stack.Screen options={{ title: subject?.name || 'Subject' }} />

            {/* Subject Header */}
            <View style={[styles.header, { backgroundColor: subject?.color || Colors.primary }]}>
                <Text style={styles.headerEmoji}>{subject?.icon}</Text>
                <Text style={styles.headerTitle}>{subject?.name}</Text>
                <Text style={styles.headerSub}>{units.length} units · {units.reduce((a, u) => a + u.chapters.length, 0)} chapters</Text>
            </View>

            {/* Units Accordion */}
            {units.map(unit => {
                const isExpanded = expandedUnit === unit.id;
                return (
                    <View key={unit.id} style={[styles.unitCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                        <TouchableOpacity style={styles.unitHeader}
                            onPress={() => setExpandedUnit(isExpanded ? null : unit.id)} activeOpacity={0.7}>
                            <View style={[styles.unitBadge, { backgroundColor: (subject?.color || Colors.primary) + '20' }]}>
                                <Text style={[styles.unitBadgeText, { color: subject?.color || Colors.primary }]}>{unit.order_num}</Text>
                            </View>
                            <Text style={[styles.unitName, { color: theme.text }]}>{unit.name}</Text>
                            <Text style={[styles.unitCount, { color: theme.textMuted }]}>{unit.chapters.length} ch</Text>
                            <Text style={[styles.chevron, { color: theme.textMuted }]}>{isExpanded ? '▼' : '▶'}</Text>
                        </TouchableOpacity>

                        {isExpanded && unit.chapters.map(ch => (
                            <TouchableOpacity key={ch.id} style={[styles.chapterRow, { borderTopColor: theme.border }]}
                                onPress={() => router.push(`/chapter/${ch.id}` as any)} activeOpacity={0.7}>
                                <View style={[styles.chapterDot, { backgroundColor: subject?.color || Colors.primary }]} />
                                <Text style={[styles.chapterName, { color: theme.text }]}>{ch.name}</Text>
                                <Text style={[styles.chapterArrow, { color: theme.textMuted }]}>→</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
            })}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }, content: { padding: Spacing.md },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg, ...Shadow.md },
    headerEmoji: { fontSize: 48, marginBottom: 8 },
    headerTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 4 },
    unitCard: { borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm, overflow: 'hidden' },
    unitHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
    unitBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    unitBadgeText: { fontWeight: '800', fontSize: FontSize.sm },
    unitName: { flex: 1, fontSize: FontSize.base, fontWeight: '700' },
    unitCount: { fontSize: FontSize.xs, marginRight: 8 },
    chevron: { fontSize: 12 },
    chapterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderTopWidth: 0.5, marginLeft: 44 },
    chapterDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
    chapterName: { flex: 1, fontSize: FontSize.base },
    chapterArrow: { fontSize: 16 },
});
