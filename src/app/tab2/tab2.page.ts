import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, PopoverController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';

interface Dispositivo {
  id_dispositivo: number;
  bateria: number;
  mac_address: string;
}

interface AdultoMayor {
  id_adulto: number;
  nombre: string;
  fecha_nacimiento: string;
  direccion: string;
  dispositivo: Dispositivo;
  edad?: number;
  conectado?: boolean;
  ultimaActividad?: string;
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonContent, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page implements OnInit {
  userProfileImage: string | null = null;

  // Datos simulados según el schema de Prisma
  adultosMonitoreados: AdultoMayor[] = [
    {
      id_adulto: 1,
      nombre: 'María García López',
      fecha_nacimiento: '1945-03-15',
      direccion: 'Casa Principal - Sala',
      dispositivo: {
        id_dispositivo: 1,
        bateria: 85,
        mac_address: 'AA:BB:CC:DD:EE:FF'
      },
      edad: 79,
      conectado: true,
      ultimaActividad: 'Hace 2 minutos'
    },
    {
      id_adulto: 2,
      nombre: 'Pedro Martínez Ruiz',
      fecha_nacimiento: '1940-07-22',
      direccion: 'Habitación Principal',
      dispositivo: {
        id_dispositivo: 2,
        bateria: 60,
        mac_address: '11:22:33:44:55:66'
      },
      edad: 84,
      conectado: true,
      ultimaActividad: 'Hace 5 minutos'
    },
    {
      id_adulto: 3,
      nombre: 'Ana López Fernández',
      fecha_nacimiento: '1950-11-10',
      direccion: 'Última conexión: Cocina',
      dispositivo: {
        id_dispositivo: 3,
        bateria: 15,
        mac_address: 'FF:EE:DD:CC:BB:AA'
      },
      edad: 74,
      conectado: false,
      ultimaActividad: 'Hace 3 horas'
    }
  ];

  constructor(
    private auth: AuthService,
    private popoverController: PopoverController
  ) {}

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

  getBatteryClass(bateria: number): string {
    if (bateria > 70) return 'high';
    if (bateria > 30) return 'medium';
    return 'low';
  }

  openAddDevice() {
    alert('Función de vincular nuevo adulto mayor (próximamente)');
  }

  viewDevice(adulto: AdultoMayor) {
    const infoTexto = `Información de ${adulto.nombre}\n\n` +
      `Edad: ${adulto.edad} años\n` +
      `Dirección: ${adulto.direccion}\n` +
      `Dispositivo: ${adulto.dispositivo.mac_address}\n` +
      `Batería: ${adulto.dispositivo.bateria}%\n` +
      `Última actividad: ${adulto.ultimaActividad}`;
    alert(infoTexto);
  }

  removeDevice(adulto: AdultoMayor) {
    const confirmed = confirm(`¿Dejar de monitorear a ${adulto.nombre}?`);
    if (confirmed) {
      const index = this.adultosMonitoreados.indexOf(adulto);
      if (index > -1) {
        this.adultosMonitoreados.splice(index, 1);
      }
    }
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
}
