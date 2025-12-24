import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, NavController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface BluetoothDevice {
  id: string;
  name: string;
  rssi?: number;
  connected: boolean;
}

interface WiFiNetwork {
  ssid: string;
  rssi: number;
  security: string;
}

@Component({
  selector: 'app-configuration',
  templateUrl: 'configuration.page.html',
  styleUrls: ['configuration.page.scss'],
  imports: [IonContent, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ConfigurationPage implements OnInit {
  // Estado del escaneo Bluetooth
  isScanning = false;
  bluetoothDevices: BluetoothDevice[] = [];
  connectedDevice: BluetoothDevice | null = null;
  
  // Estado del WiFi
  wifiNetworks: WiFiNetwork[] = [];
  selectedWiFi: WiFiNetwork | null = null;
  wifiPassword = '';
  isConnectingWiFi = false;

  // Estados generales
  connectionStep: 'bluetooth' | 'wifi-list' | 'wifi-config' = 'bluetooth';

  // Email de recuperación
  user: User | null = null;
  isEditingRecoveryEmail = false;
  recoveryEmail = '';
  recoveryEmailError = '';
  loadingRecoveryEmail = false;
  selectedTab: 'bluetooth' | 'recovery-email' = 'bluetooth';

  constructor(
    private navController: NavController,
    private authService: AuthService,
    private http: HttpClient,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // Inicializar Bluetooth cuando carga la página
    this.initializeBluetooth();
    // Cargar usuario actual
    this.loadUser();
  }

  loadUser() {
    this.user = this.authService.getCurrentUser();
    this.authService.me().subscribe({
      next: (u) => {
        this.user = u;
      },
      error: () => {
        console.error('Error cargando usuario');
      }
    });
  }

  // =====================
  // BLUETOOTH FUNCTIONS
  // =====================

  initializeBluetooth() {
    // Aquí irá la lógica real de Bluetooth usando Capacitor
    console.log('Inicializando Bluetooth...');
    // Por ahora, datos simulados
    this.bluetoothDevices = [];
  }

  startScan() {
    this.isScanning = true;
    console.log('Escaneando dispositivos Bluetooth...');
    
    // Simulación de escaneo
    setTimeout(() => {
      this.bluetoothDevices = [
        {
          id: 'esp32-001',
          name: 'CautelApp-ESP32-001',
          rssi: -45,
          connected: false
        },
        {
          id: 'esp32-002',
          name: 'CautelApp-ESP32-002',
          rssi: -65,
          connected: false
        },
        {
          id: 'device-003',
          name: 'Otro Dispositivo',
          rssi: -75,
          connected: false
        }
      ];
      this.isScanning = false;
    }, 3000);
  }

  stopScan() {
    this.isScanning = false;
    console.log('Escaneo detenido');
  }

  connectDevice(device: BluetoothDevice) {
    console.log('Conectando a:', device.name);
    
    // Simulación de conexión
    setTimeout(() => {
      device.connected = true;
      this.connectedDevice = device;
      this.connectionStep = 'wifi-list';
      
      // Aquí se solicitaría la lista de redes WiFi disponibles al ESP32
      this.requestWiFiNetworks();
    }, 2000);
  }

  disconnectDevice() {
    if (this.connectedDevice) {
      console.log('Desconectando de:', this.connectedDevice.name);
      this.connectedDevice.connected = false;
      this.connectedDevice = null;
      this.connectionStep = 'bluetooth';
      this.wifiNetworks = [];
      this.selectedWiFi = null;
      this.wifiPassword = '';
    }
  }

  // =====================
  // WIFI FUNCTIONS
  // =====================

  requestWiFiNetworks() {
    console.log('Solicitando redes WiFi disponibles...');
    
    // Simulación de redes WiFi
    setTimeout(() => {
      this.wifiNetworks = [
        { ssid: 'Red-Casa-Principal', rssi: -35, security: 'WPA2' },
        { ssid: 'Red-Invitados', rssi: -45, security: 'WPA2' },
        { ssid: 'Red-Vecino', rssi: -75, security: 'WPA' },
      ];
    }, 1500);
  }

  selectWiFi(network: WiFiNetwork) {
    this.selectedWiFi = network;
    this.connectionStep = 'wifi-config';
  }

  backToWiFiList() {
    this.selectedWiFi = null;
    this.wifiPassword = '';
    this.connectionStep = 'wifi-list';
  }

  sendWiFiCredentials() {
    if (!this.connectedDevice || !this.selectedWiFi || !this.wifiPassword) {
      console.error('Datos incompletos');
      return;
    }

    this.isConnectingWiFi = true;
    console.log('Enviando credenciales WiFi al ESP32...');
    
    // Aquí se enviarían las credenciales al ESP32 mediante Bluetooth
    const credentials = {
      ssid: this.selectedWiFi.ssid,
      password: this.wifiPassword,
      deviceId: this.connectedDevice.id
    };

    setTimeout(() => {
      console.log('Credenciales enviadas:', credentials);
      this.isConnectingWiFi = false;
      // Aquí podrías mostrar un mensaje de éxito
    }, 2000);
  }

  // =====================
  // NAVIGATION
  // =====================

  goBack() {
    this.navController.back();
  }

  getRSSIIndicator(rssi: number): string {
    if (rssi > -50) return 'Excelente';
    if (rssi > -60) return 'Buena';
    if (rssi > -70) return 'Regular';
    return 'Débil';
  }

  getRSSIColor(rssi: number): string {
    if (rssi > -50) return '#34c759';
    if (rssi > -60) return '#ff9500';
    if (rssi > -70) return '#ff3b30';
    return '#808080';
  }

  // =====================
  // EMAIL DE RECUPERACIÓN
  // =====================

  openRecoveryEmailEdit() {
    this.recoveryEmail = this.user?.email_recuperacion || '';
    this.recoveryEmailError = '';
    this.isEditingRecoveryEmail = true;
  }

  closeRecoveryEmailEdit() {
    this.isEditingRecoveryEmail = false;
    this.recoveryEmail = '';
    this.recoveryEmailError = '';
  }

  emailValid(value: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(value);
  }

  validateRecoveryEmail() {
    if (!this.recoveryEmail) {
      this.recoveryEmailError = '';
      return true;
    }
    
    if (!this.emailValid(this.recoveryEmail)) {
      this.recoveryEmailError = 'Ingresa un correo electrónico válido';
      return false;
    }
    
    if (this.recoveryEmail === this.user?.email) {
      this.recoveryEmailError = 'El email de recuperación no puede ser igual al email principal';
      return false;
    }
    
    this.recoveryEmailError = '';
    return true;
  }

  async updateRecoveryEmail() {
    if (!this.user) {
      return;
    }

    if (this.recoveryEmail && !this.validateRecoveryEmail()) {
      return;
    }

    this.loadingRecoveryEmail = true;

    this.http
      .patch(`${environment.apiUrl}/user/${this.user.id_usuario}`, {
        email_recuperacion: this.recoveryEmail || null,
      })
      .subscribe({
        next: async (updatedUser: any) => {
          this.user = updatedUser;
          this.authService.setCurrentUser(updatedUser);
          
          this.loadingRecoveryEmail = false;
          this.closeRecoveryEmailEdit();
          
          const toast = await this.toastCtrl.create({
            message: this.recoveryEmail 
              ? 'Email de recuperación actualizado exitosamente'
              : 'Email de recuperación eliminado exitosamente',
            color: 'success',
            duration: 3000,
            position: 'top',
          });
          toast.present();
        },
        error: async (err) => {
          this.loadingRecoveryEmail = false;
          let errorMessage = 'No se pudo actualizar el email de recuperación';
          
          if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (err.status === 409) {
            errorMessage = 'Este correo ya está en uso';
          }
          
          const toast = await this.toastCtrl.create({
            message: errorMessage,
            color: 'danger',
            duration: 3000,
            position: 'top',
          });
          toast.present();
        },
      });
  }

  async removeRecoveryEmail() {
    this.recoveryEmail = '';
    await this.updateRecoveryEmail();
  }
}
