import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { NavController, PopoverController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';
import { NotificationService, Notification } from '../services/notification.service';
import { LocalNotificationService } from '../services/local-notification.service';
import { environment } from '../../environments/environment';

interface NotificacionUI {
  id: number;
  tipo: 'emergencia' | 'ayuda' | 'panico';
  usuario: string;
  descripcion: string;
  tiempo: string;
  ubicacion?: string;
  leida: boolean;
  resuelta?: boolean;
  etiquetas?: string[];
  isShared?: boolean; // Indica si viene de un dispositivo compartido
}

type Filtro = 'todas' | 'emergencia' | 'ayuda' | 'panico';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class Tab1Page implements OnInit, OnDestroy {
  filtroActivo: Filtro = 'todas';
  userProfileImage: string | null = null;
  notificaciones: NotificacionUI[] = [];
  isLoading = false;
  
  // Variables para mostrar BPM en tiempo real
  currentBpm: number | null = null;
  currentAdultoName: string | null = null;
  
  // Para detectar nuevas notificaciones
  private previousNotificationIds: Set<number> = new Set();
  private pollingInterval: any = null;
  private sseConnection: EventSource | null = null;

  constructor(
    private navCtrl: NavController, 
    private router: Router, 
    private auth: AuthService, 
    private popoverController: PopoverController,
    private notificationService: NotificationService,
    private localNotificationService: LocalNotificationService
  ) {}

  async ngOnInit() {
    this.loadUserProfileImage();
    
    // Solicitar permisos de notificaciones locales
    await this.localNotificationService.requestPermissions();
    
    // Cargar notificaciones iniciales
    await this.loadNotifications();
    
    // Conectar a SSE para recibir notificaciones y BPM en tiempo real
    this.connectToSSE();
    
    // Iniciar polling cada 10 segundos para verificar nuevas notificaciones
    this.startPolling();
  }
  
  ngOnDestroy() {
    // Limpiar el polling cuando se destruya el componente
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Cerrar conexión SSE
    if (this.sseConnection) {
      this.sseConnection.close();
      console.log('[Tab1] Conexión SSE cerrada');
    }
  }
  
  /**
   * Conecta al endpoint SSE para recibir notificaciones y BPM en tiempo real
   */
  private connectToSSE() {
    const user = this.auth.getCurrentUser();
    const token = this.auth.getToken();
    
    if (!user || !token) {
      console.warn('[Tab1] No se puede conectar a SSE: usuario no autenticado');
      return;
    }
    
    // Conectar al endpoint SSE de notificaciones
    const sseUrl = `${environment.apiUrl}/device/events/notifications?token=${token}`;
    console.log('[Tab1] Conectando a SSE:', sseUrl);
    
    this.sseConnection = new EventSource(sseUrl);
    
    this.sseConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Tab1] Evento SSE recibido:', data);
        
        // Verificar si es una actualización de BPM
        if (data.tipo === 'BPM_UPDATE' && data.pulso !== undefined) {
          this.currentBpm = data.pulso;
          this.currentAdultoName = data.usuario;
          console.log(`[Tab1] 💓 BPM actualizado: ${data.pulso} (${data.usuario})`);
        }
        // Si es una notificación de emergencia
        else if (data.tipo === 'EMERGENCIA' || data.tipo === 'PANICO') {
          console.log(`[Tab1] 🚨 Notificación de ${data.tipo} recibida`);
          
          // Enviar notificación local al teléfono
          this.sendLocalEmergencyNotification(data.usuario, data.mensaje, data.tipo);
          
          // Recargar notificaciones
          this.loadNotifications();
        }
      } catch (error) {
        console.error('[Tab1] Error procesando evento SSE:', error);
      }
    };
    
    this.sseConnection.onerror = (error) => {
      console.error('[Tab1] Error en conexión SSE:', error);
      // Intentar reconectar después de 5 segundos
      setTimeout(() => {
        console.log('[Tab1] Intentando reconectar SSE...');
        this.connectToSSE();
      }, 5000);
    };
    
    this.sseConnection.onopen = () => {
      console.log('[Tab1] ✅ Conexión SSE establecida');
    };
  }
  
  /**
   * Envía notificación local de emergencia al teléfono
   */
  private async sendLocalEmergencyNotification(nombreAdulto: string, mensaje: string, tipo: string = 'EMERGENCIA') {
    try {
      const title = tipo === 'PANICO' ? '⚠️ BOTÓN DE PÁNICO' : '🚨 EMERGENCIA';
      const body = mensaje || (tipo === 'PANICO' 
        ? `${nombreAdulto} presionó el botón de emergencia` 
        : `${nombreAdulto} necesita tu ayuda rápido`);
      
      await this.localNotificationService.sendEmergencyNotification(
        title,
        body,
        { tipo: tipo.toLowerCase(), adulto: nombreAdulto }
      );
      console.log('[Tab1] 📱 Notificación local enviada');
    } catch (error) {
      console.error('[Tab1] Error enviando notificación local:', error);
    }
  }
  
  /**
   * Inicia el polling para verificar nuevas notificaciones cada 10 segundos
   */
  private startPolling() {
    this.pollingInterval = setInterval(() => {
      this.checkForNewNotifications();
    }, 10000); // 10 segundos
  }
  
  /**
   * Verifica si hay nuevas notificaciones y envía notificaciones locales
   */
  private async checkForNewNotifications() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this.notificationService.getUserNotifications(user.id_usuario).subscribe({
      next: async (notifications: Notification[]) => {
        const newNotifications = notifications.filter(n => 
          !this.previousNotificationIds.has(n.id_notificacion)
        );
        
        // Enviar notificación local para cada nueva notificación
        for (const notification of newNotifications) {
          await this.sendLocalNotificationForAlert(notification);
          this.previousNotificationIds.add(notification.id_notificacion);
        }
        
        // Actualizar la UI
        this.notificaciones = notifications.map(n => this.transformNotification(n));
      },
      error: (error) => {
        console.error('Error verificando nuevas notificaciones:', error);
      }
    });
  }
  
  /**
   * Envía una notificación local cuando llega una alerta del dispositivo
   */
  private async sendLocalNotificationForAlert(notification: Notification) {
    const usuario = notification.adulto?.nombre || 'Usuario';
    const tipo = notification.tipo.toUpperCase() as 'EMERGENCIA' | 'AYUDA' | 'PANICO';
    const mensaje = notification.mensaje || 'Sin mensaje';
    
    let title = '';
    let body = '';
    
    if (tipo === 'EMERGENCIA') {
      title = '🚨 EMERGENCIA';
      body = `${usuario} necesita asistencia de inmediato: ${mensaje}`;
    } else if (tipo === 'PANICO') {
      title = '⚠️ BOTÓN DE PÁNICO';
      body = `${usuario} presionó el botón de emergencia: ${mensaje}`;
    } else if (tipo === 'AYUDA') {
      title = '⚠️ SOLICITUD DE AYUDA';
      body = `${usuario} necesita ayuda: ${mensaje}`;
    } else {
      title = '📢 Notificación';
      body = mensaje;
    }
    
    // Enviar notificación local
    await this.localNotificationService.sendNotification(
      title,
      body,
      tipo,
      { notificationId: notification.id_notificacion }
    );
  }

  loadUserProfileImage() {
    const user = this.auth.getCurrentUser();
    if (user && (user as any).imagen) {
      this.userProfileImage = (user as any).imagen;
    }
  }

  async loadNotifications() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this.isLoading = true;
    this.notificationService.getUserNotifications(user.id_usuario).subscribe({
      next: (notifications: Notification[]) => {
        this.notificaciones = notifications.map(n => this.transformNotification(n));
        
        // Guardar IDs para detectar nuevas notificaciones en el polling
        this.previousNotificationIds = new Set(notifications.map(n => n.id_notificacion));
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando notificaciones:', error);
        this.isLoading = false;
        // Mantener notificaciones vacías en caso de error
        this.notificaciones = [];
      }
    });
  }

  transformNotification(n: Notification): NotificacionUI {
    const tipoLower = n.tipo.toLowerCase();
    let tipo: 'emergencia' | 'ayuda' | 'panico';
    
    if (tipoLower === 'emergencia') {
      tipo = 'emergencia';
    } else if (tipoLower === 'panico') {
      tipo = 'panico';
    } else {
      tipo = 'ayuda';
    }
    
    const usuario = n.adulto?.nombre || 'Usuario desconocido';
    
    let descripcion: string;
    if (tipo === 'emergencia') {
      descripcion = n.mensaje || `${usuario} necesita asistencia de inmediato.`;
    } else if (tipo === 'panico') {
      descripcion = n.mensaje || `${usuario} presionó el botón de emergencia.`;
    } else {
      descripcion = n.mensaje || `${usuario} necesita ayuda.`;
    }
    
    const isShared = n.adulto?.sharedInGroups && n.adulto.sharedInGroups.length > 0;
    
    return {
      id: n.id_notificacion,
      tipo: tipo,
      usuario: usuario,
      descripcion: descripcion,
      tiempo: this.getRelativeTime(n.fecha_hora),
      ubicacion: n.adulto?.direccion,
      leida: false,
      isShared: isShared
    };
  }

  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  get notificacionesFiltradas(): NotificacionUI[] {
    if (this.filtroActivo === 'todas') {
      return this.notificaciones;
    }
    return this.notificaciones.filter(n => n.tipo === this.filtroActivo);
  }

  setFiltro(filtro: string | number | null | undefined) {
    const val = filtro == null ? 'todas' : String(filtro);
    if (val === 'todas' || val === 'emergencia' || val === 'ayuda' || val === 'panico') {
      this.filtroActivo = val as Filtro;
    } else {
      this.filtroActivo = 'todas';
    }
  }

  marcarLeida(index: number) {
    if (index < 0 || index >= this.notificacionesFiltradas.length) {
      return;
    }
    const notiId = this.notificacionesFiltradas[index].id;
    const notiIndex = this.notificaciones.findIndex(n => n.id === notiId);
    if (notiIndex !== -1) {
      this.notificaciones[notiIndex].leida = true;
    }
  }

  marcarTodasLeidas() {
    this.notificaciones.forEach(n => n.leida = true);
  }

  async openProfileMenu(event: any) {
    // Recargar imagen por si cambió en el modal
    this.loadUserProfileImage();
    
    const currentUser = this.auth.getCurrentUser();
    
    const popover = await this.popoverController.create({
      component: ProfileMenuComponent,
      event: event,
      componentProps: {
        userEmail: currentUser?.email || 'usuario@example.com',
        userName: currentUser?.nombre || 'Usuario'
      },
      translucent: true,
      cssClass: 'profile-popover'
    });

    return await popover.present();
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  async logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
