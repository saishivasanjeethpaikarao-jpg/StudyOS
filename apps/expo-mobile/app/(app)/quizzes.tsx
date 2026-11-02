import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApi } from '@/lib/api';
import type { QuizSummary } from '@open-sunsama/types';
import { SyncBanner } from '@/components/SyncBanner';

export default function QuizzesScreen() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  useEffect(() => { getApi().quizzes.list().then(setQuizzes).catch(() => undefined); }, []);
  return <SafeAreaView style={styles.container} edges={['left', 'right']}><SyncBanner /><View style={styles.header}><Text style={styles.eyebrow}>CHECK YOURSELF</Text><Text style={styles.title}>Knowledge checks</Text><Text style={styles.subtitle}>Practice what you have learned with clear, deterministic scoring.</Text></View><FlatList data={quizzes} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No knowledge checks yet</Text><Text style={styles.subtitle}>Create quizzes in the web workspace, then take them here.</Text></View>} renderItem={({ item }) => <Link href={{ pathname: '/(app)/quiz/[id]', params: { id: item.id } }} asChild><TouchableOpacity style={styles.card}><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.subtitle}>{item.description || 'Ready when you are.'}</Text></View><Text style={styles.chevron}>›</Text></TouchableOpacity></Link>} /></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#f8fafc' }, header: { padding: 20, paddingBottom: 12 }, eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#172033', fontSize: 27, fontWeight: '800', marginTop: 5 }, subtitle: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 6 }, list: { padding: 16, paddingTop: 0 }, card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }, cardTitle: { color: '#172033', fontWeight: '800', fontSize: 17 }, chevron: { color: '#a78bfa', fontSize: 28, paddingLeft: 10 }, empty: { backgroundColor: '#fff', padding: 22, borderRadius: 15 }, emptyTitle: { color: '#172033', fontWeight: '800', fontSize: 18 } });
