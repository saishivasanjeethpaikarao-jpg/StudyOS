import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { format, addDays } from 'date-fns';
import { useStudySessions } from '@/hooks/useStudyOS';
import { SyncBanner } from '@/components/SyncBanner';
import { formatInZone } from '@/lib/date';

export default function PlanScreen() {
  const [date, setDate] = useState(new Date());
  const day = format(date, 'yyyy-MM-dd');
  const { data: sessions = [], isLoading, refetch } = useStudySessions();
  const daySessions = sessions.filter((session) => format(session.startAt, 'yyyy-MM-dd') === day && session.status === 'planned');
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <SyncBanner />
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>PLAN</Text><Text style={styles.title}>Make time for what matters</Text></View>
        <Link href="/(app)/calendar" asChild><TouchableOpacity style={styles.secondary}><Text style={styles.secondaryText}>Calendar</Text></TouchableOpacity></Link>
      </View>
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => setDate((value) => addDays(value, -1))}><Text style={styles.arrow}>‹</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(new Date())}><Text style={styles.date}>{format(date, 'EEE, MMM d')}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setDate((value) => addDays(value, 1))}><Text style={styles.arrow}>›</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} onScrollEndDrag={() => void refetch()}>
        <View style={styles.summary}><Text style={styles.summaryNumber}>{daySessions.length}</Text><Text style={styles.summaryLabel}>planned study session{daySessions.length === 1 ? '' : 's'}</Text></View>
        {isLoading ? <Text style={styles.muted}>Loading your plan…</Text> : daySessions.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>A clear day</Text><Text style={styles.muted}>Plan study from an assignment and your sessions will appear here.</Text></View>
        ) : daySessions.map((session) => (
          <View key={session.id} style={styles.session}><View style={styles.sessionAccent} /><View style={styles.sessionBody}><Text style={styles.sessionTime}>{formatInZone(session.startAt, session.timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – {formatInZone(session.endAt, session.timezone, { hour: 'numeric', minute: '2-digit' })}</Text><Text style={styles.sessionTitle}>Study session</Text><Text style={styles.muted}>{session.plannedMinutes} minutes · {session.timezone}</Text></View></View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#172033', fontSize: 23, fontWeight: '800', marginTop: 4, maxWidth: 230 },
  secondary: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#ede9fe', borderRadius: 10 },
  secondaryText: { color: '#6d28d9', fontWeight: '700', fontSize: 12 },
  dateRow: { marginHorizontal: 16, padding: 8, borderRadius: 16, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  arrow: { color: '#7c3aed', fontSize: 30, lineHeight: 34, paddingHorizontal: 12 },
  date: { color: '#172033', fontWeight: '800', fontSize: 16 },
  content: { padding: 16, paddingBottom: 32 },
  summary: { backgroundColor: '#21134f', borderRadius: 18, padding: 20, marginBottom: 16 },
  summaryNumber: { color: '#fff', fontSize: 34, fontWeight: '800' },
  summaryLabel: { color: '#ddd6fe', marginTop: 4 },
  session: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  sessionAccent: { width: 5, backgroundColor: '#f97316' },
  sessionBody: { padding: 16 },
  sessionTime: { color: '#7c3aed', fontWeight: '800', fontSize: 13 },
  sessionTitle: { color: '#172033', fontWeight: '800', fontSize: 17, marginTop: 5 },
  muted: { color: '#64748b', lineHeight: 20 },
  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 22 },
  emptyTitle: { color: '#172033', fontSize: 18, fontWeight: '800', marginBottom: 5 },
});
