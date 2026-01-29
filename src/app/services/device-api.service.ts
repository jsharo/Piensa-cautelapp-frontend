import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VincularDispositivoDto {
  mac_address: string;
  bateria: number;
  nombre_adulto?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  ble_device_id?: string;
}

export interface UpdateAdultoMayorDto {
  nombre?: string;
  fecha_nacimiento?: string;
  direccion?: string;
}

export interface DispositivoVinculado {
  id_adulto: number;
  nombre: string;
  fecha_nacimiento: string;
  direccion: string;
  dispositivo: {
    id_dispositivo: number;
    bateria: number;
    mac_address: string;
  };
}

export interface DeviceStatus {
  id: number;
  deviceId: string;
  macAddress: string;
  isOnline: boolean;
  lastSeen: Date | null;
  battery: number;
  adultos: Array<{
    id_adulto: number;
    nombre: string;
  }>;
}

export interface DevicesStatusResponse {
  status: string;
  devices: DeviceStatus[];
}

@Injectable({
  providedIn: 'root'
})
export class DeviceApiService {
  private apiUrl = `${environment.apiUrl}/device`;
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  deleteDispositivo(id_dispositivo: number) {
    return this.http.delete(`${this.apiUrl}/${id_dispositivo}`);
  }

  /**
   * Dejar de monitorear un dispositivo/adulto mayor
   * Utiliza id_adulto (no id_dispositivo)
   */
  stopMonitoringDevice(adultoId: number) {
    console.log(`[DEVICE_API] POST /device/stop-monitoring/${adultoId}`);
    return this.http.post(`${this.apiUrl}/stop-monitoring/${adultoId}`, {}).pipe(
      tap((response: any) => console.log(`[DEVICE_API] ✓ Respuesta de eliminación:`, response)),
      catchError((error: any) => {
        console.error(`[DEVICE_API] ✗ Error en eliminación:`, error);
        throw error;
      })
    );
  }

  vincularDispositivo(dto: VincularDispositivoDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/vincular`, dto);
  }

  obtenerMisDispositivos(): Observable<DispositivoVinculado[]> {
    return this.http.get<DispositivoVinculado[]>(`${this.apiUrl}/mis-dispositivos`);
  }

  actualizarAdultoMayor(adultoId: number, dto: UpdateAdultoMayorDto): Observable<DispositivoVinculado> {
    return this.http.patch<DispositivoVinculado>(`${this.apiUrl}/adulto-mayor/${adultoId}`, dto);
  }

  // Obtener el estado de conexión de todos los dispositivos
  getDevicesStatus(): Observable<DevicesStatusResponse> {
    return this.http.get<DevicesStatusResponse>(`${this.baseUrl}/devices/status`);
  }

  // Obtener el estado de conexión de un dispositivo específico
  getDeviceStatus(deviceId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/devices/${deviceId}/status`);
  }

  // Verificar si un dispositivo existe en BD y está vinculado al usuario
  checkDeviceExists(macAddress: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-exists/${macAddress}`);
  }
}
