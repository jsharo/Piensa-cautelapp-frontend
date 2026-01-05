import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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
  private hasPermissions: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Cargar alarmas programadas desde localStorage
    this.loadScheduledAlarms();
    
    // Solicitar permisos
    await this.requestPermissions();

    // Configurar listener para notificaciones
    await this.setupNotificationListeners();
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      // Primero verificar si ya tenemos permisos
      const currentStatus = await LocalNotifications.checkPermissions();
      
      if (currentStatus.display === 'granted') {
        this.hasPermissions = true;
        console.log('✅ Permisos de notificación ya concedidos');
        
        // Verificar SCHEDULE_EXACT_ALARM para Android 12+
        await this.checkExactAlarmPermission();
        
        return true;
      }

      // Si no los tenemos, solicitarlos
      console.log('📱 Solicitando permisos de notificación...');
      const result = await LocalNotifications.requestPermissions();
      
      this.hasPermissions = result.display === 'granted';
      
      if (!this.hasPermissions) {
        console.warn('⚠️ Permisos de notificación denegados por el usuario');
        return false;
      }
      
      console.log('✅ Permisos de notificación concedidos');
      
      // Verificar SCHEDULE_EXACT_ALARM para Android 12+
      await this.checkExactAlarmPermission();
      
      return true;
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error);
      this.hasPermissions = false;
      return false;
    }
  }

  private async checkExactAlarmPermission(): Promise<void> {
    try {
      // En Android 12+, SCHEDULE_EXACT_ALARM requiere permiso especial
      // LocalNotifications maneja esto automáticamente, pero informamos al usuario
      console.log('ℹ️ Verificando permiso SCHEDULE_EXACT_ALARM...');
      console.log('📋 Si las alarmas no funcionan, verifica en Ajustes > Apps > CautelApp > Alarmas y recordatorios');
    } catch (error) {
      console.error('Error verificando SCHEDULE_EXACT_ALARM:', error);
    }
  }

  // Método público para verificar permisos desde componentes
  async checkPermissions(): Promise<boolean> {
    try {
      const status = await LocalNotifications.checkPermissions();
      this.hasPermissions = status.display === 'granted';
      return this.hasPermissions;
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  // Método público para solicitar permisos manualmente
  async requestPermissionsManually(): Promise<boolean> {
    return await this.requestPermissions();
  }

  async scheduleAlarm(alarm: any): Promise<number> {
    try {
      // Verificar permisos antes de programar
      if (!this.hasPermissions) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('No se tienen permisos para programar notificaciones');
        }
      }

      // Calcular fecha/hora del próximo disparo
      const triggerDate = this.calculateNextTrigger(alarm);

      // Generar ID único para la notificación
      const notificationId = this.generateNotificationId(alarm);

      // Crear canal (Android) - se crea cada vez para asegurar que existe
      await this.createAlarmChannel();

      // Configurar el cuerpo del mensaje según la categoría
      let body = alarm.notes || 'Es hora de tu recordatorio';
      if (alarm.category === 'medicamento') {
        body = alarm.notes || '💊 Hora de tomar tu medicamento';
      } else if (alarm.category === 'cita') {
        body = alarm.notes || '📅 Tienes una cita médica';
      }

      // Programar la notificación con configuración mejorada
      console.log('📢 Programando alarma con configuración:', {
        id: notificationId,
        time: alarm.time,
        triggerDate: triggerDate.toISOString(),
        sound: 'alarm_sound',
        channelId: 'alarm_channel'
      });

      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title: '⏰ ' + alarm.label,
          body: body,
          schedule: { 
            at: new Date(triggerDate),
            allowWhileIdle: true // Permitir que suene incluso en modo reposo
          },
          sound: 'alarm_sound', // SIN extensión - Android busca en res/raw/
          extra: {
            alarmId: alarm.id,
            type: 'ALARM_TRIGGER',
            category: alarm.category,
            label: alarm.label,
            time: alarm.time
          },
          channelId: 'alarm_channel',
          ongoing: false,
          autoCancel: false,
          smallIcon: 'ic_stat_alarm',
          largeIcon: 'ic_launcher',
          actionTypeId: 'ALARM_ACTION',
          summaryText: `Alarma programada para ${alarm.time}`,
          // Configuraciones críticas para segundo plano
          attachments: undefined,
          inboxList: undefined
        }]
      });

      console.log(`✅ Alarma programada exitosamente:`, {
        label: alarm.label,
        time: alarm.time,
        triggerDate: triggerDate.toLocaleString(),
        notificationId: notificationId
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

    console.log('📅 Calculando próximo disparo para:', {
      label: alarm.label,
      time: alarm.time,
      horaActual: now.toLocaleString(),
      repeatDays: alarm.repeatDays
    });

    // Crear fecha para hoy con la hora de la alarma
    const triggerDate = new Date();
    triggerDate.setHours(hours, minutes, 0, 0);

    console.log('⏰ Fecha inicial calculada:', triggerDate.toLocaleString());

    // Si la hora ya pasó hoy, programar para mañana
    if (triggerDate <= now) {
      console.log('⏭️ La hora ya pasó hoy, programando para mañana');
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    // Si tiene días de repetición, verificar si es un día válido
    if (alarm.repeatDays && alarm.repeatDays.length > 0) {
      const currentDay = triggerDate.getDay(); // 0=Dom, 6=Sab
      console.log('🗓️ Día calculado:', currentDay, 'Días permitidos:', alarm.repeatDays);
      
      // Si el día calculado no está en la lista, buscar el próximo día válido
      if (!alarm.repeatDays.includes(currentDay)) {
        console.log('❌ Día no válido, buscando próximo día...');
        
        // Buscar el próximo día válido (máximo 7 días adelante)
        for (let i = 1; i <= 7; i++) {
          triggerDate.setDate(triggerDate.getDate() + 1);
          const nextDay = triggerDate.getDay();
          console.log(`  Día +${i}: ${nextDay}`);
          
          if (alarm.repeatDays.includes(nextDay)) {
            console.log(`  ✅ Día válido encontrado: ${nextDay}`);
            break;
          }
        }
      } else {
        console.log('✅ Día válido:', currentDay);
      }
    }

    console.log('🎯 Fecha final programada:', triggerDate.toLocaleString());
    console.log('⏱️ Tiempo restante:', Math.round((triggerDate.getTime() - now.getTime()) / 1000 / 60), 'minutos');

    return triggerDate;
  }

  private generateNotificationId(alarm: any): number {
    // Genera un ID único basado en el ID de la alarma
    return parseInt(alarm.id.substring(0, 8), 16) % 1000000;
  }

  private async createAlarmChannel(): Promise<void> {
    try {
      console.log('📺 Creando/actualizando canal de alarmas...');
      // Crear canal solo en Android
      await LocalNotifications.createChannel({
        id: 'alarm_channel',
        name: 'Alarmas de Medicamentos y Citas',
        description: 'Notificaciones importantes para recordatorios de salud',
        importance: 5, // IMPORTANCE_HIGH - máxima prioridad
        vibration: true,
        sound: 'alarm_sound', // SIN extensión - Android busca en res/raw/
        lights: true,
        lightColor: '#FF0000',
        visibility: 1 // Public - visible en lockscreen
      });
      console.log('✅ Canal de alarmas creado/actualizado con prioridad máxima');
      console.log('🔊 Sonido configurado: alarm_sound (res/raw/alarm_sound.mp3)');
      
      // Listar canales para verificar
      const channels = await LocalNotifications.listChannels();
      console.log('📺 Canales disponibles:', channels);
    } catch (error) {
      console.error('❌ Error creando canal de alarmas:', error);
      // No lanzar error, continuar de todas formas
    }
  }

  private async setupNotificationListeners(): Promise<void> {
    // CRÍTICO: Este listener se dispara cuando la notificación se MUESTRA (incluso en segundo plano)
    LocalNotifications.addListener('localNotificationReceived', async (notification: any) => {
      const alarmId = notification.extra?.alarmId;
      const type = notification.extra?.type;

      if (type === 'ALARM_TRIGGER' && alarmId) {
        console.log('🔔 Notificación recibida (alarma sonando):', alarmId);
        // Disparar evento para que Tab3 maneje la alarma
        window.dispatchEvent(new CustomEvent('alarmTriggered', {
          detail: { alarmId }
        }));
      }
    });

    // Este listener se dispara cuando el usuario hace click en la notificación
    LocalNotifications.addListener('localNotificationActionPerformed', async (action: any) => {
      const alarmId = action.notification.extra?.alarmId;
      const type = action.notification.extra?.type;

      if (type === 'ALARM_TRIGGER' && alarmId) {
        console.log('👆 Click en notificación:', alarmId);
        // También disparar el evento para manejar la alarma
        window.dispatchEvent(new CustomEvent('alarmTriggered', {
          detail: { alarmId }
        }));
      }
    });
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

  // Método público para depuración: listar alarmas pendientes
  async getPendingNotifications(): Promise<any> {
    try {
      const pending = await LocalNotifications.getPending();
      console.log('📋 Notificaciones pendientes:', pending);
      return pending;
    } catch (error) {
      console.error('Error obteniendo notificaciones pendientes:', error);
      return { notifications: [] };
    }
  }

  // Método público para depuración: verificar estado del canal
  async listChannels(): Promise<any> {
    try {
      const channels = await LocalNotifications.listChannels();
      console.log('📺 Canales disponibles:', channels);
      return channels;
    } catch (error) {
      console.error('Error listando canales:', error);
      return { channels: [] };
    }
  }
}