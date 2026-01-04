import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notification {
  id_notificacion: number;
  id_adulto: number;
  tipo: string;
  fecha_hora: string;
  pulso?: number;
  mensaje?: string;
  adulto?: {
    id_adulto: number;
    nombre: string;
    fecha_nacimiento: string;
    direccion: string;
    dispositivo?: {
      id_dispositivo: number;
      bateria: number;
      mac_address: string;
    };
    usuariosAdultoMayor?: any[];
    sharedInGroups?: any[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las notificaciones del sistema
   */
  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}`);
  }

  /**
   * Obtiene notificaciones de un usuario específico (propias + compartidas)
   */
  getUserNotifications(userId: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Obtiene una notificación específica
   */
  getNotification(id: number): Observable<Notification> {
    return this.http.get<Notification>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea una nueva notificación
   */
  createNotification(notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(`${this.apiUrl}`, notification);
  }

  /**
   * Actualiza una notificación
   */
  updateNotification(id: number, notification: Partial<Notification>): Observable<Notification> {
    return this.http.patch<Notification>(`${this.apiUrl}/${id}`, notification);
  }

  /**
   * Elimina una notificación
   */
  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
