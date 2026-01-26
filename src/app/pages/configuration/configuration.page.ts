import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, IonSpinner, NavController, ToastController, ModalController, ViewWillEnter } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { LucideAngularModule, ChevronLeft, Bluetooth, Mail, Info, CheckCircle2, AlertCircle, Edit, PlusCircle, Trash2, XCircle, ArrowRight, RefreshCw, Wifi, ChevronRight, WifiOff, Eye, EyeOff } from 'lucide-angular';
import { BleService, ConnectedDevice } from '../../services/ble.service';
import { AdultInfoModalComponent } from './adult-info-modal/adult-info-modal.component';
import { Router } from '@angular/router';
import { DeviceConnectionEventsService } from '../../services/device-connection-events.service';
import { Subscription } from 'rxjs';

// UUIDs del ESP32 - DEBEN COINCIDIR EXACTAMENTE con el código del ESP32
const BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const BLE_WIFI_SSID_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const BLE_WIFI_PASSWORD_CHAR_UUID = '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e';
const BLE_WIFI_STATUS_CHAR_UUID = 'cba1d466-344c-4be3-ab3f-189f80dd7518';
const BLE_WIFI_LIST_CHAR_UUID = 'd1e7e1f0-3c3f-4e5d-a7e4-3f8c9d8e7f6d';
const BLE_USER_ID_CHAR_UUID = 'e8c9f5a4-3d2b-4a1c-9e8f-7a6b5c4d3e2f';

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
export class ConfigurationPage implements OnInit, ViewWillEnter, OnDestroy {
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
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  
  // Estado del escaneo Bluetooth
  isScanning = false;
  bluetoothDevices: BluetoothDevice[] = [];
  connectedDevice: BluetoothDevice | null = null;
  
  // Estado del WiFi
  wifiNetworks: WiFiNetwork[] = [];
  selectedWiFi: WiFiNetwork | null = null;
  manualSSID = '';
  wifiPassword = '';
  wifiPasswordVisible = false;
  isConnectingWiFi = false;
  wifiConnected = false;
  wifiStatus: 'idle' | 'sending' | 'waiting' | 'connected' | 'failed' = 'idle';
  private wifiTimeoutId: any = null;
  private sseSubscription: Subscription | null = null;
  private waitingForWiFiConfirmation = false;

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
    private router: Router,
    private deviceConnectionEventsService: DeviceConnectionEventsService
  ) {}

  ngOnInit() {
    // No inicializar nada aquí para evitar problemas de navegación
  }

  async ionViewWillEnter() {
    // Inicializar cuando la vista esté por entrar
    await this.initializeBluetooth();
    await this.loadUser();
    this.initializeSSE();
  }

  async loadUser() {
    // Primero intentar obtener el usuario del storage
    this.user = this.authService.getCurrentUser();
    console.log('👤 Usuario del storage:', this.user);
    
    // Luego actualizar desde el servidor
    try {
      const u = await this.authService.me().toPromise();
      if (u) {
        this.user = u;
        console.log('👤 Usuario actualizado desde servidor:', this.user);
      }
    } catch (error) {
      console.error('Error cargando usuario desde servidor:', error);
      // Si falla, mantener el usuario del storage
      if (!this.user) {
        console.error('⚠️ ADVERTENCIA: No hay usuario disponible');
      }
    }
  }

  initializeSSE() {
    // Conectar a eventos SSE si no está conectado
    const token = this.authService.getToken();
    if (token && !this.deviceConnectionEventsService.isEventSourceConnected()) {
      this.deviceConnectionEventsService.connect(token);
    }

    // Suscribirse a eventos de conexión
    this.sseSubscription = this.deviceConnectionEventsService.connectionEvents$.subscribe({
      next: (event) => {
        console.log('✅ Evento de conexión recibido:', event);
        
        // Verificar si es el dispositivo que estamos configurando
        // event.deviceId contiene el nombre del dispositivo (ej: "CautelApp-D1")
        if (this.connectedDevice && 
            (event.deviceId === this.connectedDevice.name || 
             event.deviceId === this.connectedDevice.id)) {
          this.handleWiFiConnectionSuccess(event);
        }
      },
      error: (error) => {
        console.error('❌ Error en eventos SSE:', error);
      }
    });
  }

  ngOnDestroy() {
    // Limpiar suscripción SSE
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
      this.sseSubscription = null;
    }
    
    // Limpiar timeout
    if (this.wifiTimeoutId) {
      clearTimeout(this.wifiTimeoutId);
      this.wifiTimeoutId = null;
    }
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
    // Si estamos esperando confirmación WiFi, NO volver a bluetooth automáticamente
    if (this.waitingForWiFiConfirmation) {
      console.log('⏳ Esperando confirmación WiFi, no se regresa a bluetooth');
      return;
    }
    
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
          
          // Limpiar timeout solo si el estado es 'CONNECTED' o 'FAILED'
          if ((status === 'CONNECTED' || status.includes('CONNECTED')) || (status === 'FAILED' || status.includes('FAILED') || status.includes('ERROR'))) {
            if (this.wifiTimeoutId) {
              clearTimeout(this.wifiTimeoutId);
              this.wifiTimeoutId = null;
            }
          }
          
          // Manejar diferentes estados
          if (status === 'CONNECTING' || status.includes('CONNECTING')) {
            console.log('🔄 ESP32 está conectando a WiFi...');
            this.wifiStatus = 'waiting';
            this.showToast('Conectando a WiFi...', 'primary', 2000);
          } else if (status === 'DISABLING_BLE') {
            console.log('🔄 ESP32 está deshabilitando BLE...');
            this.wifiStatus = 'waiting';
            this.showToast('Deshabilitando BLE...', 'primary', 2000);
          } else if (status === 'CRED_RECEIVED') {
            console.log('✅ ESP32 recibió las credenciales');
            this.wifiStatus = 'waiting';
            this.showToast('Credenciales recibidas', 'success', 2000);
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
                mac_address: 'CautelApp-D1', // ✅ Usar el mismo ID que envía el ESP32
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
    console.log('🚀 ==================== INICIO sendWiFiCredentials ====================');
    console.log('🔍 Estado del usuario:', this.user);
    console.log('🔍 ID Usuario:', this.user?.id_usuario);
    
    if (!this.connectedDevice || !this.manualSSID || !this.wifiPassword) {
      this.showToast('Por favor completa todos los campos', 'warning');
      return;
    }

    this.isConnectingWiFi = true;
    this.wifiStatus = 'sending';
    
    try {
      console.log('📤 Enviando credenciales WiFi al ESP32...');
      console.log('📶 SSID:', this.manualSSID);
      
      // 1. Enviar User ID
      if (this.user && this.user.id_usuario) {
        const userIdEncoder = new TextEncoder();
        const userIdString = String(this.user.id_usuario);
        console.log('🔍 DEBUG - userIdString generado:', userIdString);
        const userIdArray = userIdEncoder.encode(userIdString);
        console.log('🔍 DEBUG - userIdArray length:', userIdArray.length);
        console.log('🔍 DEBUG - userIdArray:', userIdArray);
        const userIdData = new DataView(userIdArray.buffer);
        await BleClient.write(
          this.connectedDevice.id,
          BLE_SERVICE_UUID,
          BLE_USER_ID_CHAR_UUID,
          userIdData
        );
        console.log('✅ User ID enviado exitosamente:', userIdString);
      } else {
        console.error('❌ No se pudo enviar User ID:');
        console.error('  - this.user:', this.user);
        console.error('  - this.user.id_usuario:', this.user?.id_usuario);
      }
      await this.delay(500);

      // 2. Enviar SSID
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
      await this.delay(500);

      // 3. Enviar contraseña
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
      this.waitingForWiFiConfirmation = true;
      
      // No guardar dispositivo pendiente ni navegar
      // En su lugar, esperar el evento SSE
      
      this.showToast('Credenciales enviadas. Esperando confirmación del dispositivo...', 'success');
      
      // Configurar timeout de 30 segundos (aumentado para dar tiempo al proceso completo)
      this.wifiTimeoutId = setTimeout(async () => {
        if (this.wifiStatus === 'waiting' || this.wifiStatus === 'sending') {
          console.log('⏰ Timeout: No se recibió respuesta del ESP32 en 30 segundos');
          this.wifiStatus = 'failed';
          this.isConnectingWiFi = false;
          this.waitingForWiFiConfirmation = false;
          await this.showToast('No se recibió confirmación del dispositivo. Intenta nuevamente.', 'danger');
          // Esperar un momento y volver a la pantalla de bluetooth
          await this.delay(2000);
          this.connectionStep = 'bluetooth';
          this.manualSSID = '';
          this.wifiPassword = '';
          // Desconectar dispositivo si todavía está conectado
          if (this.connectedDevice) {
            try {
              await BleClient.disconnect(this.connectedDevice.id);
            } catch (e) {
              console.log('Error desconectando:', e);
            }
            this.connectedDevice = null;
          }
        }
      }, 30000);
      
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

  /**
   * Maneja la notificación de conexión WiFi exitosa del backend
   */
  async handleWiFiConnectionSuccess(event: any) {
    console.log('🎉 WiFi conectado exitosamente!', event);
    
    // Verificar que el status sea 'connected' para asegurar que la conexión fue exitosa
    if (event.status !== 'connected') {
      console.log('⚠️ Evento recibido pero status no es "connected":', event.status);
      return;
    }
    
    // Limpiar timeout
    if (this.wifiTimeoutId) {
      clearTimeout(this.wifiTimeoutId);
      this.wifiTimeoutId = null;
    }
    
    this.wifiStatus = 'connected';
    this.wifiConnected = true;
    this.isConnectingWiFi = false;
    this.waitingForWiFiConfirmation = false;
    
    this.showToast('✅ Dispositivo conectado a WiFi exitosamente!', 'success');
    
    // Esperar un momento y luego abrir el modal de datos del adulto
    await this.delay(1000);
    
    // Abrir modal para capturar datos del adulto mayor
    const adultInfo = await this.openAdultInfoModal();
    
    if (!adultInfo) {
      this.showToast('Debes completar los datos del adulto mayor', 'warning');
      return;
    }

    console.log('✅ [CONFIG] Datos del adulto recibidos del modal:', adultInfo);

    // 🔴 CRÍTICO: Guardar en BD usando vincularDispositivo
    const vincularDto = {
      mac_address: 'CautelApp-D1', // ✅ Usar el mismo ID que envía el ESP32
      bateria: 100,
      nombre_adulto: adultInfo.nombre,
      fecha_nacimiento: adultInfo.fecha_nacimiento || '1950-01-01',
      direccion: adultInfo.direccion || 'No especificada'
    };

    console.log('📡 [CONFIG] Llamando vincularDispositivo con:', vincularDto);

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/device/vincular`,
        vincularDto,
        {
          headers: {
            'Authorization': `Bearer ${this.authService.getToken()}`
          }
        }
      ).toPromise();

      console.log('✅ [CONFIG] Respuesta del servidor vincularDispositivo:', response);

      // Agregar dispositivo al servicio BLE con información del adulto mayor
      const deviceToAdd: ConnectedDevice = {
        id: this.connectedDevice!.id,
        name: this.connectedDevice!.name,
        rssi: this.connectedDevice!.rssi,
        mac_address: 'CautelApp-D1',
        bateria: 100,
        connected: true,
        ultimaActividad: 'Ahora',
        adulto: {
          id_adulto: response?.adultoMayor?.id_adulto || 0,
          nombre: adultInfo.nombre,
          fecha_nacimiento: adultInfo.fecha_nacimiento || '1950-01-01',
          direccion: adultInfo.direccion || 'No especificada'
        }
      };
      
      console.log('📱 [CONFIG] Dispositivo a agregar:', JSON.stringify(deviceToAdd, null, 2));
      this.bleService.addConnectedDevice(deviceToAdd);
      
      this.showToast('¡Dispositivo configurado exitosamente en la BD!', 'success');
      
      // Navegar a la lista de dispositivos
      await this.delay(500);
      this.router.navigate(['/tabs/tab2']);
    } catch (error: any) {
      console.error('❌ [CONFIG] Error guardando dispositivo en BD:', error);
      let errorMsg = 'Error al guardar el dispositivo en la base de datos';
      
      if (error && error.error) {
        if (typeof error.error === 'string') {
          errorMsg += ': ' + error.error;
        } else if (error.error.message) {
          errorMsg += ': ' + error.error.message;
        }
      }
      
      this.showToast(errorMsg, 'danger');
    }
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
  async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium' | 'primary', duration: number = 3000) {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: duration,
      position: 'top',
      color: color
    });
    await toast.present();
  }

  // =====================
  // RECOVERY EMAIL FUNCTIONS
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

  validateRecoveryEmail() {
    this.recoveryEmailError = '';
    
    if (!this.recoveryEmail || this.recoveryEmail.trim() === '') {
      return true;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.recoveryEmail)) {
      this.recoveryEmailError = 'Email inválido';
      return false;
    }

    if (this.user && this.recoveryEmail === this.user.email) {
      this.recoveryEmailError = 'Debe ser diferente al email principal';
      return false;
    }

    return true;
  }

  async updateRecoveryEmail() {
    if (!this.user) return;

    if (this.recoveryEmail && !this.validateRecoveryEmail()) {
      return;
    }

    this.loadingRecoveryEmail = true;

    try {
      // Simular actualización (aquí deberías hacer la llamada real al backend)
      await this.delay(1000);
      
      if (this.user) {
        this.user.email_recuperacion = this.recoveryEmail || undefined;
        this.authService.setCurrentUser(this.user);
      }
      
      this.loadingRecoveryEmail = false;
      this.closeRecoveryEmailEdit();
      await this.showToast('Email de recuperación actualizado correctamente', 'success');
    } catch (error: any) {
      console.error('Error actualizando email de recuperación:', error);
      this.loadingRecoveryEmail = false;
      await this.showToast('Error al actualizar el email de recuperación', 'danger');
    }
  }

  async removeRecoveryEmail() {
    if (!this.user || !this.user.email_recuperacion) return;

    const confirm = window.confirm('¿Estás seguro de que deseas eliminar tu email de recuperación?');
    if (!confirm) return;

    await this.updateRecoveryEmail();
  }

  // =====================
  // ADULT INFO MODAL
  // =====================
  // WIFI PASSWORD VISIBILITY TOGGLE
  // =====================

  togglePasswordVisibility() {
    this.wifiPasswordVisible = !this.wifiPasswordVisible;
  }

  // =====================

  async openAdultInfoModal() {
    const modal = await this.modalController.create({
      component: AdultInfoModalComponent,
      cssClass: 'adult-info-modal'
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    return data;
  }
}
