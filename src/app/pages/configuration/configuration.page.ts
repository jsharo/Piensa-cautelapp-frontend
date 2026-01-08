import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, IonSpinner, NavController, ToastController, ModalController, ViewWillEnter } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { LucideAngularModule, ChevronLeft, Bluetooth, Mail, Info, CheckCircle2, AlertCircle, Edit, PlusCircle, Trash2, XCircle, ArrowRight, RefreshCw, Wifi, ChevronRight, WifiOff } from 'lucide-angular';
import { BleService, ConnectedDevice } from '../../services/ble.service';
import { AdultInfoModalComponent } from './adult-info-modal/adult-info-modal.component';
import { Router } from '@angular/router';

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
export class ConfigurationPage implements OnInit, ViewWillEnter {
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
  wifiConnected = false;
  wifiStatus: 'idle' | 'sending' | 'waiting' | 'connected' | 'failed' = 'idle';
  private wifiTimeoutId: any = null;

  // Estados generales
  connectionStep: 'bluetooth' | 'wifi-manual' | 'adult-info' = 'bluetooth';

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
    private toastCtrl: ToastController,
    private bleService: BleService,
    private modalController: ModalController,
    private router: Router
  ) {}

  ngOnInit() {
    // No inicializar nada aquí para evitar problemas de navegación
  }

  async ionViewWillEnter() {
    // Inicializar cuando la vista esté por entrar
    await this.initializeBluetooth();
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
      console.log('📋 Búsqueda: Todos los dispositivos (sin filtro)');
      
      // Escanear SIN filtro de nombre primero para diagnóstico
      await BleClient.requestLEScan(
        {},
        (result: ScanResult) => {
          // Verificar si el dispositivo ya está en la lista
          const existingIndex = this.bluetoothDevices.findIndex(d => d.id === result.device.deviceId);
          
          const deviceName = result.device.name || 'Dispositivo Sin Nombre';
          const device: BluetoothDevice = {
            id: result.device.deviceId,
            name: deviceName,
            rssi: result.rssi,
            connected: false
          };
          
          if (existingIndex >= 0) {
            // Actualizar RSSI del dispositivo existente
            this.bluetoothDevices[existingIndex] = device;
          } else {
            // Agregar nuevo dispositivo
            this.bluetoothDevices.push(device);
            
            // Log detallado para diagnóstico
            console.log('📡 Dispositivo encontrado:', {
              nombre: deviceName,
              id: result.device.deviceId,
              rssi: result.rssi,
              esCautelApp: deviceName.includes('CautelApp'),
              servicios: result.uuids || []
            });
          }
          
          // También log cada actualización si es un dispositivo CautelApp
          if (deviceName.includes('CautelApp')) {
            console.log('✅ ¡Dispositivo CautelApp detectado!', deviceName, `(${result.rssi} dBm)`);
          }
        }
      );
      
      // Detener escaneo automáticamente después de 15 segundos (más tiempo para diagnóstico)
      setTimeout(() => {
        this.stopScan();
        if (this.bluetoothDevices.length === 0) {
          this.showToast('No se encontraron dispositivos. Verifica que el ESP32 esté encendido y cerca.', 'warning');
        } else {
          const cautelappDevices = this.bluetoothDevices.filter(d => d.name.includes('CautelApp'));
          if (cautelappDevices.length === 0) {
            this.showToast(`Se encontraron ${this.bluetoothDevices.length} dispositivo(s), pero ninguno es CautelApp`, 'warning');
          }
        }
      }, 15000);
      
    } catch (error) {
      console.error('❌ Error escaneando:', error);
      this.isScanning = false;
      this.showToast('Error al escanear dispositivos BLE. Verifica los permisos de Bluetooth y ubicación.', 'danger');
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
      
      // Ir directo a configuración WiFi (los datos del adulto se pedirán después)
      this.connectionStep = 'wifi-manual';
      this.wifiConnected = false;
      this.showToast('Dispositivo conectado. Ahora configura el WiFi.', 'success');
      
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
      
      // Remover del servicio BLE
      this.bleService.removeConnectedDevice(this.connectedDevice.id);
      
      this.handleDisconnection();
      this.showToast('Dispositivo desconectado', 'medium');
    } catch (error) {
      console.error('Error desconectando:', error);
      this.handleDisconnection();
    }
  }

  handleDisconnection() {
    // Limpiar timeout si existe
    if (this.wifiTimeoutId) {
      clearTimeout(this.wifiTimeoutId);
      this.wifiTimeoutId = null;
    }
    
    if (this.connectedDevice) {
      this.connectedDevice.connected = false;
      this.connectedDevice = null;
    }
    this.connectionStep = 'bluetooth';
    this.manualSSID = '';
    this.wifiPassword = '';
    this.wifiConnected = false;
    this.wifiStatus = 'idle';
    this.isConnectingWiFi = false;
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
          const status = decoder.decode(value).trim();
          console.log('📊 Estado WiFi recibido:', status, '| Longitud:', status.length);
          
          // Limpiar timeout si existe
          if (this.wifiTimeoutId) {
            clearTimeout(this.wifiTimeoutId);
            this.wifiTimeoutId = null;
          }
          
          // Manejar diferentes estados
          if (status === 'CONNECTING' || status.includes('CONNECTING')) {
            this.wifiStatus = 'waiting';
            // No mostrar toast aquí si ya estamos en tab2
          } else if (status === 'CONNECTED' || status.includes('CONNECTED')) {
            this.wifiConnected = true;
            this.isConnectingWiFi = false;
            this.wifiStatus = 'connected';
            
            // Notificar al BleService que WiFi se conectó
            if (this.connectedDevice) {
              const deviceToNotify: ConnectedDevice = {
                id: this.connectedDevice.id,
                name: this.connectedDevice.name,
                rssi: this.connectedDevice.rssi,
                mac_address: this.connectedDevice.id,
                bateria: 100,
                connected: true,
                ultimaActividad: 'Ahora'
              };
              this.bleService.notifyWifiConnected(deviceToNotify);
            }
          } else if (status === 'FAILED' || status.includes('FAILED') || status.includes('ERROR')) {
            this.wifiConnected = false;
            this.isConnectingWiFi = false;
            this.wifiStatus = 'failed';
            this.showToast('Error: No se pudo conectar a WiFi. Verifica las credenciales.', 'danger');
          } else {
            console.log('🟡 Estado WiFi desconocido:', status);
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
    this.wifiStatus = 'sending';
    
    try {
      console.log('📤 Enviando credenciales WiFi al ESP32...');
      console.log('📶 SSID:', this.manualSSID);
      
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
      await this.delay(500);
      
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
      
      this.wifiStatus = 'waiting';
      
      // Guardar dispositivo pendiente en el servicio BLE
      const pendingDevice: ConnectedDevice = {
        id: this.connectedDevice.id,
        name: this.connectedDevice.name,
        rssi: this.connectedDevice.rssi,
        mac_address: this.connectedDevice.id,
        bateria: 100,
        connected: true,
        ultimaActividad: 'Ahora'
      };
      this.bleService.setPendingDevice(pendingDevice, this.manualSSID);
      
      this.showToast('Credenciales enviadas. Redirigiendo a dispositivos...', 'success');
      
      // Configurar timeout de 30 segundos (se manejará en tab2)
      this.wifiTimeoutId = setTimeout(() => {
        if (this.wifiStatus === 'waiting' || this.wifiStatus === 'sending') {
          console.log('⏰ Timeout: No se recibió respuesta del ESP32');
          this.wifiStatus = 'failed';
          this.isConnectingWiFi = false;
        }
      }, 30000);
      
      // Navegar al tab de dispositivos después de un momento
      await this.delay(1000);
      this.router.navigate(['/tabs/tab2']);
      
    } catch (error) {
      console.error('❌ Error enviando credenciales:', error);
      this.showToast('Error al enviar credenciales: ' + (error as Error).message, 'danger');
      this.isConnectingWiFi = false;
      this.wifiStatus = 'failed';
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
  // GUARDAR DATOS DEL ADULTO (después de conectar WiFi)
  // =====================

  async saveAdultInfo() {
    if (!this.connectedDevice) return;

    // Abrir modal para capturar datos del adulto mayor
    const adultInfo = await this.openAdultInfoModal();
    
    if (!adultInfo) {
      this.showToast('Debes completar los datos del adulto mayor', 'warning');
      return;
    }

    // Agregar dispositivo al servicio BLE con información del adulto mayor
    const deviceToAdd: ConnectedDevice = {
      id: this.connectedDevice.id,
      name: this.connectedDevice.name,
      rssi: this.connectedDevice.rssi,
      mac_address: this.connectedDevice.id, // En Android puede ser la MAC, en iOS un UUID
      bateria: 100, // Valor inicial, se actualizará después
      connected: true,
      ultimaActividad: 'Ahora',
      adulto: {
        id_adulto: 0,
        nombre: adultInfo.nombre,
        fecha_nacimiento: adultInfo.fecha_nacimiento || '1950-01-01',
        direccion: adultInfo.direccion || 'No especificada'
      }
    };
    
    console.log('📱 Dispositivo a agregar:', JSON.stringify(deviceToAdd, null, 2));
    console.log('📅 Fecha de nacimiento:', adultInfo.fecha_nacimiento);
    
    this.bleService.addConnectedDevice(deviceToAdd);
    
    this.showToast('¡Dispositivo configurado exitosamente!', 'success');
    
    // Volver a la pantalla anterior o a la lista de dispositivos
    this.navController.back();
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

  async openAdultInfoModal(): Promise<{ nombre: string; fecha_nacimiento?: string; direccion?: string } | null> {
    const modal = await this.modalController.create({
      component: AdultInfoModalComponent,
      cssClass: 'adult-info-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    return data || null;
  }
}
