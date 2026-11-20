import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DeviceConnectionEventsService } from './device-connection-events.service';
import {
  clearStoredSession,
  getAccessToken,
  getOrCreateDeviceKey,
  getStoredUserRaw,
  persistSession,
  storeCurrentUser,
} from './token-store';

// Forward declaration para evitar dependencia circular
export interface FcmServiceInterface {
  initializePushNotifications(userId: number): Promise<void>;
  removeToken(userId: number): Promise<void>;
}

export interface User {
  id_usuario: number;
  nombre: string;
  email: string;
  email_recuperacion?: string;
  id_rol: number;
  rol?: {
    id_rol: number;
    nombre_rol: string;
  };
}

export interface LoginResponse {
  user: User;
  access_token: string;
  expires_in: string;
}

export interface RegisterData {
  nombre: string;
  email: string;
  contrasena: string;
  id_rol?: number;
}

export interface LoginData {
  email: string;
  contrasena: string;
  remember?: boolean;
  dispositivo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Referencia al FCM Service (inyección manual para evitar dependencia circular)
  private fcmService: FcmServiceInterface | null = null;

  constructor(
    private http: HttpClient,
    private deviceConnectionEvents: DeviceConnectionEventsService
  ) {
    this.loadStoredUser();
  }

  /**
   * Establece la referencia al FCM Service (llamado desde AppComponent)
   */
  setFcmService(fcmService: FcmServiceInterface): void {
    this.fcmService = fcmService;
  }

  /**
   * Carga el usuario almacenado en localStorage si existe
   */
  private loadStoredUser(): void {
    const token = this.getToken();
    const userStr = getStoredUserRaw();
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        // Conectar a eventos SSE al cargar sesión existente
        this.deviceConnectionEvents.connect(token);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.clearSession();
      }
    }
  }

  /**
   * Registra un nuevo usuario
   */
  register(data: RegisterData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap(async (response) => await this.handleAuthResponse(response, false))
    );
  }

  /**
   * Inicia sesión
   */
  login(data: LoginData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      ...data,
      dispositivo: data.dispositivo || getOrCreateDeviceKey(),
    }).pipe(
      tap(async (response) => await this.handleAuthResponse(response, data.remember || false))
    );
  }

  /**
   * Obtiene información del usuario actual
   */
  me(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        storeCurrentUser(JSON.stringify(user));
      })
    );
  }

  /**
   * Cierra sesión
   */
  async logout(): Promise<void> {
    const currentUser = this.getCurrentUser();
    const token = this.getToken();
    this.deviceConnectionEvents.disconnect();
    if (this.fcmService && currentUser) {
      void this.fcmService.removeToken(currentUser.id_usuario);
    }
    if (token) {
      this.http.post(`${this.apiUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({ error: () => undefined });
    }
    this.clearSession();
    this.currentUserSubject.next(null);
  }

  /**
   * Maneja la respuesta de autenticación
   */
  private async handleAuthResponse(response: LoginResponse, remember: boolean): Promise<void> {
    persistSession(response.access_token, JSON.stringify(response.user), remember);
    
    // Actualizar estado
    this.currentUserSubject.next(response.user);

    // Conectar a eventos SSE del dispositivo
    this.deviceConnectionEvents.connect(response.access_token);

    // Inicializar FCM después del login (con delay)
    if (this.fcmService && response.user.id_usuario) {
      try {
        // Delay para asegurar que todo esté listo
        setTimeout(async () => {
          try {
            await this.fcmService!.initializePushNotifications(response.user.id_usuario);
            console.log('✅ FCM inicializado después del login');
          } catch (error) {
            console.error('Error inicializando FCM después del login:', error);
          }
        }, 1500);
      } catch (error) {
        console.error('Error configurando inicialización de FCM:', error);
      }
    }
  }

  /**
   * Limpia la sesión
   */
  private clearSession(): void {
    clearStoredSession();
  }

  /**
   * Obtiene el token de acceso
   */
  getToken(): string | null {
    return getAccessToken();
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Actualiza el usuario actual en la sesión
   */
  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    storeCurrentUser(JSON.stringify(user));
  }

  /**
   * Actualiza el perfil del usuario
   */
  updateProfile(id: number, data: { nombre?: string; imagen?: string }): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/user/${id}`, data).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        storeCurrentUser(JSON.stringify(user));
      })
    );
  }

  /**
   * Solicita un código de reset de contraseña
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/auth/forgot-password`,
      { email }
    );
  }

  /**
   * Verifica el código de reset
   */
  verifyResetCode(email: string, code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/auth/verify-reset-code`,
      { email, code }
    );
  }

  /**
   * Actualiza la contraseña con el código de reset
   */
  resetPassword(email: string, code: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/auth/reset-password`,
      { email, code, newPassword }
    );
  }
}
