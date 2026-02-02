import { Component, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform, ToastController } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { LocalNotificationService } from './services/local-notification.service';
import { DeviceConnectionEventsService } from './services/device-connection-events.service';
import { AuthService } from './services/auth.service';
import { FcmService } from './services/fcm.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private localNotificationService: LocalNotificationService,
    private deviceConnectionEvents: DeviceConnectionEventsService,
    private toastController: ToastController,
    private authService: AuthService,
    private fcmService: FcmService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    // Capturar errores no manejados globalmente
    window.addEventListener('error', (event) => {
      console.error('🚨 Error global capturado:', event.error);
      console.error('Mensaje:', event.message);
      console.error('Archivo:', event.filename);
      console.error('Línea:', event.lineno);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Promise rechazada no manejada:', event.reason);
    });

    this.platform.ready().then(async () => {
      console.log('🚀 Plataforma lista, inicializando app...');
      
      // Configurar Status Bar
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#1E3A8A' }); // dark-blue del header
      } catch (e) {
        console.log('Status bar not available:', e);
      }
      
      // Solicitar permisos de notificaciones locales al iniciar la app
      try {
        await this.localNotificationService.requestPermissions();
        console.log('✅ Permisos de notificaciones solicitados en app init');
      } catch (e) {
        console.error('Error solicitando permisos de notificaciones:', e);
      }

      // Vincular FCM Service con Auth Service
      this.authService.setFcmService(this.fcmService);

      // Inicializar FCM si el usuario está autenticado
      this.initializeFCMIfAuthenticated();

      // Escuchar eventos de conexión del dispositivo ESP32
      this.setupDeviceConnectionListener();
    });
  }

  /**
   * Inicializa FCM si hay un usuario autenticado
   */
  private async initializeFCMIfAuthenticated() {
    try {
      const currentUser = this.authService.getCurrentUser();
      
      if (currentUser && currentUser.id_usuario) {
        console.log('👤 Usuario autenticado detectado, inicializando FCM...');
        
        // Pequeño delay para asegurar que la plataforma esté completamente lista
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.fcmService.initializePushNotifications(currentUser.id_usuario);
      } else {
        console.log('⚠️ No hay usuario autenticado, FCM se inicializará después del login');
      }
    } catch (error) {
      console.error('Error inicializando FCM en app.component:', error);
      console.error('Stack trace:', error);
      // No re-lanzar el error para evitar que crashee la app
    }
  }

  /**
   * Configura el listener para eventos de conexión del ESP32
   */
  private setupDeviceConnectionListener() {
    this.deviceConnectionEvents.connectionEvents$.subscribe(async (event) => {
      console.log('[AppComponent] Evento de conexión WiFi recibido:', event);
      console.log('[AppComponent] El dispositivo se creará en BD cuando se envíen los datos del adulto mayor');

      // NO vincular automáticamente - esperar a que el usuario ingrese datos del adulto mayor
      // El modal se mostrará en tab2.page.ts después de recibir este evento

      // Mostrar toast al usuario
      const toast = await this.toastController.create({
        header: '🔗 Dispositivo Conectado',
        message: `Tu pulsera CautelApp se ha conectado a WiFi (${event.ssid}) con señal ${event.rssi} dBm`,
        duration: 5000,
        position: 'top',
        color: 'success',
        buttons: [
          {
            text: 'Ver',
            handler: () => {
              console.log('Ver detalles de conexión');
              // Aquí podrías navegar a una página de detalles
            }
          },
          {
            text: 'OK',
            role: 'cancel'
          }
        ]
      });

      await toast.present();

      // También enviar notificación local si estamos en plataforma nativa
      try {
        await this.localNotificationService.sendEmergencyNotification(
          'Dispositivo Conectado',
          `Tu pulsera se ha conectado a WiFi: ${event.ssid}`,
          { type: 'device_connection', event }
        );
      } catch (error) {
        console.error('Error enviando notificación local:', error);
      }
    });
  }
}

@NgModule({
  imports: [
    // ...otros módulos...
    FormsModule
  ],
  // ...código existente...
})
export class Tab2PageModule {}
