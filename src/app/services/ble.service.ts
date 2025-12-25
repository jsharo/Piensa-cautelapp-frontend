import { Injectable } from '@angular/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { BehaviorSubject, Observable } from 'rxjs';
import { DeviceApiService } from './device-api.service';

// UUIDs del ESP32 - DEBEN COINCIDIR con el código del ESP32
const BLE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const BLE_DEVICE_INFO_CHAR_UUID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'; // UUID para info del dispositivo

export interface ConnectedDevice {
  id: string;
  name: string;
  rssi?: number;
  mac_address: string;
  bateria?: number;
  connected: boolean;
  ultimaActividad?: string;
  // Información del adulto mayor asociado (si existe)
  adulto?: {
    id_adulto: number;
    nombre: string;
    fecha_nacimiento: string;
    direccion: string;
    edad?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BleService {
  private connectedDevicesSubject = new BehaviorSubject<ConnectedDevice[]>([]);
  public connectedDevices$: Observable<ConnectedDevice[]> = this.connectedDevicesSubject.asObservable();

  private initialized = false;

  constructor(private deviceApiService: DeviceApiService) {
    this.initializeBluetooth();
  }

  async initializeBluetooth() {
    if (this.initialized) return;
    
    try {
      await BleClient.initialize();
      this.initialized = true;
      console.log('✅ BLE Service inicializado');
    } catch (error) {
      console.error('❌ Error inicializando BLE Service:', error);
    }
  }

  getConnectedDevices(): ConnectedDevice[] {
    return this.connectedDevicesSubject.value;
  }

  addConnectedDevice(device: ConnectedDevice) {
    const devices = this.connectedDevicesSubject.value;
    const existingIndex = devices.findIndex(d => d.id === device.id);
    
    if (existingIndex >= 0) {
      // Actualizar dispositivo existente
      devices[existingIndex] = device;
    } else {
      // Agregar nuevo dispositivo
      devices.push(device);
      
      // Vincular dispositivo en el backend
      this.vincularEnBackend(device);
    }
    
    this.connectedDevicesSubject.next([...devices]);
  }

  private vincularEnBackend(device: ConnectedDevice) {
    this.deviceApiService.vincularDispositivo({
      mac_address: device.mac_address,
      bateria: device.bateria || 100,
      nombre_adulto: device.adulto?.nombre || undefined,
      fecha_nacimiento: device.adulto?.fecha_nacimiento || undefined,
      direccion: device.adulto?.direccion || undefined,
      ble_device_id: device.id
    }).subscribe({
      next: (response) => {
        console.log('✅ Dispositivo vinculado en el backend:', response);
      },
      error: (error) => {
        console.error('❌ Error vinculando dispositivo en el backend:', error);
        console.error('Detalles del error:', error.error);
      }
    });
  }

  removeConnectedDevice(deviceId: string) {
    const devices = this.connectedDevicesSubject.value.filter(d => d.id !== deviceId);
    this.connectedDevicesSubject.next(devices);
  }

  updateDeviceBattery(deviceId: string, bateria: number) {
    const devices = this.connectedDevicesSubject.value;
    const device = devices.find(d => d.id === deviceId);
    
    if (device) {
      device.bateria = bateria;
      device.ultimaActividad = 'Ahora';
      this.connectedDevicesSubject.next([...devices]);
    }
  }

  async disconnectDevice(deviceId: string) {
    try {
      await BleClient.disconnect(deviceId);
      this.removeConnectedDevice(deviceId);
      console.log('🔌 Dispositivo desconectado:', deviceId);
    } catch (error) {
      console.error('Error desconectando dispositivo:', error);
    }
  }

  // Función para obtener la MAC address del dispositivo BLE (si está disponible)
  getMacAddress(deviceId: string): string {
    // En algunos sistemas Android, el deviceId puede ser la MAC address
    // En iOS, será un UUID
    return deviceId;
  }

  clearAllDevices() {
    this.connectedDevicesSubject.next([]);
  }
}
