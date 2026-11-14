import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { getApi, setToken, setAuthToken } from '@/lib/api';

/**
 * Handles studyos://auth/callback?code=... deep links from Google OAuth.
 * Exchanges the one-time handoff code for the user JWT session and navigates to the app.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const code = params.code;

    if (!code) {
      setError('No authentication code was received. Please try logging in again.');
      return;
    }

    async function exchange() {
      try {
        const result = await getApi().auth.exchangeMobileHandoff(code!);
        if (!active) return;

        if (result?.token) {
          await setToken(result.token);
          setAuthToken(result.token);
          await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
          router.replace('/(app)');
        } else {
          throw new Error('No authentication token returned');
        }
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Authentication exchange failed';
        setError(msg);
      }
    }

    void exchange();

    return () => {
      active = false;
    };
  }, [params.code, queryClient]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Sign-in Failed</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Return to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>Completing Google sign-in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
