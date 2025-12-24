import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  id_usuario: number;
  nombre: string;
  email: string;
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
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  /**
   * Carga el usuario almacenado en localStorage si existe
   */
  private loadStoredUser(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem('currentUser');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
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
      tap(response => this.handleAuthResponse(response, false))
    );
  }

  /**
   * Inicia sesión
   */
  login(data: LoginData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, data).pipe(
      tap(response => this.handleAuthResponse(response, data.remember || false))
    );
  }

  /**
   * Obtiene información del usuario actual
   */
  me(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  /**
   * Cierra sesión
   */
  logout(): void {
    this.clearSession();
    this.currentUserSubject.next(null);
  }

  /**
   * Maneja la respuesta de autenticación
   */
  private handleAuthResponse(response: LoginResponse, remember: boolean): void {
    // Guardar token
    localStorage.setItem('access_token', response.access_token);
    
    // Guardar usuario
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    
    // Guardar preferencia de recordar
    if (remember) {
      localStorage.setItem('rememberSession', 'true');
    } else {
      localStorage.removeItem('rememberSession');
    }
    
    // Actualizar estado
    this.currentUserSubject.next(response.user);
  }

  /**
   * Limpia la sesión
   */
  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberSession');
  }

  /**
   * Obtiene el token de acceso
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
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
}
