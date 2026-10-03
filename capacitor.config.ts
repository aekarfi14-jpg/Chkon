import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shkoun.family',
  appName: 'شكون؟',
  webDir: 'dist',
  android: {
    backgroundColor: '#090d16',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
