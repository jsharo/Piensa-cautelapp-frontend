import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, PopoverController, ModalController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';
import { BleService, ConnectedDevice } from '../services/ble.service';
import { Router } from '@angular/router';
import { DeviceApiService } from '../services/device-api.service';
import { AdultInfoModalComponent } from '../pages/configuration/adult-info-modal/adult-info-modal.component';

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
  imports: [IonContent, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page implements OnInit {
  userProfileImage: string | null = null;
  adultosMonitoreados: AdultoMayor[] = [];
  dispositivosReales: ConnectedDevice[] = [];
  dispositivosBackend: AdultoMayor[] = [];

  constructor(
    private auth: AuthService,
    private popoverController: PopoverController,
    private bleService: BleService,
    private router: Router,
    private deviceApiService: DeviceApiService,
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Cargar imagen del perfil del usuario
    this.loadUserProfileImage();
    
    // Cargar dispositivos guardados del backend
    this.cargarDispositivosGuardados();
    
    // Suscribirse a los dispositivos conectados en tiempo real (BLE)
    this.bleService.connectedDevices$.subscribe(devices => {
      this.dispositivosReales = devices;
      this.combinarDispositivos();
    });
  }

  cargarDispositivosGuardados() {
    this.deviceApiService.obtenerMisDispositivos().subscribe({
      next: (dispositivos) => {
        console.log('Dispositivos guardados cargados:', dispositivos);
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
        
        // Combinar con dispositivos BLE conectados
        this.combinarDispositivos();
      },
      error: (error) => {
        console.error('Error cargando dispositivos guardados:', error);
      }
    });
  }

  combinarDispositivos() {
    // Primero, mapear dispositivos BLE conectados
    const dispositivosBLE = this.dispositivosReales.map((device, index) => ({
      id_adulto: 0, // Temporal, se actualizará si existe en backend
      nombre: device.adulto?.nombre || device.name || 'Dispositivo sin nombre',
      fecha_nacimiento: device.adulto?.fecha_nacimiento || '1950-01-01',
      direccion: device.adulto?.direccion || 'Ubicación desconocida',
      dispositivo: {
        id_dispositivo: 0,
        bateria: device.bateria || 100,
        mac_address: device.mac_address
      },
      edad: device.adulto?.edad || this.calcularEdad(device.adulto?.fecha_nacimiento || '1950-01-01'),
      conectado: true,
      ultimaActividad: device.ultimaActividad || 'Ahora',
      deviceId: device.id
    }));

    // Combinar: priorizar dispositivos BLE (conectados) y agregar los del backend no conectados
    const dispositivosCombinados: AdultoMayor[] = [];
    const macsConectadas = new Set(dispositivosBLE.map(d => d.dispositivo.mac_address));

    // Agregar dispositivos BLE conectados
    dispositivosBLE.forEach(dispBLE => {
      // Buscar si existe en backend para obtener datos completos
      const dispBackend = this.dispositivosBackend.find(
        db => db.dispositivo.mac_address === dispBLE.dispositivo.mac_address
      );
      
      if (dispBackend) {
        // Usar datos del backend pero marcar como conectado
        dispositivosCombinados.push({
          ...dispBackend,
          conectado: true,
          ultimaActividad: 'Ahora',
          deviceId: dispBLE.deviceId
        });
      } else {
        // Usar datos del BLE
        dispositivosCombinados.push(dispBLE);
      }
    });

    // Agregar dispositivos del backend que NO están conectados
    this.dispositivosBackend.forEach(dispBackend => {
      if (!macsConectadas.has(dispBackend.dispositivo.mac_address)) {
        dispositivosCombinados.push(dispBackend);
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
    if (confirmed && adulto.deviceId) {
      // Desconectar dispositivo BLE
      await this.bleService.disconnectDevice(adulto.deviceId);
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
