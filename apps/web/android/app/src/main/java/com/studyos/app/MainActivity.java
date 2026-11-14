package com.studyos.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.AlarmClock;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "StudyOSNative";
    private static final String PREFS_NAME = "studyos_prefs";
    private static final String TOKEN_KEY = "auth_token";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure Android window decor accommodates system bars (status bar, camera notch, navigation bar)
        try {
            androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                getWindow().setStatusBarColor(android.graphics.Color.parseColor("#090a0f"));
                getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#090a0f"));
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not set decor fits system windows", e);
        }

        requestNotificationPermission();
        createNotificationChannel();

        // Inject Native Bridge into Capacitor WebView
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.addJavascriptInterface(new StudyOSNativeBridge(), "StudyOSNative");
        }

        handleIntent(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        injectBridgeEnvironment();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    PERMISSION_REQUEST_CODE
                );
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                NotificationReceiver.CHANNEL_ID,
                "StudyOS Reminders",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Reminders for study sessions and deadlines");
            channel.enableVibration(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void injectBridgeEnvironment() {
        if (bridge != null && bridge.getWebView() != null) {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String savedToken = prefs.getString(TOKEN_KEY, null);

            StringBuilder js = new StringBuilder();
            js.append("window.__STUDYOS_NATIVE__ = true;\n");
            js.append("window.__STUDYOS_PLATFORM__ = 'android';\n");

            if (savedToken != null && !savedToken.isEmpty()) {
                js.append("try {\n");
                js.append("  if (!localStorage.getItem('open-sunsama-auth-token')) {\n");
                js.append("    localStorage.setItem('open-sunsama-auth-token', '").append(savedToken).append("');\n");
                js.append("  }\n");
                js.append("} catch (e) {}\n");
            }

            bridge.getWebView().post(() -> {
                bridge.getWebView().evaluateJavascript(js.toString(), null);
            });
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data != null && "studyos".equalsIgnoreCase(data.getScheme())) {
            final String fullUrl = data.toString();
            Log.d(TAG, "Received deep link: " + fullUrl);

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(() -> {
                    String script = "(function() {\n" +
                        "  if (typeof window.handleMobileAuthCallback === 'function') {\n" +
                        "    window.handleMobileAuthCallback('" + fullUrl + "');\n" +
                        "  } else {\n" +
                        "    window.location.hash = '#/app';\n" +
                        "  }\n" +
                        "})();";
                    bridge.getWebView().evaluateJavascript(script, null);
                });
            }
        }
    }

    public class StudyOSNativeBridge {

        @JavascriptInterface
        public void setAlarm(String startAt, String label, String timezone) {
            try {
                Log.d(TAG, "setAlarm called: " + startAt + ", label: " + label);
                ZoneId zoneId = ZoneId.systemDefault();
                if (timezone != null && !timezone.trim().isEmpty()) {
                    try {
                        zoneId = ZoneId.of(timezone.trim());
                    } catch (Exception ignored) {}
                }

                ZonedDateTime zdt;
                try {
                    Instant instant = Instant.parse(startAt);
                    zdt = instant.atZone(zoneId);
                } catch (Exception e) {
                    zdt = ZonedDateTime.parse(startAt, DateTimeFormatter.ISO_DATE_TIME);
                }

                int hour = zdt.getHour();
                int minute = zdt.getMinute();

                Intent intent = new Intent(AlarmClock.ACTION_SET_ALARM);
                intent.putExtra(AlarmClock.EXTRA_HOUR, hour);
                intent.putExtra(AlarmClock.EXTRA_MINUTES, minute);
                intent.putExtra(AlarmClock.EXTRA_MESSAGE, label != null && !label.isEmpty() ? label : "StudyOS Focus Session");
                intent.putExtra(AlarmClock.EXTRA_SKIP_UI, false);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error setting alarm", e);
            }
        }

        @JavascriptInterface
        public void setTimer(int minutes, String label) {
            try {
                Log.d(TAG, "setTimer called: " + minutes + "m, label: " + label);
                int durationSeconds = Math.max(1, minutes) * 60;
                Intent intent = new Intent(AlarmClock.ACTION_SET_TIMER);
                intent.putExtra(AlarmClock.EXTRA_LENGTH, durationSeconds);
                intent.putExtra(AlarmClock.EXTRA_MESSAGE, label != null && !label.isEmpty() ? label : "StudyOS Focus Timer");
                intent.putExtra(AlarmClock.EXTRA_SKIP_UI, false);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error setting timer", e);
            }
        }

        @JavascriptInterface
        public void openClock() {
            try {
                Intent intent = new Intent(AlarmClock.ACTION_SHOW_ALARMS);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error opening clock", e);
            }
        }

        @JavascriptInterface
        public void scheduleNotification(String title, String body, String dateStr, String reminderId) {
            try {
                Log.d(TAG, "scheduleNotification: " + title + " at " + dateStr);
                int id = reminderId != null ? Math.abs(reminderId.hashCode()) : (int) System.currentTimeMillis();

                long triggerTime = System.currentTimeMillis();
                if (dateStr != null && !dateStr.trim().isEmpty()) {
                    try {
                        triggerTime = Instant.parse(dateStr).toEpochMilli();
                    } catch (Exception e) {
                        try {
                            triggerTime = ZonedDateTime.parse(dateStr).toInstant().toEpochMilli();
                        } catch (Exception ignored) {}
                    }
                }

                Intent intent = new Intent(MainActivity.this, NotificationReceiver.class);
                intent.putExtra("title", title);
                intent.putExtra("body", body);
                intent.putExtra("id", id);

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    MainActivity.this,
                    id,
                    intent,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                        : PendingIntent.FLAG_UPDATE_CURRENT
                );

                AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null) {
                    if (triggerTime <= System.currentTimeMillis() + 1000) {
                        // Deliver immediately
                        sendBroadcast(intent);
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error scheduling notification", e);
            }
        }

        @JavascriptInterface
        public void cancelReminderNotification(String reminderId) {
            try {
                if (reminderId == null) return;
                int id = Math.abs(reminderId.hashCode());

                NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    manager.cancel(id);
                }

                Intent intent = new Intent(MainActivity.this, NotificationReceiver.class);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    MainActivity.this,
                    id,
                    intent,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE
                        : PendingIntent.FLAG_NO_CREATE
                );

                if (pendingIntent != null) {
                    AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
                    if (alarmManager != null) {
                        alarmManager.cancel(pendingIntent);
                    }
                    pendingIntent.cancel();
                }
            } catch (Exception e) {
                Log.e(TAG, "Error cancelling notification", e);
            }
        }

        @JavascriptInterface
        public void setToken(String token) {
            try {
                Log.d(TAG, "Saving native auth token");
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().putString(TOKEN_KEY, token).apply();
            } catch (Exception e) {
                Log.e(TAG, "Error setting token", e);
            }
        }

        @JavascriptInterface
        public String getToken() {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            return prefs.getString(TOKEN_KEY, null);
        }

        @JavascriptInterface
        public void startGoogleAuth(String url) {
            try {
                Log.d(TAG, "Starting Google Auth with URL: " + url);
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error starting Google Auth", e);
            }
        }

        @JavascriptInterface
        public void logout() {
            try {
                Log.d(TAG, "Logging out and clearing native session");
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit().remove(TOKEN_KEY).apply();
            } catch (Exception e) {
                Log.e(TAG, "Error during logout", e);
            }
        }
    }
}
