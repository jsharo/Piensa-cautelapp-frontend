import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { NavController, PopoverController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from './profile-menu/profile-menu.component';

interface Notificacion {
  id: number;
  tipo: 'emergencia' | 'ayuda';
  usuario: string;
  descripcion: string;
  tiempo: string;
  ubicacion?: string;
  leida: boolean;
  resuelta?: boolean;
  etiquetas?: string[];
}

type Filtro = 'todas' | 'emergencia' | 'ayuda';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class Tab1Page implements OnInit {
  filtroActivo: Filtro = 'todas';
  userProfileImage: string | null = null;
  
  notificaciones: Notificacion[] = [
    {
      id: 1,
      tipo: 'emergencia',
      usuario: 'María García',
      descripcion: '¡Papá se ha caído en el baño! Necesito ayuda urgente.',
      tiempo: 'Hace 5 min',
      ubicacion: 'Casa Principal - Baño',
      leida: false
    },
    {
      id: 2,
      tipo: 'ayuda',
      usuario: 'Pedro Martínez',
      descripcion: 'Necesito ayuda para encontrar mis medicamentos.',
      tiempo: 'Hace 15 min',
      ubicacion: 'Habitación Principal',
      leida: false
    },
    {
      id: 3,
      tipo: 'ayuda',
      usuario: 'Ana López',
      descripcion: '¿Podrías ayudarme a recordar dónde dejé las llaves?',
      tiempo: 'Ayer 18:30',
      leida: true,
      resuelta: true
    },
    {
      id: 4,
      tipo: 'emergencia',
      usuario: 'Carlos Ruiz',
      descripcion: 'Dolor en el pecho, llamen a emergencias.',
      tiempo: 'Ayer 14:20',
      leida: true,
      resuelta: true
    }
  ];

  constructor(private navCtrl: NavController, private router: Router, private auth: AuthService, private popoverController: PopoverController) {}

  ngOnInit() {
    // Cargar imagen del perfil del usuario
    this.loadUserProfileImage();
  }

  loadUserProfileImage() {
    const user = this.auth.getCurrentUser();
    if (user && (user as any).imagen) {
      this.userProfileImage = (user as any).imagen;
    }
  }

  get notificacionesFiltradas(): Notificacion[] {
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
