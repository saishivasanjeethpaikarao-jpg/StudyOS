import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  Platform,
  ActivityIndicator,
  StatusBar,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { openClockAlarm, setCountdownTimer, openClock } from '@/lib/alarms';
import { router } from 'expo-router';

const WEB_APP_URL = 'https://studyos-web-8ruc.onrender.com';
const API_URL = 'https://studyos-api-wy5w.onrender.com';

const ALLOWED_ORIGINS = [
  WEB_APP_URL,
  API_URL,
  'https://accounts.google.com',
  'https://ssl.gstatic.com',
  'https://www.googleapis.com',
  'https://apis.google.com',
];

/**
 * Full-screen production WebView container that loads the complete StudyOS web app.
 * Bridges native Android clock alarm intents, focus countdown timers, and auth tokens.
 */
export default function AppLayout() {
  const { token, logout } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Injected JavaScript to seed localStorage with current auth token and register native bridges
  const injectedJS = React.useMemo(
    () => `
    (function() {
      try {
        var tk = ${JSON.stringify(token || '')};
        if (tk && !localStorage.getItem('open_sunsama_token')) {
          localStorage.setItem('open_sunsama_token', tk);
        }
        window.__STUDYOS_NATIVE__ = true;
        window.__STUDYOS_PLATFORM__ = ${JSON.stringify(Platform.OS)};
        window.StudyOSNative = {
          setAlarm: function(startAt, label, timezone) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SET_ALARM',
                startAt: startAt,
                label: label,
                timezone: timezone
              }));
            }
          },
          setTimer: function(minutes, label) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SET_TIMER',
                minutes: minutes,
                label: label
              }));
            }
          },
          openClock: function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'OPEN_CLOCK' }));
            }
          },
          logout: function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGOUT' }));
            }
          }
        };
      } catch(e) {}
    })();
    true;
  `,
    [token],
  );

  // Handle messages sent from the StudyOS web application
  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        switch (data.type) {
          case 'SET_ALARM':
            await openClockAlarm(data.startAt, data.label, data.timezone);
            break;
          case 'SET_TIMER':
            await setCountdownTimer(data.minutes || 25, data.label || 'Study Focus Timer');
            break;
          case 'OPEN_CLOCK':
            await openClock();
            break;
          case 'LOGOUT':
            logout();
            router.replace('/(auth)/login');
            break;
        }
      } catch {
        // Silently ignore unexpected message formats
      }
    },
    [logout],
  );

  // Hardware back button navigation inside WebView
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, []);

  const handleNavigation = useCallback((request: WebViewNavigation) => {
    const url = request.url;
    if (ALLOWED_ORIGINS.some((origin) => url.startsWith(origin))) {
      return true;
    }
    if (url.startsWith('about:') || url.startsWith('data:')) {
      return true;
    }
    // Allow Google auth callbacks
    if (url.includes('google') || url.includes('render.com')) {
      return true;
    }
    return false;
  }, []);

  const handleReload = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView
        ref={webViewRef}
        source={{ uri: `${WEB_APP_URL}/app` }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        onMessage={handleMessage}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onShouldStartLoadWithRequest={handleNavigation}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        mixedContentMode="compatibility"
        originWhitelist={['https://*', 'http://*']}
        userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 StudyOS-Mobile/1.0.19"
        style={styles.webview}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading StudyOS...</Text>
        </View>
      )}
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to reach StudyOS</Text>
          <Text style={styles.errorSub}>Please verify your internet connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
