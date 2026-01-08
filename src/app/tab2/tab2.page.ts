import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, IonIcon, PopoverController, ModalController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';
import { BleService, ConnectedDevice } from '../services/ble.service';
import { DeviceApiService } from '../services/device-api.service';
import { AdultInfoModalComponent } from '../pages/configuration/adult-info-modal/adult-info-modal.component';
import { SharedGroupDetailPage } from '../pages/shared-group-detail/shared-group-detail.page';
import { FormsModule } from '@angular/forms';
import { SharedGroupService, SharedGroupDevice } from '../services/shared-group.service';
import { addIcons } from 'ionicons';
import { 
  personCircle, wifi, bluetooth, person, people, 
  addCircle, checkmarkCircle, closeCircle, 
  batteryHalf, eye, createOutline, trash, 
  peopleOutline, close 
} from 'ionicons/icons';

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
  isShared?: boolean; // Indica si es un dispositivo compartido
  sharedBy?: number; // ID del usuario que compartió el dispositivo
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: true,
  imports: [IonContent, IonIcon, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page implements OnInit {
  userProfileImage: string | null = null;
  adultosMonitoreados: AdultoMayor[] = [];
  dispositivosBackend: AdultoMayor[] = [];
  dispositivosReales: ConnectedDevice[] = [];
  
  // Estado del dispositivo pendiente de configuración
  pendingDevice: {device: ConnectedDevice, ssid: string} | null = null;
  showPendingCard = false;

  constructor(
    private auth: AuthService,
    private popoverController: PopoverController,
    private bleService: BleService,
    private deviceApiService: DeviceApiService,
    private modalController: ModalController,
    private toastController: ToastController,
    private sharedGroupService: SharedGroupService
  ) {
    // Registrar iconos de Ionic
    addIcons({
      'person-circle': personCircle,
      'wifi': wifi,
      'bluetooth': bluetooth,
      'person': person,
      'people': people,
      'add-circle': addCircle,
      'checkmark-circle': checkmarkCircle,
      'close-circle': closeCircle,
      'battery-half': batteryHalf,
      'eye': eye,
      'create-outline': createOutline,
      'trash': trash,
      'people-outline': peopleOutline,
      'close': close
    });
  }

  async openSharedGroupDetail() {
    const modal = await this.modalController.create({
      component: SharedGroupDetailPage,
      cssClass: 'fullscreen-modal'
    });
    return await modal.present();
  }

  ionViewWillEnter() {
    // Recargar datos cada vez que se entra a la vista
    console.log('🔄 Entrando a Tab2, recargando dispositivos...');
    this.cargarDispositivosGuardados();
    
    // Verificar si hay un dispositivo pendiente de configuración
    this.pendingDevice = this.bleService.getPendingDevice();
    if (this.pendingDevice) {
      console.log('📱 Dispositivo pendiente detectado:', this.pendingDevice.device.name);
      this.showPendingCard = true;
    }
  }

  ngOnInit(): void {
    this.loadUserProfileImage();
    this.cargarDispositivosGuardados();
    this.bleService.connectedDevices$.subscribe((devices: ConnectedDevice[]) => {
      this.dispositivosReales = devices;
      this.combinarDispositivos();
    });
    
    // Suscribirse a eventos de dispositivos vinculados para recargar datos
    this.bleService.deviceLinked$.subscribe((linked) => {
      if (linked) {
        console.log('🔄 Dispositivo vinculado, recargando datos del backend...');
        this.cargarDispositivosGuardados();
      }
    });
    
    // Suscribirse a cambios en el dispositivo pendiente
    this.bleService.pendingDevice$.subscribe((pending) => {
      this.pendingDevice = pending;
      this.showPendingCard = !!pending;
      console.log('📱 Dispositivo pendiente actualizado:', pending?.device?.name || 'ninguno');
    });
    
    // Suscribirse a eventos de WiFi conectado para mostrar modal de datos del adulto
    this.bleService.wifiConnected$.subscribe(async (device) => {
      if (device && this.pendingDevice) {
        console.log('📶 WiFi conectado! Mostrando modal de datos del adulto...');
        await this.showAdultInfoModal(device);
      }
    });
  }

  cargarDispositivosGuardados() {
    const user = this.auth.getCurrentUser();
    if (!user) {
      console.error('No hay usuario autenticado');
      return;
    }

    // Cargar mis dispositivos propios
    this.deviceApiService.obtenerMisDispositivos().subscribe({
      next: (dispositivos: any[]) => {
        console.log('RESPUESTA BACKEND obtenerMisDispositivos:', dispositivos);
        const misDispositivos = dispositivos.map((disp: any) => ({
          id_adulto: disp.id_adulto,
          nombre: disp.nombre,
          fecha_nacimiento: disp.fecha_nacimiento,
          direccion: disp.direccion,
          dispositivo: disp.dispositivo,
          edad: this.calcularEdad(disp.fecha_nacimiento),
          conectado: false,
          ultimaActividad: 'Sin conexión reciente',
          isShared: false
        }));

        // Cargar dispositivos compartidos conmigo
        this.sharedGroupService.getMySharedDevices(user.id_usuario).subscribe({
          next: (sharedDevices: SharedGroupDevice[]) => {
            console.log('DISPOSITIVOS COMPARTIDOS:', sharedDevices);
            
            // IDs de mis dispositivos propios para evitar duplicados
            const misDispositivosIds = new Set(misDispositivos.map((d: AdultoMayor) => d.id_adulto));
            
            // Agregar solo los dispositivos compartidos que NO son míos
            const dispositivosCompartidos = sharedDevices
              .filter((sd: SharedGroupDevice) => !misDispositivosIds.has(sd.adulto_id))
              .map((sd: SharedGroupDevice) => ({
                id_adulto: sd.adulto.id_adulto,
                nombre: sd.adulto.nombre,
                fecha_nacimiento: sd.adulto.fecha_nacimiento,
                direccion: sd.adulto.direccion,
                dispositivo: sd.adulto.dispositivo,
                edad: this.calcularEdad(sd.adulto.fecha_nacimiento),
                conectado: false,
                ultimaActividad: 'Sin conexión reciente',
                isShared: true,
                sharedBy: sd.shared_by
              }));
            
            // Combinar mis dispositivos + compartidos
            this.dispositivosBackend = [...misDispositivos, ...dispositivosCompartidos];
            
            // Actualizar estado WiFi desde el backend
            this.actualizarEstadoWiFi();
            
            this.combinarDispositivos();
            this.adultosMonitoreados = this.dispositivosBackend.filter((d: any) => d.dispositivo);
          },
          error: (error: any) => {
            console.error('Error cargando dispositivos compartidos:', error);
            // Si falla la carga de compartidos, al menos mostrar los propios
            this.dispositivosBackend = misDispositivos;
            this.actualizarEstadoWiFi();
            this.combinarDispositivos();
            this.adultosMonitoreados = this.dispositivosBackend.filter((d: any) => d.dispositivo);
          }
        });
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

  // Actualizar el estado de conexión WiFi de los dispositivos desde el backend
  actualizarEstadoWiFi() {
    this.deviceApiService.getDevicesStatus().subscribe({
      next: (response) => {
        if (response.status === 'ok' && response.devices) {
          console.log('📶 Estado WiFi de dispositivos:', response.devices);
          
          // Actualizar el estado de cada dispositivo en dispositivosBackend
          this.dispositivosBackend = this.dispositivosBackend.map((disp: AdultoMayor) => {
            if (disp.dispositivo && disp.dispositivo.mac_address) {
              // Buscar el estado WiFi correspondiente
              const wifiStatus = response.devices.find(
                (d) => d.macAddress === disp.dispositivo.mac_address
              );
              
              if (wifiStatus && wifiStatus.isOnline) {
                return {
                  ...disp,
                  conectado: true,
                  ultimaActividad: 'Conectado vía WiFi',
                  wifiConnected: true
                };
              }
            }
            return disp;
          });
        }
      },
      error: (error) => {
        console.error('❌ Error obteniendo estado WiFi:', error);
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
    // Navegar a configuración sin especificar método
    window.location.href = '/configuration';
  }

  viewDevice(adulto: AdultoMayor) {
    const connectionType = (adulto as any).wifiConnected ? 'WiFi' : 
                          adulto.conectado ? 'Bluetooth' : 'Ninguna';
    const infoTexto = `Información de ${adulto.nombre}\n\n` +
      `Edad: ${adulto.edad} años\n` +
      `Dirección: ${adulto.direccion}\n` +
      `Dispositivo: ${adulto.dispositivo?.mac_address || 'No asignado'}\n` +
      `Batería: ${adulto.dispositivo?.bateria || 0}%\n` +
      `Estado: ${adulto.conectado ? 'En línea' : 'Desconectado'}\n` +
      `Conexión: ${connectionType}\n` +
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

  // Mostrar modal para configurar datos del adulto mayor después de conectar WiFi
  async showAdultInfoModal(device: ConnectedDevice) {
    const modal = await this.modalController.create({
      component: AdultInfoModalComponent,
      cssClass: 'adult-info-modal'
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    if (data) {
      // Agregar dispositivo con datos del adulto al servicio BLE
      const deviceToAdd: ConnectedDevice = {
        ...device,
        adulto: {
          id_adulto: 0,
          nombre: data.nombre,
          fecha_nacimiento: data.fecha_nacimiento || '1950-01-01',
          direccion: data.direccion || 'No especificada'
        }
      };
      
      console.log('📱 Registrando dispositivo con datos del adulto:', deviceToAdd);
      this.bleService.addConnectedDevice(deviceToAdd);
      
      // Limpiar dispositivo pendiente
      this.bleService.clearPendingDevice();
      this.bleService.clearWifiConnected();
      this.showPendingCard = false;
      
      await this.showToast('¡Dispositivo configurado exitosamente!', 'success');
      
      // Recargar dispositivos
      this.cargarDispositivosGuardados();
    } else {
      await this.showToast('Configuración cancelada', 'warning');
    }
  }

  // Cancelar configuración pendiente
  cancelPendingDevice() {
    this.bleService.clearPendingDevice();
    this.bleService.clearWifiConnected();
    this.showPendingCard = false;
    this.pendingDevice = null;
  }
}
