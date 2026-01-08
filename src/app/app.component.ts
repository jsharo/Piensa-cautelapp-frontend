import { Component, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform, ToastController } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { LocalNotificationService } from './services/local-notification.service';
import { DeviceConnectionEventsService } from './services/device-connection-events.service';
import { AuthService } from './services/auth.service';
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
    private authService: AuthService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    this.platform.ready().then(async () => {
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

      // Escuchar eventos de conexión del dispositivo ESP32
      this.setupDeviceConnectionListener();
    });
  }

  /**
   * Configura el listener para eventos de conexión del ESP32
   */
  private setupDeviceConnectionListener() {
    this.deviceConnectionEvents.connectionEvents$.subscribe(async (event) => {
      console.log('[AppComponent] Evento de conexión recibido:', event);

      // Verificar si el dispositivo ya está vinculado al usuario
      // Si no, vincularlo automáticamente
      try {
        // Intentar vincular el dispositivo (si ya existe, el backend lo manejará)
        const response = await fetch(`${environment.apiUrl}/device/vincular`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authService.getToken()}`
          },
          body: JSON.stringify({
            mac_address: event.macAddress,
            bateria: 100,
            nombre_adulto: `Dispositivo ${event.macAddress.slice(-8)}`,
            direccion: 'Ubicación no especificada'
          })
        });

        const result = await response.json();
        console.log('[AppComponent] Resultado de vinculación:', result);
      } catch (error) {
        console.log('[AppComponent] El dispositivo ya está vinculado o error:', error);
      }

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
