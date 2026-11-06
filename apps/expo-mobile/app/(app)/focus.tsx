import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getApi } from '@/lib/api';
import { useAccountSync } from '@/lib/sync';
import { SyncBanner } from '@/components/SyncBanner';
import { setCountdownTimer } from '@/lib/alarms';

export default function FocusScreen() {
  const sync = useAccountSync();
  const [active, setActive] = useState<{ id: string; startedAt: string; assignmentId?: string | null } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [targetMins, setTargetMins] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  const start = async (initialTarget?: number) => {
    setLoading(true);
    try {
      const session = await getApi().focus.start({});
      setActive(session);
      setElapsed(0);
      if (initialTarget) setTargetMins(initialTarget);
    } catch {
      // Offline fallback
      setActive({ id: 'local-' + Date.now(), startedAt: new Date().toISOString() });
      setElapsed(0);
      if (initialTarget) setTargetMins(initialTarget);
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    if (!active) return;
    try {
      if (!active.id.startsWith('local-')) {
        await getApi().focus.finish(active.id, 1);
      }
      setActive(null);
      setTargetMins(null);
      setElapsed(0);
      Alert.alert('Nice work! 🎯', 'Your focus time was recorded.');
      void sync.syncNow();
    } catch {
      setActive(null);
      setTargetMins(null);
      setElapsed(0);
    }
  };

  const handlePresetTimer = async (mins: number) => {
    setTargetMins(mins);
    void setCountdownTimer(mins, `${mins}m Deep Study Focus`).catch(() => {});
    if (!active) {
      await start(mins);
    }
  };

  // If a preset target is active, we can show countdown or count up
  const displaySeconds = targetMins
    ? Math.max(0, targetMins * 60 - elapsed)
    : elapsed;
  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <SyncBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>FOCUS</Text>
        <Text style={styles.title}>A little space to concentrate</Text>
        <Text style={styles.subtitle}>
          Start when you are ready. StudyOS will keep the session factual and simple.
        </Text>

        <View style={styles.timer}>
          <Text style={styles.timerText}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
          <Text style={styles.timerCaption}>
            {active
              ? targetMins
                ? `${targetMins}m Goal in progress`
                : 'Focus in progress'
              : 'Ready when you are'}
          </Text>
        </View>

        {active ? (
          <TouchableOpacity style={styles.stop} onPress={() => void finish()}>
            <Text style={styles.stopText}>Finish focus</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.start} onPress={() => void start()} disabled={loading}>
            <Text style={styles.startText}>{loading ? 'Starting…' : 'Start focus'}</Text>
          </TouchableOpacity>
        )}

        {/* Focus Timer Presets */}
        <View style={styles.alarmCard}>
          <Text style={styles.alarmCardTitle}>⏱️ Quick Focus Presets</Text>
          <Text style={styles.alarmCardSub}>
            Choose a target block. StudyOS tracks your study block and optionally sets your phone countdown timer.
          </Text>
          <View style={styles.timerRow}>
            <TouchableOpacity style={styles.timerPill} onPress={() => void handlePresetTimer(25)}>
              <Text style={styles.timerPillText}>25m Pomodoro</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerPill} onPress={() => void handlePresetTimer(45)}>
              <Text style={styles.timerPillText}>45m Block</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timerPill} onPress={() => void handlePresetTimer(60)}>
              <Text style={styles.timerPillText}>60m Deep</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>No lockouts, no pressure</Text>
          <Text style={styles.subtitle}>
            Focus is a record of your study time, not a restriction on your device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#172033', fontSize: 28, fontWeight: '800', marginTop: 6, lineHeight: 34 },
  subtitle: { color: '#64748b', lineHeight: 20, marginTop: 8 },
  timer: { backgroundColor: '#21134f', borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingVertical: 52, marginTop: 28 },
  timerText: { color: '#fff', fontSize: 62, fontWeight: '200', letterSpacing: 3 },
  timerCaption: { color: '#c4b5fd', marginTop: 12, fontWeight: '700' },
  start: { backgroundColor: '#7c3aed', borderRadius: 15, alignItems: 'center', padding: 17, marginTop: 14 },
  startText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  stop: { backgroundColor: '#f97316', borderRadius: 15, alignItems: 'center', padding: 17, marginTop: 14 },
  stopText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  alarmCard: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginTop: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  alarmCardTitle: { color: '#172033', fontWeight: '800', fontSize: 15, marginBottom: 4 },
  alarmCardSub: { color: '#64748b', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  timerRow: { flexDirection: 'row', gap: 10 },
  timerPill: { flex: 1, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  timerPillText: { color: '#b45309', fontWeight: '800', fontSize: 12 },
  note: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginTop: 18 },
  noteTitle: { color: '#172033', fontWeight: '800', marginBottom: 4 },
});
