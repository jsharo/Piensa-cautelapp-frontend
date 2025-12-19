import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab1Page implements OnInit {
  filtroActivo: Filtro = 'todas';
  user: any = null;

  // Propiedades para el Modal de Edición
  isModalOpen = false;
  saving = false;
  editData = {
    nombre: '',
    email: ''
  };

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

  constructor(
    private router: Router,
    private auth: AuthService,
    private toast: ToastController
  ) { }

  ngOnInit() {
    this.loadUser();
  }

  loadUser() {
    this.user = this.auth.getCurrentUser();
    if (this.user) this.syncEditData();

    this.auth.me().subscribe({
      next: (u) => {
        this.user = u;
        this.syncEditData();
      },
      error: () => console.log('Error al cargar usuario en Tab1')
    });
  }

  syncEditData() {
    const currentUser = this.auth.getCurrentUser();
    if (currentUser) {
      this.user = currentUser;
      this.editData.nombre = currentUser.nombre || '';
      this.editData.email = currentUser.email || '';
    }
  }

  openEditModal() {
    this.syncEditData(); // Asegurar datos frescos
    setTimeout(() => {
      this.isModalOpen = true;
    }, 50); // Pequeño delay para asegurar ciclo de detección de Angular
  }

  closeEditModal() {
    this.isModalOpen = false;
  }

  async saveProfile() {
    if (!this.user) return;

    this.saving = true;
    this.auth.updateUser(this.user.id_usuario, this.editData).subscribe({
      next: (updated) => {
        this.user = updated;
        this.saving = false;
        this.isModalOpen = false;
        this.showToast('Perfil actualizado correctamente', 'success');
      },
      error: () => {
        this.saving = false;
        this.showToast('Error al actualizar el perfil', 'danger');
      }
    });
  }

  async showToast(message: string, color: string) {
    const t = await this.toast.create({
      message,
      color,
      duration: 2500,
      position: 'top',
    });
    t.present();
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

  async logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
