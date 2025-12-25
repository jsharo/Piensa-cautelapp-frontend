import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, IonSpinner, NavController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { LucideAngularModule, ChevronLeft, Bluetooth, Mail, Info, CheckCircle2, AlertCircle, Edit, PlusCircle, Trash2, XCircle, ArrowRight, RefreshCw, Wifi, ChevronRight, WifiOff } from 'lucide-angular';

// UUIDs del ESP32 - DEBEN COINCIDIR EXACTAMENTE con el código del ESP32
const BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const BLE_WIFI_SSID_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const BLE_WIFI_PASSWORD_CHAR_UUID = '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e';
const BLE_WIFI_STATUS_CHAR_UUID = 'cba1d466-344c-4be3-ab3f-189f80dd7518';
const BLE_WIFI_LIST_CHAR_UUID = 'd1e7e1f0-3c3f-4e5d-a7e4-3f8c9d8e7f6d';

interface BluetoothDevice {
  id: string;
  name: string;
  rssi?: number;
  connected: boolean;
}

interface WiFiNetwork {
  ssid: string;
  rssi?: number;
  security?: string;
}

@Component({
  selector: 'app-configuration',
  templateUrl: 'configuration.page.html',
  styleUrls: ['configuration.page.scss'],
  imports: [
    IonContent, 
    IonSpinner, 
    CommonModule, 
    FormsModule,
    LucideAngularModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ConfigurationPage implements OnInit {
  // Iconos de Lucide
  readonly ChevronLeft = ChevronLeft;
  readonly Bluetooth = Bluetooth;
  readonly Mail = Mail;
  readonly Info = Info;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertCircle = AlertCircle;
  readonly Edit = Edit;
  readonly PlusCircle = PlusCircle;
  readonly Trash2 = Trash2;
  readonly XCircle = XCircle;
  readonly ArrowRight = ArrowRight;
  readonly RefreshCw = RefreshCw;
  readonly Wifi = Wifi;
  readonly ChevronRight = ChevronRight;
  readonly WifiOff = WifiOff;
  
  // Estado del escaneo Bluetooth
  isScanning = false;
  bluetoothDevices: BluetoothDevice[] = [];
  connectedDevice: BluetoothDevice | null = null;
  
  // Estado del WiFi
  wifiNetworks: WiFiNetwork[] = [];
  selectedWiFi: WiFiNetwork | null = null;
  manualSSID = '';
  wifiPassword = '';
  isConnectingWiFi = false;

  // Estados generales
  connectionStep: 'bluetooth' | 'wifi-manual' = 'bluetooth';

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

  async ngOnInit() {
    // Inicializar Bluetooth cuando carga la página
    await this.initializeBluetooth();
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
  // BLUETOOTH FUNCTIONS (BLE REAL)
  // =====================

  async initializeBluetooth() {
    try {
      console.log('Inicializando Bluetooth...');
      // Inicializar el cliente BLE
      await BleClient.initialize();
      console.log('✅ Bluetooth inicializado');
      this.bluetoothDevices = [];
    } catch (error) {
      console.error('❌ Error inicializando Bluetooth:', error);
      this.showToast('Error al inicializar Bluetooth', 'danger');
    }
  }

  async startScan() {
    try {
      this.isScanning = true;
      this.bluetoothDevices = [];
      
      console.log('🔍 Escaneando dispositivos BLE...');
      
      await BleClient.requestLEScan(
        {
          // Filtrar solo dispositivos CautelApp (opcional, puedes eliminar este filtro)
          namePrefix: 'CautelApp'
        },
        (result: ScanResult) => {
          // Verificar si el dispositivo ya está en la lista
          const existingIndex = this.bluetoothDevices.findIndex(d => d.id === result.device.deviceId);
          
          const device: BluetoothDevice = {
            id: result.device.deviceId,
            name: result.device.name || 'Dispositivo Desconocido',
            rssi: result.rssi,
            connected: false
          };
          
          if (existingIndex >= 0) {
            // Actualizar RSSI del dispositivo existente
            this.bluetoothDevices[existingIndex] = device;
          } else {
            // Agregar nuevo dispositivo
            this.bluetoothDevices.push(device);
          }
          
          console.log('📡 Dispositivo encontrado:', device.name, `(${device.rssi} dBm)`);
        }
      );
      
      // Detener escaneo automáticamente después de 10 segundos
      setTimeout(() => {
        this.stopScan();
      }, 10000);
      
    } catch (error) {
      console.error('❌ Error escaneando:', error);
      this.isScanning = false;
      this.showToast('Error al escanear dispositivos BLE', 'danger');
    }
  }

  async stopScan() {
    try {
      await BleClient.stopLEScan();
      this.isScanning = false;
      console.log('⏹️ Escaneo detenido');
    } catch (error) {
      console.error('Error deteniendo escaneo:', error);
      this.isScanning = false;
    }
  }

  async connectDevice(device: BluetoothDevice) {
    try {
      console.log('🔗 Conectando a:', device.name);
      
      // Detener escaneo si está activo
      if (this.isScanning) {
        await this.stopScan();
      }
      
      // Conectar al dispositivo BLE
      await BleClient.connect(device.id, () => {
        // Callback cuando se desconecta
        console.log('📴 Dispositivo desconectado');
        this.handleDisconnection();
      });
      
      console.log('✅ Conectado a:', device.name);
      
      device.connected = true;
      this.connectedDevice = device;
      
      // Suscribirse a notificaciones de estado WiFi
      await this.subscribeToWiFiStatus();
      
      this.connectionStep = 'wifi-manual';
      this.showToast('Dispositivo conectado exitosamente', 'success');
      
    } catch (error) {
      console.error('❌ Error conectando:', error);
      this.showToast('Error al conectar con el dispositivo', 'danger');
    }
  }

  async disconnectDevice() {
    if (!this.connectedDevice) return;
    
    try {
      console.log('🔌 Desconectando de:', this.connectedDevice.name);
      await BleClient.disconnect(this.connectedDevice.id);
      this.handleDisconnection();
      this.showToast('Dispositivo desconectado', 'medium');
    } catch (error) {
      console.error('Error desconectando:', error);
      this.handleDisconnection();
    }
  }

  handleDisconnection() {
    if (this.connectedDevice) {
      this.connectedDevice.connected = false;
      this.connectedDevice = null;
    }
    this.connectionStep = 'bluetooth';
    this.manualSSID = '';
    this.wifiPassword = '';
  }

  async subscribeToWiFiStatus() {
    if (!this.connectedDevice) return;
    
    try {
      await BleClient.startNotifications(
        this.connectedDevice.id,
        BLE_SERVICE_UUID,
        BLE_WIFI_STATUS_CHAR_UUID,
        (value: DataView) => {
          const decoder = new TextDecoder();
          const status = decoder.decode(value);
          console.log('📊 Estado WiFi:', status);
          
          // Manejar diferentes estados
          if (status === 'CONNECTING') {
            this.showToast('Conectando a WiFi...', 'medium');
          } else if (status === 'CONNECTED') {
            this.showToast('¡ESP32 conectado a WiFi exitosamente!', 'success');
            // Aquí podrías navegar a otra pantalla o actualizar el estado
          } else if (status === 'FAILED') {
            this.showToast('Error: No se pudo conectar a WiFi', 'danger');
          }
        }
      );
      console.log('✅ Suscrito a notificaciones de estado WiFi');
    } catch (error) {
      console.error('Error suscribiéndose a notificaciones:', error);
    }
  }

  // =====================
  // WIFI FUNCTIONS
  // =====================

  async sendWiFiCredentials() {
    if (!this.connectedDevice || !this.manualSSID || !this.wifiPassword) {
      this.showToast('Por favor completa todos los campos', 'warning');
      return;
    }

    this.isConnectingWiFi = true;
    
    try {
      console.log('📤 Enviando credenciales WiFi al ESP32...');
      
      // 1. Enviar SSID
      const ssidEncoder = new TextEncoder();
      const ssidArray = ssidEncoder.encode(this.manualSSID);
      const ssidData = new DataView(ssidArray.buffer);
      
      await BleClient.write(
        this.connectedDevice.id,
        BLE_SERVICE_UUID,
        BLE_WIFI_SSID_CHAR_UUID,
        ssidData
      );
      console.log('✅ SSID enviado:', this.manualSSID);
      
      // Pequeña pausa para asegurar que el ESP32 procese
      await this.delay(300);
      
      // 2. Enviar contraseña
      const passwordEncoder = new TextEncoder();
      const passwordArray = passwordEncoder.encode(this.wifiPassword);
      const passwordData = new DataView(passwordArray.buffer);
      
      await BleClient.write(
        this.connectedDevice.id,
        BLE_SERVICE_UUID,
        BLE_WIFI_PASSWORD_CHAR_UUID,
        passwordData
      );
      console.log('✅ Contraseña enviada');
      
      this.showToast('Credenciales enviadas. Esperando conexión...', 'success');
      
      // El estado se recibirá por notificaciones (ya suscritas)
      
    } catch (error) {
      console.error('❌ Error enviando credenciales:', error);
      this.showToast('Error al enviar credenciales', 'danger');
    } finally {
      this.isConnectingWiFi = false;
    }
  }

  // Función auxiliar para pausas
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  // Función auxiliar para mostrar mensajes toast
  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium') {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'top',
    });
    await toast.present();
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
