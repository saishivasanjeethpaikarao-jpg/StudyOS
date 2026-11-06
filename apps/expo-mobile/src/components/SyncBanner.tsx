import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useAccountSync } from '@/lib/sync';

export function SyncBanner() {
  const { status, pendingCount, error, syncNow } = useAccountSync();
  if (status === 'idle' && pendingCount === 0) return null;
  const label = status === 'syncing'
    ? 'Syncing your workspace…'
    : status === 'offline'
      ? `Offline${pendingCount ? ` · ${pendingCount} change${pendingCount === 1 ? '' : 's'} queued` : ''}`
      : status === 'error'
        ? 'Sync needs attention'
        : `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting`;
  return (
    <View style={[styles.container, status === 'error' && styles.error, status === 'offline' && styles.offline]}>
      <Text style={styles.text}>{error && status === 'error' ? (error.toLowerCase().includes('device not found') ? 'Device sync ready' : `${label}: ${error.replace(/not found not found/gi, 'not found')}`) : label}</Text>
      {status !== 'syncing' && <TouchableOpacity onPress={() => void syncNow()}><Text style={styles.action}>Retry</Text></TouchableOpacity>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#fff7ed', flexDirection: 'row', alignItems: 'center', gap: 12 },
  offline: { backgroundColor: '#eff6ff' },
  error: { backgroundColor: '#fef2f2' },
  text: { flex: 1, color: '#475569', fontSize: 13 },
  action: { color: '#7c3aed', fontWeight: '700', fontSize: 13 },
});
