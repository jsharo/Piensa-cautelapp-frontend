import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DeviceConnectionEvent {
  deviceId: string;
  userId: number;
  ssid: string;
  ip?: string;
  rssi: number;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceConnectionEventsService {
  private eventSource: EventSource | null = null;
  private connectionSubject = new Subject<DeviceConnectionEvent>();
  public connectionEvents$ = this.connectionSubject.asObservable();
  private isConnected = false;

  constructor(private ngZone: NgZone) {}

  /**
   * Conecta al SSE endpoint para recibir eventos de conexión de dispositivos
   * Requiere un token JWT válido
   */
  connect(token: string): void {
    try {
      if (this.isConnected) {
        console.log('[DeviceConnectionEvents] Ya está conectado');
        return;
      }

      if (!token || token.trim() === '') {
        console.warn('[DeviceConnectionEvents] Token vacío, no se puede conectar');
        return;
      }

      const url = `${environment.apiUrl}/device/events/connection`;
      console.log('[DeviceConnectionEvents] Conectando a:', url);

      // Crear EventSource con el token en la URL (EventSource no soporta headers)
      // Alternativa: pasar token como query param
      this.eventSource = new EventSource(`${url}?token=${token}`);

      this.eventSource.onopen = () => {
        this.ngZone.run(() => {
          this.isConnected = true;
          console.log('[DeviceConnectionEvents] Conexión SSE establecida');
        });
      };

      this.eventSource.onmessage = (event) => {
        this.ngZone.run(() => {
          try {
            const data: DeviceConnectionEvent = JSON.parse(event.data);
            console.log('[DeviceConnectionEvents] Evento recibido:', data);
            this.connectionSubject.next(data);
          } catch (error) {
            console.error('[DeviceConnectionEvents] Error parseando evento:', error);
          }
        });
      };

      this.eventSource.onerror = (error) => {
        this.ngZone.run(() => {
          console.error('[DeviceConnectionEvents] Error en conexión SSE:', error);
          this.isConnected = false;
          // Intentar reconectar después de 5 segundos
          setTimeout(() => {
            if (token) {
              console.log('[DeviceConnectionEvents] Intentando reconectar...');
              this.disconnect();
              this.connect(token);
            }
          }, 5000);
        });
      };
    } catch (error) {
      console.error('[DeviceConnectionEvents] Error al intentar conectar SSE:', error);
      this.isConnected = false;
    }
  }

  /**
   * Desconecta del SSE endpoint
   */
  disconnect(): void {
    if (this.eventSource) {
      console.log('[DeviceConnectionEvents] Desconectando SSE');
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }

  /**
   * Verifica si está conectado
   */
  isEventSourceConnected(): boolean {
    return this.isConnected;
  }
}
