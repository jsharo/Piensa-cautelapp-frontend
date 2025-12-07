import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { NavController } from '@ionic/angular';

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

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class Tab1Page implements OnInit {
  filtroActivo: string = 'todas';
  
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

  constructor(private navCtrl: NavController) {}

  ngOnInit() {
    // Inicialización si es necesaria
  }

  get notificacionesFiltradas(): Notificacion[] {
    if (this.filtroActivo === 'todas') {
      return this.notificaciones;
    }
    return this.notificaciones.filter(n => n.tipo === this.filtroActivo);
  }

  setFiltro(filtro: string) {
    this.filtroActivo = filtro;
  }

  marcarLeida(index: number) {
    this.notificaciones[index].leida = true;
  }

  marcarTodasLeidas() {
    this.notificaciones.forEach(n => n.leida = true);
  }

  goToProfile() {
    // Navegar a perfil
    this.navCtrl.navigateForward('/perfil');
  }
}
