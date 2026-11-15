import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studyos.app',
  appName: 'StudyOS',
  webDir: 'dist',
  server: {
    url: 'https://studyos-web-8ruc.onrender.com',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  }
};

export default config;
