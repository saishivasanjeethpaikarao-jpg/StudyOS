import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import Constants from 'expo-constants';
import { useAccountSync } from '@/lib/sync';
import { getApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import type { AccountDevice } from '@open-sunsama/api-client';
import { Link } from 'expo-router';
import { openClock } from '@/lib/alarms';

/**
 * Settings screen
 */
export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const sync = useAccountSync();
  const [devices, setDevices] = useState<AccountDevice[]>([]);
  useEffect(() => { getApi().account.devices().then(setDevices).catch(() => undefined); }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study tools</Text>
          <View style={styles.menuCard}>
            <Link href="/(app)/focustube" asChild><TouchableOpacity style={styles.menuItem}><Text style={styles.menuItemText}>FocusTube 📺</Text><Text style={styles.menuItemValue}>›</Text></TouchableOpacity></Link>
            <Link href="/(app)/resources" asChild><TouchableOpacity style={styles.menuItem}><Text style={styles.menuItemText}>Resources</Text><Text style={styles.menuItemValue}>›</Text></TouchableOpacity></Link>
            <Link href="/(app)/notes" asChild><TouchableOpacity style={styles.menuItem}><Text style={styles.menuItemText}>Notes</Text><Text style={styles.menuItemValue}>›</Text></TouchableOpacity></Link>
            <Link href="/(app)/quizzes" asChild><TouchableOpacity style={styles.menuItem}><Text style={styles.menuItemText}>Knowledge checks</Text><Text style={styles.menuItemValue}>›</Text></TouchableOpacity></Link>
            <Link href="/(app)/reminders" asChild><TouchableOpacity style={styles.menuItem}><Text style={styles.menuItemText}>Reminders</Text><Text style={styles.menuItemValue}>›</Text></TouchableOpacity></Link>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              {user?.name && (
                <Text style={styles.userName}>{user.name}</Text>
              )}
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync</Text>
          <View style={styles.menuCard}>
            <View style={styles.menuItem}><Text style={styles.menuItemText}>Workspace sync</Text><Text style={[styles.menuItemValue, sync.status === 'offline' && styles.offline]}>{sync.status === 'syncing' ? 'Syncing…' : sync.status === 'offline' ? 'Offline' : 'Up to date'}</Text></View>
            <View style={styles.menuItem}><Text style={styles.menuItemText}>Pending changes</Text><Text style={styles.menuItemValue}>{sync.pendingCount}</Text></View>
            <TouchableOpacity style={styles.menuItem} onPress={() => void sync.syncNow()}><Text style={styles.menuItemText}>Sync now</Text><Text style={styles.menuItemValue}>↻</Text></TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devices</Text>
          <View style={styles.menuCard}>
            {devices.length === 0 ? <View style={styles.menuItem}><Text style={styles.menuItemValue}>This device will appear after the first sync.</Text></View> : devices.map((device) => <View key={device.id} style={styles.menuItem}><View style={{ flex: 1 }}><Text style={styles.menuItemText}>{device.displayName}</Text><Text style={styles.deviceMeta}>{device.platform} · {device.revokedAt ? 'Revoked' : 'Active'}</Text></View>{device.revokedAt ? null : <TouchableOpacity onPress={() => Alert.alert('Revoke device?', 'This device will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Revoke', style: 'destructive', onPress: () => getApi().account.revokeDevice(device.id).then(() => setDevices((current) => current.filter((item) => item.id !== device.id))).catch(() => undefined) }])}><Text style={styles.revoke}>Revoke</Text></TouchableOpacity>}</View>)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Android alarms</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={async () => { const res = await openClock(); if (res === 'unsupported') Alert.alert('Clock unavailable', 'No supported Clock application found on this device.'); }}>
              <Text style={styles.menuItemText}>Open Clock app</Text>
              <Text style={styles.menuItemValue}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => void Linking.openURL('app-settings:')}>
              <Text style={styles.menuItemText}>Notification permissions</Text>
              <Text style={styles.menuItemValue}>Open settings</Text>
            </TouchableOpacity>
            <Text style={styles.alarmNote}>StudyOS can hand selected Study Sessions to the Android Clock app. We only say it was opened; Clock remains responsible for confirming an alarm.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuItemText}>Timezone</Text>
              <Text style={styles.menuItemValue}>{user?.timezone || 'Not set'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <Text style={styles.menuItemText}>Version</Text>
              <Text style={styles.menuItemValue}>
                {Constants.expoConfig?.version || '1.0.0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  menuItemValue: {
    fontSize: 16,
    color: '#6b7280',
  },
  offline: { color: '#b45309' },
  deviceMeta: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  revoke: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
  alarmNote: { color: '#64748b', fontSize: 12, lineHeight: 18, padding: 16, paddingTop: 0 },
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
});
