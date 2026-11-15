import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import { openClock, openClockAlarm, setCountdownTimer } from '@/lib/alarms';
import {
  cancelLocalReminderNotifications,
  scheduleLocalNotification,
} from '@/lib/notifications';
import { getApi, getToken, removeToken, setAuthToken, setToken } from '@/lib/api';

export const WEB_APP_URL = 'https://studyos-web-8ruc.onrender.com';
const API_URL = 'https://studyos-api-wy5w.onrender.com';

const INJECTED = `
(function () {
  window.__STUDYOS_NATIVE__ = true;
  window.__STUDYOS_PLATFORM__ = ${JSON.stringify(Platform.OS)};
  function postMessage(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }
  window.StudyOSNative = {
    setAlarm: function (startAt, label, timezone) {
      postMessage({ type: 'SET_ALARM', startAt: startAt, label: label, timezone: timezone });
    },
    setTimer: function (minutes, label) {
      postMessage({ type: 'SET_TIMER', minutes: minutes, label: label });
    },
    openClock: function () {
      postMessage({ type: 'OPEN_CLOCK' });
    },
    scheduleNotification: function (title, body, date, reminderId) {
      postMessage({ type: 'SCHEDULE_NOTIFICATION', title: title, body: body, date: date, reminderId: reminderId });
    },
    cancelReminderNotification: function (reminderId) {
      postMessage({ type: 'CANCEL_REMINDER_NOTIFICATION', reminderId: reminderId });
    },
    startGoogleAuth: function (url) {
      postMessage({ type: 'START_GOOGLE_AUTH', url: url });
    },
    setToken: function (token) {
      postMessage({ type: 'SET_TOKEN', token: token });
    },
    logout: function () {
      postMessage({ type: 'LOGOUT' });
    }
  };
})();
true;
`;

function getMobileHandoffCode(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== 'studyos:' && url.protocol !== 'opensunsama:') ||
      url.hostname !== 'auth' ||
      url.pathname !== '/callback'
    ) {
      return null;
    }
    return url.searchParams.get('code');
  } catch {
    return null;
  }
}

async function exchangeMobileHandoff(code: string): Promise<string> {
  const result = await getApi().auth.exchangeMobileHandoff(code);
  await setToken(result.token);
  setAuthToken(result.token);
  return result.token;
}

function isAllowedNavigation(url: string): boolean {
  if (url === 'about:blank') return true;
  try {
    const parsed = new URL(url);
    const trustedOrigins = new Set([
      WEB_APP_URL,
      API_URL,
      'https://accounts.google.com',
      'https://accounts.youtube.com',
      'https://ssl.gstatic.com',
      'https://www.gstatic.com',
      'https://www.googleapis.com',
      'https://apis.google.com',
      'https://oauth2.googleapis.com',
    ].map((origin) => new URL(origin).origin));
    return parsed.protocol === 'https:' && trustedOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

export function StudyOSWebShell() {
  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const bootstrapCompleteRef = useRef(false);
  const pendingDeepLinkRef = useRef<string | null>(null);
  const handledCodesRef = useRef(new Set<string>());
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [initialToken, setInitialToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isDark = useColorScheme() === 'dark';

  const source = useMemo(
    () => ({ uri: `${WEB_APP_URL}${initialToken ? '/app' : '/login'}` }),
    [initialToken],
  );
  const injectedJavaScript = useMemo(() => {
    const seedToken = initialToken
      ? `try { window.localStorage.setItem('open_sunsama_token', ${JSON.stringify(initialToken)}); } catch (error) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTH_STORAGE_ERROR', message: String(error) })); }`
      : '';
    return `${INJECTED}\n${seedToken}\ntrue;`;
  }, [initialToken]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setNotice(null), 4200);
  }, []);

  const handleMobileCallback = useCallback(async (url: string) => {
    const code = getMobileHandoffCode(url);
    if (!code || handledCodesRef.current.has(code)) return;
    handledCodesRef.current.add(code);
    try {
      const token = await exchangeMobileHandoff(code);
      setInitialToken(token);
      setError(null);
    } catch (callbackError) {
      const message = callbackError instanceof Error
        ? callbackError.message
        : 'The Google sign-in handoff could not be completed.';
      setError(`Google sign-in failed: ${message}`);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (bootstrapCompleteRef.current) {
        void handleMobileCallback(url);
      } else {
        pendingDeepLinkRef.current = url;
      }
    });

    void (async () => {
      try {
        const [initialUrl, storedToken] = await Promise.all([
          Linking.getInitialURL(),
          getToken(),
        ]);
        let token = storedToken ?? null;
        const code = initialUrl ? getMobileHandoffCode(initialUrl) : null;
        if (code && !handledCodesRef.current.has(code)) {
          handledCodesRef.current.add(code);
          token = await exchangeMobileHandoff(code);
        }
        if (active) setInitialToken(token);
      } catch (bootstrapError) {
        if (active) {
          const message = bootstrapError instanceof Error
            ? bootstrapError.message
            : 'Could not restore your saved StudyOS session.';
          setError(`Unable to prepare StudyOS: ${message}`);
        }
      } finally {
        if (active) {
          bootstrapCompleteRef.current = true;
          setBootstrapped(true);
          const pendingUrl = pendingDeepLinkRef.current;
          pendingDeepLinkRef.current = null;
          if (pendingUrl) void handleMobileCallback(pendingUrl);
        }
      }
    })();

    return () => {
      active = false;
      subscription.remove();
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, [handleMobileCallback]);

  const handleMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const sourceOrigin = new URL(event.nativeEvent.url).origin;
      if (sourceOrigin !== new URL(WEB_APP_URL).origin) return;
    } catch {
      return;
    }
    let data: {
      type?: string;
      url?: string;
      token?: string;
      startAt?: string;
      label?: string;
      timezone?: string;
      minutes?: number;
      title?: string;
      body?: string;
      date?: string;
      reminderId?: string;
      message?: string;
    };
    try {
      data = JSON.parse(event.nativeEvent.data) as typeof data;
    } catch (parseError) {
      console.error('StudyOS sent an invalid native bridge message.', parseError);
      return;
    }

    if (data.type === 'AUTH_STORAGE_ERROR') {
      setError('StudyOS could not restore your saved sign-in on this device. Try signing in again.');
      return;
    }
    if (data.type === 'START_GOOGLE_AUTH') {
      let authUrl: string | null = null;
      try {
        const url = new URL(data.url || '');
        if (
          url.origin === API_URL &&
          url.pathname === '/auth/google/start' &&
          url.searchParams.get('mobile_redirect_uri') === 'studyos://auth/callback'
        ) {
          authUrl = url.toString();
        }
      } catch {
        authUrl = null;
      }
      if (!authUrl) {
        showNotice('Could not start Google sign-in. Please try again.');
        return;
      }
      await Linking.openURL(authUrl);
      return;
    }
    if (data.type === 'SET_TOKEN') {
      if (!data.token) {
        console.error('StudyOS sent an empty authentication token to the native shell.');
        return;
      }
      await setToken(data.token);
      setAuthToken(data.token);
      return;
    }
    if (data.type === 'LOGOUT') {
      await removeToken();
      setAuthToken(null);
      setInitialToken(null);
      return;
    }

    if (data.type === 'SET_ALARM') {
      const label = data.label || 'Study session';
      const alarmResult = await openClockAlarm(
        data.startAt || '',
        label,
        data.timezone,
      );
      if (alarmResult === 'invalid-input') {
        showNotice('This alarm time or timezone is invalid, or the time has passed.');
        return;
      }
      const notificationResult = await scheduleLocalNotification({
        title: label,
        body: 'Your StudyOS study session is starting.',
        date: data.startAt,
      });
      if (alarmResult === 'unsupported' && notificationResult === 'scheduled') {
        showNotice('Clock could not set the alarm; a StudyOS notification is scheduled instead.');
      } else if (alarmResult === 'unsupported') {
        showNotice('Could not set the Clock alarm. Check Android Clock and notification permissions.');
      } else if (notificationResult === 'permission-denied') {
        showNotice('Alarm set in Clock. Allow notifications for a backup reminder.');
      } else {
        showNotice('Android Clock opened for confirmation. StudyOS will also remind you if notifications are allowed.');
      }
      return;
    }
    if (data.type === 'SET_TIMER') {
      const minutes = Number(data.minutes);
      const label = data.label || 'Study focus';
      const timerResult = await setCountdownTimer(minutes, label);
      if (timerResult === 'invalid-input') {
        showNotice('Enter a valid focus timer duration greater than zero.');
        return;
      }
      const notificationResult = await scheduleLocalNotification({
        title: label,
        body: `${minutes} minute focus block finished.`,
        secondsFromNow: minutes * 60,
      });
      if (timerResult === 'unsupported' && notificationResult === 'scheduled') {
        showNotice('Clock timer unavailable; StudyOS will notify you when the focus block ends.');
      } else if (timerResult === 'unsupported') {
        showNotice('Could not start a Clock timer or schedule its notification.');
      } else if (notificationResult === 'permission-denied') {
        showNotice('Timer started in Clock. Allow notifications for a backup reminder.');
      } else {
        showNotice('Android Clock opened for timer confirmation.');
      }
      return;
    }
    if (data.type === 'OPEN_CLOCK') {
      const result = await openClock();
      if (result === 'unsupported') showNotice('Android could not open the Clock app.');
      return;
    }
    if (data.type === 'SCHEDULE_NOTIFICATION') {
      const result = await scheduleLocalNotification({
        title: data.title || 'StudyOS reminder',
        body: data.body || '',
        date: data.date,
        reminderId: data.reminderId,
      });
      if (result === 'scheduled') {
        showNotice('Phone reminder scheduled.');
      } else if (result === 'permission-denied') {
        showNotice('Allow StudyOS notifications in Android settings to receive phone reminders.');
      } else {
        showNotice('Could not schedule that phone reminder. Check its date and time.');
      }
      return;
    }
    if (data.type === 'CANCEL_REMINDER_NOTIFICATION' && data.reminderId) {
      await cancelLocalReminderNotifications(data.reminderId);
    }
  }, [showNotice]);

  const handleRequest = useCallback((request: ShouldStartLoadRequest) => {
    const url = request.url;
    if (url.startsWith('studyos://') || url.startsWith('opensunsama://')) {
      void handleMobileCallback(url);
      return false;
    }
    if (url.startsWith('intent:') || url.startsWith('market:')) {
      void Linking.openURL(url).catch((openError) => {
        console.error('Could not open the requested Android app.', openError);
      });
      return false;
    }
    if (isAllowedNavigation(url)) return true;
    try {
      if (new URL(url).protocol === 'https:') {
        void Linking.openURL(url).catch((openError) => {
          console.error('Could not open the external StudyOS link.', openError);
        });
      }
    } catch {
      // Reject malformed and non-HTTPS URLs without handing them to another app.
    }
    return false;
  }, [handleMobileCallback]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBackRef.current) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, isDark && styles.containerDark]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#111318' : '#ffffff'}
      />
      {bootstrapped ? (
        <WebView
          ref={webViewRef}
          source={source}
          injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          onMessage={(event) => {
            void handleMessage(event).catch((bridgeError) => {
              console.error('StudyOS native action failed.', bridgeError);
              showNotice('StudyOS could not complete that Android action.');
            });
          }}
          onNavigationStateChange={(navigation) => {
            canGoBackRef.current = navigation.canGoBack;
          }}
          onLoadStart={() => {
            setLoading(true);
          }}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError('Unable to reach StudyOS. Check your connection and retry.');
          }}
          onShouldStartLoadWithRequest={handleRequest}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          mixedContentMode="never"
          originWhitelist={[WEB_APP_URL, API_URL, 'https://accounts.google.com', 'https://accounts.youtube.com', 'https://ssl.gstatic.com', 'https://www.gstatic.com', 'https://www.googleapis.com', 'https://apis.google.com', 'https://oauth2.googleapis.com', 'about:blank']}
          userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 StudyOSMobile/1.0.21"
          style={styles.webview}
        />
      ) : null}
      {(loading || !bootstrapped) && !error ? (
        <View style={[styles.overlay, isDark && styles.overlayDark]} pointerEvents="none">
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/icon.png')}
            style={styles.logo}
            accessibilityLabel="StudyOS"
          />
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={[styles.overlayTitle, isDark && styles.textDark]}>StudyOS</Text>
          <Text style={[styles.overlayText, isDark && styles.mutedDark]}>
            Opening your study space…
          </Text>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.overlay, isDark && styles.overlayDark]}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/icon.png')}
            style={styles.logo}
            accessibilityLabel="StudyOS"
          />
          <Text style={[styles.errorTitle, isDark && styles.textDark]}>Can’t open StudyOS</Text>
          <Text style={[styles.overlayText, isDark && styles.mutedDark]}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.retry}
            onPress={() => {
              setError(null);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {notice ? (
        <View style={[styles.notice, isDark && styles.noticeDark]} pointerEvents="none">
          <Text style={[styles.noticeText, isDark && styles.textDark]}>{notice}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  containerDark: { backgroundColor: '#111318' },
  webview: { flex: 1, backgroundColor: '#ffffff' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    zIndex: 20,
  },
  overlayDark: { backgroundColor: '#111318' },
  logo: { width: 52, height: 52, marginBottom: 20, borderRadius: 14 },
  overlayTitle: { marginTop: 16, color: '#171717', fontSize: 20, fontWeight: '700' },
  textDark: { color: '#f4f4f5' },
  mutedDark: { color: '#a1a1aa' },
  overlayText: { marginTop: 10, color: '#64748b', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  errorTitle: { color: '#171717', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  retry: {
    minHeight: 48,
    marginTop: 20,
    justifyContent: 'center',
    backgroundColor: '#f97316',
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  notice: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff7ed',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fed7aa',
    zIndex: 30,
  },
  noticeDark: { backgroundColor: '#292524', borderColor: '#57534e' },
  noticeText: { color: '#431407', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
