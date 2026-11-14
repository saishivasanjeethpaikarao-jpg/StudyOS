import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { StudyOSWebShell } from '@/components/StudyOSWebShell';

/**
 * The Android/iOS app is a native shell around the production website.
 * Native login/tab screens are no longer the entry point — they were a
 * partial copy of the web UI and could not complete Google sign-in.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <StudyOSWebShell />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
});
