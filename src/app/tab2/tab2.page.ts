import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, PopoverController, ModalController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';
import { BleService, ConnectedDevice } from '../services/ble.service';
import { Router } from '@angular/router';
import { DeviceApiService } from '../services/device-api.service';
import { AdultInfoModalComponent } from '../pages/configuration/adult-info-modal/adult-info-modal.component';
import { SharedGroupModalComponent } from './shared-group-modal/shared-group-modal.component';
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
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page implements OnInit {
  userProfileImage: string | null = null;
  adultosMonitoreados: AdultoMayor[] = [];
  dispositivosBackend: AdultoMayor[] = [];
  dispositivosReales: ConnectedDevice[] = [];

  constructor(
    private auth: AuthService,
    private popoverController: PopoverController,
    private bleService: BleService,
    private router: Router,
    private deviceApiService: DeviceApiService,
    private modalController: ModalController,
    private toastController: ToastController
  ) { }

  async openSharedGroupModal() {
    const modal = await this.modalController.create({
      component: SharedGroupModalComponent,
      cssClass: 'shared-group-modal',
      breakpoints: [0, 0.5, 0.9, 1],
      initialBreakpoint: 0.9,
      handle: true
    });
    return await modal.present();
  }

  ngOnInit(): void {
    this.loadUserProfileImage();
    this.cargarDispositivosGuardados();
    this.bleService.connectedDevices$.subscribe((devices: ConnectedDevice[]) => {
      this.dispositivosReales = devices;
      this.combinarDispositivos();
    });
  }

  cargarDispositivosGuardados() {
    this.deviceApiService.obtenerMisDispositivos().subscribe({
      next: (dispositivos: any[]) => {
        console.log('RESPUESTA BACKEND obtenerMisDispositivos:', dispositivos);
        this.dispositivosBackend = dispositivos.map((disp: any) => ({
          id_adulto: disp.id_adulto,
          nombre: disp.nombre,
          fecha_nacimiento: disp.fecha_nacimiento,
          direccion: disp.direccion,
          dispositivo: disp.dispositivo,
          edad: this.calcularEdad(disp.fecha_nacimiento),
          conectado: false,
          ultimaActividad: 'Sin conexión reciente'
        }));
        this.combinarDispositivos();
        this.adultosMonitoreados = this.dispositivosBackend.filter((d: any) => d.dispositivo);
      },
      error: (error: any) => {
        console.error('Error cargando dispositivos guardados:', error);
      }
    });
  }

  combinarDispositivos() {
    if (!this.dispositivosBackend) return;
    const dispositivosBLE = this.dispositivosReales || [];
    const dispositivosCombinados: AdultoMayor[] = [];
    
    // Filtrar dispositivos BLE válidos
    const bleValidos = dispositivosBLE.filter((d: any) => d && d.dispositivo && d.dispositivo.mac_address);
    const macsConectadas = new Set(bleValidos.map((d: any) => d.dispositivo.mac_address));
    
    bleValidos.forEach((dispBLE: any) => {
      const dispBackend = this.dispositivosBackend.find(
        (db: any) => db && db.dispositivo && db.dispositivo.mac_address === dispBLE.dispositivo.mac_address
      );
      if (dispBackend) {
        dispositivosCombinados.push({
          ...dispBackend,
          conectado: true,
          ultimaActividad: 'Ahora',
          deviceId: dispBLE.deviceId
        });
      } else {
        dispositivosCombinados.push(dispBLE);
      }
    });
    
    this.dispositivosBackend.forEach((dispBackend: any) => {
      if (dispBackend && dispBackend.dispositivo && dispBackend.dispositivo.mac_address) {
        if (!macsConectadas.has(dispBackend.dispositivo.mac_address)) {
          dispositivosCombinados.push(dispBackend);
        }
      }
    });
    this.adultosMonitoreados = dispositivosCombinados;
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
    this.router.navigate(['/configuration']);
  }

  viewDevice(adulto: AdultoMayor) {
    const infoTexto = `Información de ${adulto.nombre}\n\n` +
      `Edad: ${adulto.edad} años\n` +
      `Dirección: ${adulto.direccion}\n` +
      `Dispositivo: ${adulto.dispositivo?.mac_address || 'No asignado'}\n` +
      `Batería: ${adulto.dispositivo?.bateria || 0}%\n` +
      `Estado: ${adulto.conectado ? 'En línea' : 'Desconectado'}\n` +
      `Última actividad: ${adulto.ultimaActividad}`;
    alert(infoTexto);
  }

  async editAdult(adulto: AdultoMayor) {
    const modal = await this.modalController.create({
      component: AdultInfoModalComponent,
      cssClass: 'adult-info-modal'
    });
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
      this.deviceApiService.actualizarAdultoMayor(adulto.id_adulto, {
        nombre: data.nombre,
        fecha_nacimiento: data.fecha_nacimiento,
        direccion: data.direccion
      }).subscribe({
        next: async () => {
          await this.showToast('Datos actualizados exitosamente', 'success');
          this.cargarDispositivosGuardados();
        },
        error: async (error: any) => {
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
    if (adulto.deviceId) {
      await this.bleService.disconnectDevice(adulto.deviceId);
    }
    if (adulto.dispositivo?.id_dispositivo) {
      this.deviceApiService.deleteDispositivo(adulto.dispositivo.id_dispositivo).subscribe({
        next: async () => {
          await this.showToast('Dispositivo eliminado correctamente', 'success');
          this.cargarDispositivosGuardados();
        },
        error: async (error: any) => {
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
