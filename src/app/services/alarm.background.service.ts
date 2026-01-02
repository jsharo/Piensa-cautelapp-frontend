import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { BackgroundRunner } from '@capacitor/background-runner';
import { App } from '@capacitor/app';

export interface ScheduledAlarm {
  notificationId: number;
  alarmId: string;
  triggerAt: number; // timestamp
  label: string;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlarmBackgroundService {
  private scheduledAlarms: ScheduledAlarm[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Solicitar permisos
    await this.requestPermissions();

    // Configurar listener para notificaciones
    await this.setupNotificationListeners();

    // Registrar tarea en background
    await this.registerBackgroundTask();
  }

  private async requestPermissions(): Promise<void> {
    try {
      const result = await LocalNotifications.requestPermissions();
      if (result.display !== 'granted') {
        console.warn('Permisos de notificación no concedidos');
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
    }
  }

  async scheduleAlarm(alarm: any): Promise<number> {
    try {
      // Calcular fecha/hora del próximo disparo
      const triggerDate = this.calculateNextTrigger(alarm);

      // Generar ID único para la notificación
      const notificationId = this.generateNotificationId(alarm);

      // Crear canal (Android)
      await this.createAlarmChannel();

      // Programar la notificación
      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title: '⏰ ' + alarm.label,
          body: alarm.notes || `Hora de ${alarm.category}`,
          schedule: { at: new Date(triggerDate) },
          sound: 'alarm_sound.mp3', // Nombre del archivo en res/raw
          extra: {
            alarmId: alarm.id,
            type: 'ALARM_TRIGGER',
            category: alarm.category,
            label: alarm.label
          },
          channelId: 'alarm_channel',
          ongoing: true,
          autoCancel: false,
          smallIcon: 'ic_stat_alarm',
          largeIcon: 'ic_launcher', // Ícono grande
          actionTypeId: 'ALARM_ACTION'
        }]
      });

      // Guardar referencia
      this.scheduledAlarms.push({
        notificationId,
        alarmId: alarm.id,
        triggerAt: triggerDate.getTime(),
        label: alarm.label,
        category: alarm.category
      });

      this.saveScheduledAlarms();
      console.log(`Alarma programada: ${alarm.label} a las ${alarm.time}`);

      return notificationId;
    } catch (error) {
      console.error('Error programando alarma:', error);
      throw error;
    }
  }

  async cancelAlarm(alarmId: string): Promise<void> {
    try {
      const alarmIndex = this.scheduledAlarms.findIndex(a => a.alarmId === alarmId);
      if (alarmIndex !== -1) {
        const scheduledAlarm = this.scheduledAlarms[alarmIndex];
        await LocalNotifications.cancel({
          notifications: [{ id: scheduledAlarm.notificationId }]
        });

        this.scheduledAlarms.splice(alarmIndex, 1);
        this.saveScheduledAlarms();
      }
    } catch (error) {
      console.error('Error cancelando alarma:', error);
    }
  }

  async cancelAllAlarms(): Promise<void> {
    try {
      if (this.scheduledAlarms.length > 0) {
        await LocalNotifications.cancel({
          notifications: this.scheduledAlarms.map(alarm => ({ id: alarm.notificationId }))
        });
      }
      this.scheduledAlarms = [];
      localStorage.removeItem('scheduled_alarms');
    } catch (error) {
      console.error('Error cancelando todas las alarmas:', error);
    }
  }

  async rescheduleAllAlarms(alarms: any[]): Promise<void> {
    await this.cancelAllAlarms();

    for (const alarm of alarms.filter(a => a.enabled)) {
      await this.scheduleAlarm(alarm);
    }
  }

  private calculateNextTrigger(alarm: any): Date {
    const now = new Date();
    const [hours, minutes] = alarm.time.split(':').map(Number);

    // Crear fecha para hoy con la hora de la alarma
    const triggerDate = new Date();
    triggerDate.setHours(hours, minutes, 0, 0);

    // Si la hora ya pasó hoy, programar para mañana
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    // Si tiene días de repetición, calcular el próximo día válido
    if (alarm.repeatDays && alarm.repeatDays.length > 0) {
      let daysToAdd = 0;
      const currentDay = now.getDay(); // 0=Dom, 6=Sab

      // Buscar el próximo día válido
      for (let i = 1; i <= 7; i++) {
        const nextDay = (currentDay + i) % 7;
        if (alarm.repeatDays.includes(nextDay)) {
          daysToAdd = i;
          break;
        }
      }

      if (daysToAdd > 0) {
        triggerDate.setDate(triggerDate.getDate() + daysToAdd);
      }
    }

    return triggerDate;
  }

  private generateNotificationId(alarm: any): number {
    // Genera un ID único basado en el ID de la alarma
    return parseInt(alarm.id.substring(0, 8), 16) % 1000000;
  }

  private async createAlarmChannel(): Promise<void> {
    try {
      if ((window as any).capacitorPlatform === 'android') {
        await LocalNotifications.createChannel({
          id: 'alarm_channel',
          name: 'Alarmas',
          description: 'Canal para alarmas de medicamentos y citas',
          importance: 5, // IMPORTANCE_HIGH para sonar incluso en no molestar
          vibration: true,
          sound: 'alarm_sound.mp3', // Nombre del archivo en res/raw
          lights: true,
          lightColor: '#FF0000',
          visibility: 1 // Public
        });
      }
    } catch (error) {
      console.error('Error creando canal:', error);
    }
  }

  private async setupNotificationListeners(): Promise<void> {
    // Cuando se hace clic en la notificación
    LocalNotifications.addListener('localNotificationActionPerformed', async (action: any) => {
      const alarmId = action.notification.extra?.alarmId;
      const type = action.notification.extra?.type;

      if (type === 'ALARM_TRIGGER' && alarmId) {
        console.log('Alarma clickeada:', alarmId);
        window.dispatchEvent(new CustomEvent('alarmTriggered', {
          detail: { alarmId }
        }));
      }
    });

    // NUEVO: Escuchar notificaciones recibidas en primer plano
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      const alarmId = notification.extra?.alarmId;
      const type = notification.extra?.type;

      if (type === 'ALARM_TRIGGER' && alarmId) {
        console.log('Alarma recibida en primer plano:', alarmId);
        window.dispatchEvent(new CustomEvent('alarmTriggered', {
          detail: { alarmId }
        }));
      }
    });
  }

  private async registerBackgroundTask(): Promise<void> {
    try {
      // Registrar tarea que se ejecuta periódicamente
      await BackgroundRunner.dispatchEvent({
        label: 'com.cautelapp.alarm.check',
        event: 'checkAlarms',
        details: {}
      });
    } catch (error) {
      console.error('Error registrando tarea background:', error);
    }
  }

  private saveScheduledAlarms(): void {
    localStorage.setItem('scheduled_alarms', JSON.stringify(this.scheduledAlarms));
  }

  private loadScheduledAlarms(): void {
    const saved = localStorage.getItem('scheduled_alarms');
    if (saved) {
      this.scheduledAlarms = JSON.parse(saved);
    }
  }
}