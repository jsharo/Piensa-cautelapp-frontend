import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonContent, PopoverController, ModalController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';
import { BleService, ConnectedDevice } from '../services/ble.service';
import { Router } from '@angular/router';
import { DeviceApiService } from '../services/device-api.service';
import { SharedGroupService, SharedGroup } from '../services/shared-group.service';
import { AdultInfoModalComponent } from '../pages/configuration/adult-info-modal/adult-info-modal.component';
import { FormsModule } from '@angular/forms';

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
  deviceId?: string; // ID del dispositivo BLE real
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonContent, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page implements OnInit {
  userProfileImage: string | null = null;
  adultosMonitoreados: AdultoMayor[] = [];
  dispositivosBackend: AdultoMayor[] = [];


  // --- INVITACIÓN POR CÓDIGO ---
  sharedGroup: SharedGroup | null = null;
  inviteCode: string | null = null;
  joinCode: string = '';
  joinError: string = '';
  isLoadingGroup = false;

  constructor(
    private auth: AuthService,
    private popoverController: PopoverController,
    private bleService: BleService,
    private router: Router,
    private deviceApiService: DeviceApiService,
    private modalController: ModalController,
    private toastController: ToastController,
    private sharedGroupService: SharedGroupService
  ) {}
  // --- LÓGICA DE INVITACIÓN ---
  async createOrGetGroup() {
    this.isLoadingGroup = true;
    this.inviteCode = null;
    this.sharedGroup = null;
    this.joinError = '';
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.isLoadingGroup = false;
      return;
    }
    this.sharedGroupService.getMyGroups(user.id_usuario).subscribe({
      next: (groups) => {
        if (groups.length > 0) {
          this.sharedGroup = groups[0];
          this.inviteCode = groups[0].code;
          this.isLoadingGroup = false;
        } else {
          this.sharedGroupService.createGroup(user.id_usuario).subscribe({
            next: (group) => {
              this.sharedGroup = group;
              this.inviteCode = group.code;
              this.isLoadingGroup = false;
            },
            error: () => { this.isLoadingGroup = false; }
          });
        }
      },
      error: () => { this.isLoadingGroup = false; }
    });
  }

  joinGroupByCode() {
    this.joinError = '';
    const user = this.auth.getCurrentUser();
    if (!user || !this.joinCode.trim()) return;
    this.isLoadingGroup = true;
    this.sharedGroupService.joinGroup(user.id_usuario, this.joinCode.trim()).subscribe({
      next: (group) => {
        this.sharedGroup = group;
        this.inviteCode = group.code;
        this.isLoadingGroup = false;
        this.joinCode = '';
      },
      error: (err) => {
        this.joinError = 'Código inválido o ya eres miembro.';
        this.isLoadingGroup = false;
      }
    });
  }

  ngOnInit() {
    // Cargar imagen del perfil del usuario
    this.loadUserProfileImage();
    // Cargar dispositivos guardados del backend (WiFi)
    this.cargarDispositivosGuardados();
  }

  cargarDispositivosGuardados() {
    this.deviceApiService.obtenerMisDispositivos().subscribe({
      next: (dispositivos) => {
        console.log('RESPUESTA BACKEND obtenerMisDispositivos:', dispositivos);
        // Convertir dispositivos guardados a formato AdultoMayor
        this.dispositivosBackend = dispositivos.map((disp) => ({
          id_adulto: disp.id_adulto,
          nombre: disp.nombre,
          fecha_nacimiento: disp.fecha_nacimiento,
          direccion: disp.direccion,
          dispositivo: disp.dispositivo,
          edad: this.calcularEdad(disp.fecha_nacimiento),
          conectado: false,
          ultimaActividad: 'Sin conexión reciente'
        }));
        // Mostrar solo los adultos que tienen dispositivo válido (no null)
        this.adultosMonitoreados = this.dispositivosBackend.filter(d => d.dispositivo);
      },
      error: (error) => {
        console.error('Error cargando dispositivos guardados:', error);
      }
    });
  }



  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
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
    // Navegar a la página de configuración para conectar un nuevo dispositivo
    this.router.navigate(['/configuration']);
  }

  viewDevice(adulto: AdultoMayor) {
    const infoTexto = `Información de ${adulto.nombre}\n\n` +
      `Edad: ${adulto.edad} años\n` +
      `Dirección: ${adulto.direccion}\n` +
      `Dispositivo: ${adulto.dispositivo.mac_address}\n` +
      `Batería: ${adulto.dispositivo.bateria}%\n` +
      `Estado: ${adulto.conectado ? 'En línea' : 'Desconectado'}\n` +
      `Última actividad: ${adulto.ultimaActividad}`;
    alert(infoTexto);
  }

  async editAdult(adulto: AdultoMayor) {
    const modal = await this.modalController.create({
      component: AdultInfoModalComponent,
      cssClass: 'adult-info-modal'
    });

    // Configurar datos mediante el componente antes de presentar
    modal.componentProps = {
      nombre: adulto.nombre,
      fecha_nacimiento: adulto.fecha_nacimiento ? new Date(adulto.fecha_nacimiento).toISOString().split('T')[0] : '',
      direccion: adulto.direccion,
      isEditMode: true,
      title: 'Editar Adulto Mayor'
    };

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data) {
      // Actualizar en el backend
      this.deviceApiService.actualizarAdultoMayor(adulto.id_adulto, {
        nombre: data.nombre,
        fecha_nacimiento: data.fecha_nacimiento,
        direccion: data.direccion
      }).subscribe({
        next: async () => {
          await this.showToast('Datos actualizados exitosamente', 'success');
          this.cargarDispositivosGuardados(); // Recargar lista
        },
        error: async (error) => {
          console.error('Error actualizando adulto mayor:', error);
          await this.showToast('Error al actualizar los datos', 'danger');
        }
      });
    }
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 3000,
      position: 'top'
    });
    await toast.present();
  }

  async removeDevice(adulto: AdultoMayor) {
    const confirmed = confirm(`¿Dejar de monitorear a ${adulto.nombre}?`);
    if (!confirmed) return;

    // Desconectar BLE si está conectado
    if (adulto.deviceId) {
      await this.bleService.disconnectDevice(adulto.deviceId);
    }

    // Eliminar en backend si existe en base de datos
    if (adulto.dispositivo?.id_dispositivo) {
      this.deviceApiService.deleteDispositivo(adulto.dispositivo.id_dispositivo).subscribe({
        next: async () => {
          await this.showToast('Dispositivo eliminado correctamente', 'success');
          this.cargarDispositivosGuardados(); // Recargar lista desde backend para asegurar sincronía
        },
        error: async (error) => {
          let errorMsg = 'Error al eliminar el dispositivo';
          if (error && error.error) {
            if (typeof error.error === 'string') {
              errorMsg += ': ' + error.error;
            } else if (error.error.message) {
              errorMsg += ': ' + error.error.message;
            } else {
              errorMsg += ': ' + JSON.stringify(error.error);
            }
          }
          console.error('Error eliminando dispositivo:', error);
          await this.showToast(errorMsg, 'danger');
        }
      });
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

@NgModule({
  imports: [
    // ...otros módulos...
    FormsModule
  ],
  // ...código existente...
})
export class Tab2PageModule {}
