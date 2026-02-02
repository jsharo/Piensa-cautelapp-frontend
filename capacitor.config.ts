import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cautelapp.app',
  appName: 'PIENSA-Cautelapp-Frontend',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_alarm",
      iconColor: "#159A9C",
      sound: "alarm_sound.mp3"
    },
    BackgroundRunner: {
      label: 'com.cautelapp.alarm.check',
      src: 'background.js',
      event: 'checkAlarms',
      repeat: true,
      interval: 60, // Verificar cada 60 segundos
      autoStart: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;