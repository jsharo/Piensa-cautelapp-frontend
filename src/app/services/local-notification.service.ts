import { Injectable } from '@angular/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class LocalNotificationService {
  private hasPermissions: boolean = false;
  private notificationId: number = 1;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Solo en plataformas nativas
    if (!Capacitor.isNativePlatform()) {
      console.log('ℹ️ Notificaciones locales no disponibles en web');
      return;
    }

    await this.requestPermissions();
    await this.setupNotificationChannel();
    await this.setupListeners();
  }

  /**
   * Solicita permisos de notificaciones locales
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return false;
      }

      // Verificar permisos actuales
      const currentStatus = await LocalNotifications.checkPermissions();
      
      if (currentStatus.display === 'granted') {
        this.hasPermissions = true;
        console.log('✅ Permisos de notificación local ya concedidos');
        return true;
      }

      // Solicitar permisos
      console.log('📱 Solicitando permisos de notificación local...');
      const result = await LocalNotifications.requestPermissions();
      
      this.hasPermissions = result.display === 'granted';
      
      if (!this.hasPermissions) {
        console.warn('⚠️ Permisos de notificación local denegados');
        return false;
      }
      
      console.log('✅ Permisos de notificación local concedidos');
      return true;
    } catch (error) {
      console.error('❌ Error solicitando permisos de notificación local:', error);
      this.hasPermissions = false;
      return false;
    }
  }

  /**
   * Verifica si tenemos permisos
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return false;
      }

      const status = await LocalNotifications.checkPermissions();
      this.hasPermissions = status.display === 'granted';
      return this.hasPermissions;
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Configura el canal de notificaciones para Android
   */
  private async setupNotificationChannel() {
    try {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      await LocalNotifications.createChannel({
        id: 'cautelapp_notifications',
        name: 'Notificaciones CautelApp',
        description: 'Notificaciones de emergencias y ayuda',
        importance: 5, // MAX importance
        visibility: 1, // PUBLIC
        sound: 'notification_sound.wav',
        vibration: true,
        lights: true,
        lightColor: '#FF0000',
      });

      console.log('✅ Canal de notificaciones configurado');
    } catch (error) {
      console.error('Error configurando canal de notificaciones:', error);
    }
  }

  /**
   * Configura listeners para eventos de notificaciones
   */
  private async setupListeners() {
    try {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      // Listener cuando se toca una notificación
      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Notificación tocada:', notification);
        // Aquí puedes navegar a una página específica si es necesario
      });

      console.log('✅ Listeners de notificaciones configurados');
    } catch (error) {
      console.error('Error configurando listeners:', error);
    }
  }

  /**
   * Envía una notificación local de emergencia
   */
  async sendEmergencyNotification(title: string, body: string, data?: any): Promise<void> {
    if (!await this.checkPermissions()) {
      console.warn('No se puede enviar notificación: permisos no concedidos');
      return;
    }

    try {
      const id = this.getNextNotificationId();

      const notification: LocalNotificationSchema = {
        id: id,
        title: title,
        body: body,
        schedule: { at: new Date(Date.now() + 100) }, // Enviar casi inmediatamente
        sound: 'notification_sound.wav',
        attachments: undefined,
        actionTypeId: '',
        extra: data || {},
        channelId: 'cautelapp_notifications',
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#DC2626', // Color rojo para emergencias
      };

      await LocalNotifications.schedule({
        notifications: [notification]
      });

      console.log('✅ Notificación de emergencia enviada:', { id, title, body });
    } catch (error) {
      console.error('❌ Error enviando notificación de emergencia:', error);
    }
  }

  /**
   * Envía una notificación local de ayuda
   */
  async sendHelpNotification(title: string, body: string, data?: any): Promise<void> {
    if (!await this.checkPermissions()) {
      console.warn('No se puede enviar notificación: permisos no concedidos');
      return;
    }

    try {
      const id = this.getNextNotificationId();

      const notification: LocalNotificationSchema = {
        id: id,
        title: title,
        body: body,
        schedule: { at: new Date(Date.now() + 100) }, // Enviar casi inmediatamente
        sound: 'notification_sound.wav',
        attachments: undefined,
        actionTypeId: '',
        extra: data || {},
        channelId: 'cautelapp_notifications',
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#FF9500', // Color naranja para ayuda
      };

      await LocalNotifications.schedule({
        notifications: [notification]
      });

      console.log('✅ Notificación de ayuda enviada:', { id, title, body });
    } catch (error) {
      console.error('❌ Error enviando notificación de ayuda:', error);
    }
  }

  /**
   * Envía una notificación local genérica
   */
  async sendNotification(title: string, body: string, tipo?: 'EMERGENCIA' | 'AYUDA' | 'PANICO', data?: any): Promise<void> {
    if (tipo === 'EMERGENCIA' || tipo === 'PANICO') {
      await this.sendEmergencyNotification(title, body, data);
    } else if (tipo === 'AYUDA') {
      await this.sendHelpNotification(title, body, data);
    } else {
      // Notificación genérica
      if (!await this.checkPermissions()) {
        console.warn('No se puede enviar notificación: permisos no concedidos');
        return;
      }

      try {
        const id = this.getNextNotificationId();

        const notification: LocalNotificationSchema = {
          id: id,
          title: title,
          body: body,
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'notification_sound.wav',
          attachments: undefined,
          actionTypeId: '',
          extra: data || {},
          channelId: 'cautelapp_notifications',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#159A9C', // Color teal por defecto
        };

        await LocalNotifications.schedule({
          notifications: [notification]
        });

        console.log('✅ Notificación enviada:', { id, title, body });
      } catch (error) {
        console.error('❌ Error enviando notificación:', error);
      }
    }
  }

  /**
   * Cancela todas las notificaciones pendientes
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      await LocalNotifications.cancel({ notifications: [] });
      console.log('✅ Todas las notificaciones canceladas');
    } catch (error) {
      console.error('Error cancelando notificaciones:', error);
    }
  }

  /**
   * Genera un ID único para cada notificación
   */
  private getNextNotificationId(): number {
    this.notificationId++;
    if (this.notificationId > 100000) {
      this.notificationId = 1; // Reset después de 100k notificaciones
    }
    return this.notificationId;
  }
}
