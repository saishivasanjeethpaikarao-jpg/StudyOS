import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApi } from '@/lib/api';
import { useAccountSync } from '@/lib/sync';
import { SyncBanner } from '@/components/SyncBanner';

export default function FocusScreen() {
  const sync = useAccountSync();
  const [active, setActive] = useState<{ id: string; startedAt: string; assignmentId?: string | null } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!active) return; const timer = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000))), 1000); return () => clearInterval(timer); }, [active]);
  const start = async () => {
    setLoading(true);
    try { const session = await getApi().focus.start({}); setActive(session); setElapsed(0); }
    catch (error) { Alert.alert('Could not start focus', error instanceof Error ? error.message : 'Try again'); }
    finally { setLoading(false); }
  };
  const finish = async () => {
    if (!active) return;
    try { await getApi().focus.finish(active.id, 1); setActive(null); Alert.alert('Nice work', 'Your focus time was saved.'); void sync.syncNow(); }
    catch (error) { Alert.alert('Could not finish focus', error instanceof Error ? error.message : 'Try again'); }
  };
  const minutes = Math.floor(elapsed / 60); const seconds = elapsed % 60;
  return <SafeAreaView style={styles.container} edges={['left', 'right']}><SyncBanner /><ScrollView contentContainerStyle={styles.content}><Text style={styles.eyebrow}>FOCUS</Text><Text style={styles.title}>A little space to concentrate</Text><Text style={styles.subtitle}>Start when you are ready. StudyOS will keep the session factual and simple.</Text><View style={styles.timer}><Text style={styles.timerText}>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</Text><Text style={styles.timerCaption}>{active ? 'Focus in progress' : 'Ready when you are'}</Text></View>{active ? <TouchableOpacity style={styles.stop} onPress={() => void finish()}><Text style={styles.stopText}>Finish focus</Text></TouchableOpacity> : <TouchableOpacity style={styles.start} onPress={() => void start()} disabled={loading}><Text style={styles.startText}>{loading ? 'Starting…' : 'Start focus'}</Text></TouchableOpacity>}<View style={styles.note}><Text style={styles.noteTitle}>No lockouts, no pressure</Text><Text style={styles.subtitle}>Focus is a record of your study time, not a restriction on your device.</Text></View></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#f8fafc' }, content: { padding: 20 }, eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, title: { color: '#172033', fontSize: 28, fontWeight: '800', marginTop: 6, lineHeight: 34 }, subtitle: { color: '#64748b', lineHeight: 20, marginTop: 8 }, timer: { backgroundColor: '#21134f', borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingVertical: 52, marginTop: 28 }, timerText: { color: '#fff', fontSize: 62, fontWeight: '200', letterSpacing: 3 }, timerCaption: { color: '#c4b5fd', marginTop: 12, fontWeight: '700' }, start: { backgroundColor: '#7c3aed', borderRadius: 15, alignItems: 'center', padding: 17, marginTop: 14 }, startText: { color: '#fff', fontWeight: '800', fontSize: 17 }, stop: { backgroundColor: '#f97316', borderRadius: 15, alignItems: 'center', padding: 17, marginTop: 14 }, stopText: { color: '#fff', fontWeight: '800', fontSize: 17 }, note: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginTop: 22 }, noteTitle: { color: '#172033', fontWeight: '800', marginBottom: 4 } });
