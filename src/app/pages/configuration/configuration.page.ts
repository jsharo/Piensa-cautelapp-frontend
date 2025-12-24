import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, IonButton, NavController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  imports: [IonContent, IonButton, CommonModule, FormsModule],
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

  constructor(
    private navController: NavController
  ) {}

  ngOnInit() {
    // Inicializar Bluetooth cuando carga la página
    this.initializeBluetooth();
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
}
