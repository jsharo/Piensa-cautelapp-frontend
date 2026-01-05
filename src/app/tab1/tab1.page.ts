import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { NavController, PopoverController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';
import { NotificationService, Notification } from '../services/notification.service';
import { LocalNotificationService } from '../services/local-notification.service';

interface NotificacionUI {
  id: number;
  tipo: 'emergencia' | 'ayuda';
  usuario: string;
  descripcion: string;
  tiempo: string;
  ubicacion?: string;
  leida: boolean;
  resuelta?: boolean;
  etiquetas?: string[];
  isShared?: boolean; // Indica si viene de un dispositivo compartido
}

type Filtro = 'todas' | 'emergencia' | 'ayuda';

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
  
  // Para detectar nuevas notificaciones
  private previousNotificationIds: Set<number> = new Set();
  private pollingInterval: any = null;

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
    
    // Iniciar polling cada 10 segundos para verificar nuevas notificaciones
    this.startPolling();
  }
  
  ngOnDestroy() {
    // Limpiar el polling cuando se destruya el componente
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
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
    const tipo = notification.tipo.toUpperCase() as 'EMERGENCIA' | 'AYUDA';
    const mensaje = notification.mensaje || 'Sin mensaje';
    
    let title = '';
    let body = '';
    
    if (tipo === 'EMERGENCIA') {
      title = '🚨 EMERGENCIA';
      body = `${usuario} necesita asistencia de inmediato: ${mensaje}`;
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
    const tipo = n.tipo.toLowerCase() === 'emergencia' ? 'emergencia' : 'ayuda';
    const usuario = n.adulto?.nombre || 'Usuario desconocido';
    const descripcion = n.mensaje || (tipo === 'emergencia' 
      ? `${usuario} necesita asistencia de inmediato.`
      : `${usuario} necesita ayuda.`);
    
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
    if (val === 'todas' || val === 'emergencia' || val === 'ayuda') {
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
