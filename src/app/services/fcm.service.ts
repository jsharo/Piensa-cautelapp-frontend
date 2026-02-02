import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { 
  PushNotifications, 
  Token, 
  ActionPerformed,
  PushNotificationSchema 
} from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular/standalone';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { LocalNotificationService } from './local-notification.service';

@Injectable({
  providedIn: 'root'
})
export class FcmService {
  private currentToken: string | null = null;

  constructor(
    private http: HttpClient,
    private platform: Platform,
    private router: Router,
    private localNotificationService: LocalNotificationService
  ) {}

  /**
   * Inicializa FCM: solicita permisos, obtiene token y configura listeners
   */
  async initializePushNotifications(userId: number): Promise<void> {
    try {
      // Solo en plataformas nativas
      if (!this.platform.is('capacitor')) {
        console.log('⚠️ FCM solo disponible en dispositivos móviles');
        return;
      }

      // Validar userId
      if (!userId || userId <= 0) {
        console.error('❌ FCM: userId inválido:', userId);
        return;
      }

      console.log('🚀 Inicializando FCM para usuario:', userId);

      // 1. Solicitar permisos
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive !== 'granted') {
        console.warn('⚠️ Permisos de notificaciones push no concedidos');
        return;
      }

      console.log('✅ Permisos de notificaciones push concedidos');

      // 2. Registrar para recibir push notifications
      await PushNotifications.register();

      // 3. Configurar listeners
      this.setupListeners(userId);

    } catch (error) {
      console.error('❌ Error inicializando push notifications:', error);
      console.error('Detalles del error:', JSON.stringify(error));
      // No re-lanzar el error para evitar que crashee la app
    }
  }

  /**
   * Configura los listeners para eventos de notificaciones
   */
  private setupListeners(userId: number): void {
    // Cuando se recibe el token FCM
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('🔑 Token FCM recibido:', token.value);
      this.currentToken = token.value;
      
      // Enviar token al backend
      await this.saveTokenToBackend(userId, token.value);
    });

    // Error en el registro
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ Error en registro FCM:', error);
    });

    // Notificación recibida cuando la app está en foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      async (notification: PushNotificationSchema) => {
        console.log('📥 Notificación FCM recibida (foreground):', notification);
        
        // NO mostrar notificación aquí porque SSE ya la maneja en Tab1
        // FCM solo debe funcionar cuando la app está en background/cerrada
        // Android automáticamente mostrará la notificación en esos casos
        console.log('⚠️ Notificación FCM ignorada en foreground (SSE la maneja)');
      }
    );

    // Notificación clickeada (app en background o cerrada)
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      async (action: ActionPerformed) => {
        console.log('🖱️ Notificación clickeada:', action);
        
        const data = action.notification.data;
        
        // Navegar según el tipo de notificación
        if (data.tipo) {
          await this.handleNotificationAction(data);
        }
      }
    );
  }

  /**
   * Maneja las acciones cuando el usuario clickea una notificación
   */
  private async handleNotificationAction(data: any): Promise<void> {
    try {
      const tipo = data.tipo?.toLowerCase();
      
      if (tipo === 'emergencia' || tipo === 'ayuda' || tipo === 'panico') {
        // Navegar a la página de notificaciones (tab1)
        await this.router.navigate(['/tabs/tab1']);
        
        // Si hay un notificationId, podrías navegar a detalles específicos
        if (data.notificationId) {
          console.log('📌 Ver notificación ID:', data.notificationId);
          // Aquí podrías abrir un modal con los detalles de la notificación
        }
      }
    } catch (error) {
      console.error('Error manejando acción de notificación:', error);
    }
  }

  /**
   * Guarda el token FCM en el backend
   */
  private async saveTokenToBackend(userId: number, fcmToken: string): Promise<void> {
    try {
      const response = await this.http.post(
        `${environment.apiUrl}/user/fcm-token`,
        {
          userId: userId,
          fcmToken: fcmToken,
          platform: this.platform.platforms().join(',')
        }
      ).toPromise();

      console.log('✅ Token FCM guardado en backend:', response);
    } catch (error) {
      console.error('❌ Error guardando token FCM en backend:', error);
    }
  }

  /**
   * Elimina el token FCM del backend (logout)
   */
  async removeToken(userId: number): Promise<void> {
    try {
      // Eliminar listeners
      await PushNotifications.removeAllListeners();
      
      // Eliminar token del backend
      await this.http.delete(
        `${environment.apiUrl}/user/fcm-token/${userId}`
      ).toPromise();

      console.log('✅ Token FCM eliminado del backend');
      this.currentToken = null;
    } catch (error) {
      console.error('❌ Error eliminando token FCM:', error);
    }
  }

  /**
   * Obtiene el token actual
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Verifica si hay permisos concedidos
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const permStatus = await PushNotifications.checkPermissions();
      return permStatus.receive === 'granted';
    } catch (error) {
      console.error('Error verificando permisos FCM:', error);
      return false;
    }
  }
}
