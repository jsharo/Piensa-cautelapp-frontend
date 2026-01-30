import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonContent, IonIcon, PopoverController, ModalController, ToastController, IonRefresher } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';
import { BleService, ConnectedDevice } from '../services/ble.service';
import { DeviceApiService } from '../services/device-api.service';
import { AdultInfoModalComponent } from '../pages/configuration/adult-info-modal/adult-info-modal.component';
import { SharedGroupDetailPage } from '../pages/shared-group-detail/shared-group-detail.page';
import { FormsModule } from '@angular/forms';
import { SharedGroupService, SharedGroupDevice } from '../services/shared-group.service';
import { environment } from '../../environments/environment';
import { addIcons } from 'ionicons';
import { 
  personCircle, wifi, bluetooth, person, people, 
  addCircle, checkmarkCircle, closeCircle, 
  batteryHalf, eye, createOutline, trash, 
  peopleOutline, close 
} from 'ionicons/icons';

interface Dispositivo {
  id_dispositivo: string;  // ID del dispositivo ESP32 (ej: "CA-001")
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
  imports: [IonContent, IonIcon, CommonModule, FormsModule, IonRefresher],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page implements OnInit, OnDestroy {
  userProfileImage: string | null = null;
  adultosMonitoreados: AdultoMayor[] = [];
  dispositivosBackend: AdultoMayor[] = [];
  dispositivosReales: ConnectedDevice[] = [];
  
  // Estado del dispositivo pendiente de configuración
  pendingDevice: {device: ConnectedDevice, ssid: string} | null = null;
  showPendingCard = false;

  // ⭐ NUEVO: Conexión SSE para eventos de dispositivos
  private sseConnection: EventSource | null = null;

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
    
    // ⭐ NUEVO: Conectar a SSE para recibir eventos de conexión/desconexión
    this.connectToSSE();
    
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
    // SOLO si viene de configuration.page Y el dispositivo NO existe en BD
    this.bleService.wifiConnected$.subscribe(async (device) => {
      if (device && this.pendingDevice) {
        // Verificar si viene de configuration.page (envío manual de credenciales)
        const isFromConfigPage = await firstValueFrom(this.bleService.isFirstWifiConfig$);
        console.log('🔍 ¿Viene de configuration.page?:', isFromConfigPage);
        
        if (!isFromConfigPage) {
          console.log('🚫 No viene de configuration.page (reconexión automática). Modal no se mostrará.');
          return;
        }
        
        // ⭐ CRÍTICO: Verificar si el dispositivo ya existe en BD
        console.log('🔍 Verificando si el dispositivo ya existe en BD...');
        const dispositivoExistente = await this.verificarDispositivoExiste('CautelApp-D1');
        
        if (dispositivoExistente) {
          console.log('✅ Dispositivo ya existe en BD. Modal NO se mostrará.');
          await this.showToast('Dispositivo ya vinculado. WiFi actualizado correctamente.', 'success');
          this.bleService.clearPendingDevice();
          this.bleService.clearWifiConnected();
          this.showPendingCard = false;
          // Recargar dispositivos guardados
          this.cargarDispositivosGuardados();
          return;
        }
        
        console.log('📶 Dispositivo NO existe en BD. Mostrando modal para vincular...');
        await this.showAdultInfoModal(device);
      }
    });
  }

  ngOnDestroy() {
    // ⭐ NUEVO: Cerrar conexión SSE al destruir el componente
    if (this.sseConnection) {
      this.sseConnection.close();
      console.log('[Tab2] Conexión SSE cerrada');
    }
  }

  /**
   * ⭐ NUEVO: Conecta al endpoint SSE para recibir eventos de conexión/desconexión
   */
  private connectToSSE() {
    const user = this.auth.getCurrentUser();
    const token = this.auth.getToken();
    
    if (!user || !token) {
      console.warn('[Tab2] No se puede conectar a SSE: usuario no autenticado');
      return;
    }
    
    // Conectar al endpoint SSE de conexión de dispositivos
    const sseUrl = `${environment.apiUrl}/device/events/connection?token=${token}`;
    console.log('[Tab2] Conectando a SSE de dispositivos:', sseUrl);
    
    this.sseConnection = new EventSource(sseUrl);
    
    this.sseConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Tab2] Evento SSE de dispositivo recibido:', data);
        
        this.handleDeviceConnectionEvent(data);
      } catch (error) {
        console.error('[Tab2] Error procesando evento SSE:', error);
      }
    };
    
    this.sseConnection.onerror = (error) => {
      console.error('[Tab2] Error en conexión SSE:', error);
      // Intentar reconectar después de 5 segundos
      setTimeout(() => {
        console.log('[Tab2] Intentando reconectar SSE...');
        this.connectToSSE();
      }, 5000);
    };
    
    this.sseConnection.onopen = () => {
      console.log('[Tab2] ✅ Conexión SSE de dispositivos establecida');
    };
  }

  /**
   * ⭐ NUEVO: Maneja los eventos de conexión/desconexión de dispositivos
   */
  private handleDeviceConnectionEvent(data: any) {
    const { deviceId, status } = data;
    
    if (status === 'connected') {
      console.log(`[Tab2] 🟢 Dispositivo ${deviceId} CONECTADO`);
      
      // Actualizar estado de todos los adultos con este dispositivo
      this.adultosMonitoreados = this.adultosMonitoreados.map(adulto => {
        if (adulto.dispositivo?.id_dispositivo === deviceId) {
          return {
            ...adulto,
            conectado: true,
            ultimaActividad: 'Conectado vía WiFi'
          };
        }
        return adulto;
      });
      
    } else if (status === 'disconnected') {
      console.log(`[Tab2] 🔴 Dispositivo ${deviceId} DESCONECTADO`);
      
      // Actualizar estado de todos los adultos con este dispositivo
      this.adultosMonitoreados = this.adultosMonitoreados.map(adulto => {
        if (adulto.dispositivo?.id_dispositivo === deviceId) {
          return {
            ...adulto,
            conectado: false,
            ultimaActividad: 'Desconectado'
          };
        }
        return adulto;
      });
    }
  }

  /**
   * Maneja el evento de pull-to-refresh
   * Recarga los dispositivos y completa el refresher
   */
  handleRefresh(event: any) {
    console.log('🔄 Pull-to-Refresh: Recargando dispositivos...');
    this.cargarDispositivosGuardados();
    
    // Completar el refresher después de 1 segundo
    setTimeout(() => {
      event.detail.complete();
      console.log('✅ Refresh completado');
    }, 1000);
  }

  cargarDispositivosGuardados() {
    const user = this.auth.getCurrentUser();
    if (!user) {
      console.error('❌ No hay usuario autenticado');
      return;
    }

    console.log(`📥 [CARGAR] Iniciando carga de dispositivos para usuario ${user.id_usuario}`);

    // Cargar mis dispositivos propios
    this.deviceApiService.obtenerMisDispositivos().subscribe({
      next: (dispositivos: any[]) => {
        console.log(`✅ [CARGAR] RESPUESTA obtenerMisDispositivos:`, dispositivos);
        console.log(`   Total recibidos: ${dispositivos.length}`);
        
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

        console.log(`   Mapeados: ${misDispositivos.length}`, misDispositivos.map((d: any) => ({ id: d.id_adulto, nombre: d.nombre })));

        // Cargar dispositivos compartidos conmigo
        this.sharedGroupService.getMySharedDevices(user.id_usuario).subscribe({
          next: (sharedDevices: SharedGroupDevice[]) => {
            console.log(`✅ [CARGAR] DISPOSITIVOS COMPARTIDOS:`, sharedDevices);
            console.log(`   Total compartidos: ${sharedDevices.length}`);
            
            // IDs de mis dispositivos propios para evitar duplicados
            const misDispositivosIds = new Set(misDispositivos.map((d: AdultoMayor) => d.id_adulto));
            console.log(`   IDs propios: ${Array.from(misDispositivosIds).join(', ')}`);
            
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
            
            console.log(`   Compartidos filtrados: ${dispositivosCompartidos.length}`, dispositivosCompartidos.map((d: any) => ({ id: d.id_adulto, nombre: d.nombre })));
            
            // Combinar mis dispositivos + compartidos
            this.dispositivosBackend = [...misDispositivos, ...dispositivosCompartidos];
            console.log(`📦 [CARGAR] Total en backend: ${this.dispositivosBackend.length}`);
            this.dispositivosBackend.forEach((d: any) => {
              console.log(`   - ${d.nombre} (id: ${d.id_adulto}, dispositivo: ${d.dispositivo?.id_dispositivo || 'sin dispositivo'})`);
            });
            
            // Actualizar estado WiFi desde el backend
            this.actualizarEstadoWiFi();
            
            this.combinarDispositivos();
            this.adultosMonitoreados = this.dispositivosBackend.filter((d: any) => d.dispositivo);
            console.log(`✅ [CARGAR] Carga completada. Monitoreados: ${this.adultosMonitoreados.length}`);
          },
          error: (error: any) => {
            console.error('❌ [CARGAR] Error cargando dispositivos compartidos:', error);
            // Si falla la carga de compartidos, al menos mostrar los propios
            this.dispositivosBackend = misDispositivos;
            this.actualizarEstadoWiFi();
            this.combinarDispositivos();
            this.adultosMonitoreados = this.dispositivosBackend.filter((d: any) => d.dispositivo);
          }
        });
      },
      error: (error: any) => {
        console.error('❌ [CARGAR] Error cargando dispositivos guardados:', error);
      }
    });
  }

  combinarDispositivos() {
    if (!this.dispositivosBackend) return;
    
    console.log(`🔄 [COMBINAR] Iniciando combinación de dispositivos`);
    console.log(`   - Backend: ${this.dispositivosBackend.length} dispositivos`);
    console.log(`   - BLE: ${this.dispositivosReales?.length || 0} dispositivos reales`);
    
    const dispositivosBLE = this.dispositivosReales || [];
    const dispositivosCombinados: AdultoMayor[] = [];
    const anadidos = new Set<number>(); // Usar id_adulto para evitar duplicados
    
    // Filtrar dispositivos BLE válidos
    const bleValidos = dispositivosBLE.filter((d: any) => d && d.dispositivo && d.dispositivo.id_dispositivo);
    const idsConectadas = new Set(bleValidos.map((d: any) => d.dispositivo.id_dispositivo));
    
    console.log(`   - IDs conectadas: ${Array.from(idsConectadas).join(', ')}`);
    
    // Agregar dispositivos BLE que están conectados
    bleValidos.forEach((dispBLE: any) => {
      const dispBackend = this.dispositivosBackend.find(
        (db: any) => db && db.dispositivo && db.dispositivo.id_dispositivo === dispBLE.dispositivo.id_dispositivo
      );
      if (dispBackend) {
        console.log(`   ✓ BLE Match: ${dispBackend.nombre} (${dispBackend.id_adulto})`);
        dispositivosCombinados.push({
          ...dispBackend,
          conectado: true,
          ultimaActividad: 'Ahora',
          deviceId: dispBLE.deviceId
        });
        anadidos.add(dispBackend.id_adulto);
      } else {
        console.log(`   ⚠️ BLE Sin match en backend: ${dispBLE.dispositivo?.id_dispositivo}`);
        dispositivosCombinados.push(dispBLE);
      }
    });
    
    // Agregar dispositivos del backend que NO estén conectados
    this.dispositivosBackend.forEach((dispBackend: any) => {
      if (dispBackend && dispBackend.dispositivo && dispBackend.dispositivo.id_dispositivo) {
        if (!idsConectadas.has(dispBackend.dispositivo.id_dispositivo) && !anadidos.has(dispBackend.id_adulto)) {
          console.log(`   - Backend desconectado: ${dispBackend.nombre} (${dispBackend.id_adulto})`);
          dispositivosCombinados.push(dispBackend);
          anadidos.add(dispBackend.id_adulto);
        }
      }
    });
    
    console.log(`✅ [COMBINAR] Total dispositivos finales: ${dispositivosCombinados.length}`);
    dispositivosCombinados.forEach((d: any) => {
      console.log(`   - ${d.nombre} (id: ${d.id_adulto}, dispositivo: ${d.dispositivo?.id_dispositivo})`);
    });
    
    this.adultosMonitoreados = dispositivosCombinados;
  }

  // Actualizar el estado de conexión WiFi de los dispositivos desde el backend
  actualizarEstadoWiFi() {
    this.deviceApiService.getDevicesStatus().subscribe({
      next: (response: any) => {
        if (response.status === 'ok' && response.devices) {
          console.log('📶 Estado WiFi de dispositivos:', response.devices);
          
          // Actualizar el estado de cada dispositivo en dispositivosBackend
          this.dispositivosBackend = this.dispositivosBackend.map((disp: AdultoMayor) => {
            if (disp.dispositivo && disp.dispositivo.id_dispositivo) {
              // Buscar el estado WiFi correspondiente
              const wifiStatus = response.devices.find(
                (d: any) => d.id_dispositivo === disp.dispositivo.id_dispositivo
              );
              
              if (wifiStatus && wifiStatus.isOnline) {
                console.log(`✅ Dispositivo ${disp.dispositivo.id_dispositivo} está ONLINE`);
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
          
          // ⭐ CRÍTICO: Volver a combinar dispositivos después de actualizar estado WiFi
          console.log('🔄 Recombinando dispositivos con estado WiFi actualizado...');
          this.combinarDispositivos();
        }
      },
      error: (error: any) => {
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
      `Dispositivo: ${adulto.dispositivo?.id_dispositivo || 'No asignado'}\n` +
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
    
    console.log(`🗑️ Iniciando eliminación de dispositivo:`, {
      id_adulto: adulto.id_adulto,
      nombre: adulto.nombre,
      id_dispositivo: adulto.dispositivo?.id_dispositivo
    });

    // Desconectar BLE si está conectado
    if (adulto.deviceId) {
      console.log(`🔌 Desconectando BLE: ${adulto.deviceId}`);
      await this.bleService.disconnectDevice(adulto.deviceId);
    }

    // PASO CRÍTICO: Eliminar de la lista local INMEDIATAMENTE
    // Esto hace que la UI se actualice al instante
    const indexToRemove = this.adultosMonitoreados.findIndex(a => a.id_adulto === adulto.id_adulto);
    if (indexToRemove !== -1) {
      console.log(`🗑️ Eliminando de lista local en posición ${indexToRemove}`);
      this.adultosMonitoreados = this.adultosMonitoreados.filter(a => a.id_adulto !== adulto.id_adulto);
      
      // También eliminar del backend local
      const indexBackend = this.dispositivosBackend.findIndex(a => a.id_adulto === adulto.id_adulto);
      if (indexBackend !== -1) {
        this.dispositivosBackend.splice(indexBackend, 1);
      }
    }

    // Eliminar del backend (servidor)
    if (adulto.id_adulto) {
      console.log(`📡 Llamando stopMonitoringDevice con id_adulto: ${adulto.id_adulto}`);
      this.deviceApiService.stopMonitoringDevice(adulto.id_adulto).subscribe({
        next: async (response: any) => {
          console.log(`✅ Respuesta del servidor:`, response);
          await this.showToast('Dispositivo eliminado correctamente', 'success');
          
          // Agregar pequeño delay para asegurar que la BD está actualizada
          setTimeout(() => {
            console.log(`🔄 Recargando dispositivos guardados después de eliminación...`);
            this.cargarDispositivosGuardados();
          }, 500);
        },
        error: async (error: any) => {
          let errorMsg = 'Error al eliminar el dispositivo';
          console.error(`❌ Error en eliminación:`, error);
          
          // IMPORTANTE: Si falla en el servidor, restaurar la lista local
          console.warn(`⚠️ Restaurando dispositivo en lista local debido a error`);
          this.cargarDispositivosGuardados(); // Recargar desde BD
          
          if (error && error.error) {
            if (typeof error.error === 'string') {
              errorMsg += ': ' + error.error;
            } else if (error.error.message) {
              errorMsg += ': ' + error.error.message;
            } else {
              errorMsg += ': ' + JSON.stringify(error.error);
            }
          }
          
          console.error('Detalles del error:', error);
          await this.showToast(errorMsg, 'danger');
        }
      });
    } else {
      console.error('⚠️ No se encontró id_adulto para eliminar');
      await this.showToast('Error: No se puede identificar el dispositivo', 'danger');
      // Restaurar lista si falla
      this.cargarDispositivosGuardados();
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

  /**
   * Verifica si un dispositivo ya existe en la BD para el usuario actual
   * Consulta directamente al backend para evitar problemas de caché
   * Retorna true si existe y está vinculado, false si no
   */
  private async verificarDispositivoExiste(macAddress: string): Promise<boolean> {
    try {
      console.log('🔍 [verificarDispositivoExiste] Consultando al backend...');
      const respuesta = await firstValueFrom(this.deviceApiService.checkDeviceExists(macAddress));
      
      console.log('🔍 [verificarDispositivoExiste] Respuesta del backend:', respuesta);
      
      if (respuesta.error) {
        console.error('❌ [verificarDispositivoExiste] Error del backend:', respuesta.error);
        return false;
      }
      
      // Verificar si existe Y está vinculado al usuario
      const existeYVinculado = respuesta.exists && respuesta.vinculado;
      
      console.log(`🔍 [verificarDispositivoExiste] Resultado:`, {
        existe: respuesta.exists,
        vinculado: respuesta.vinculado,
        resultado: existeYVinculado ? 'EXISTE Y VINCULADO' : 'NO EXISTE O NO VINCULADO'
      });
      
      return existeYVinculado;
    } catch (error) {
      console.error('❌ [verificarDispositivoExiste] Error en la petición:', error);
      // En caso de error, asumir que NO existe para mostrar el modal
      return false;
    }
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
      console.log('✅ [MODAL] Datos del adulto recibidos:', data);
      console.log('✅ [MODAL] Dispositivo BLE:', {
        id: device.id_dispositivo,
        nombre: device.name
      });
      
      // 🔴 CRÍTICO: Guardar en BD ANTES de agregar a la lista local
      // Esto asegura que el dispositivo está guardado en la base de datos
      const vincularDto = {
        id_dispositivo: 'CA-1', // ✅ ID del ESP32 desde el firmware
        nombre_adulto: data.nombre,
        fecha_nacimiento: data.fecha_nacimiento || '1950-01-01',
        direccion: data.direccion || 'No especificada',
        ble_device_id: device.id // 📝 Guardar la MAC BLE real para referencia
      };
      
      console.log('📡 [MODAL] Llamando vincularDispositivo con:', vincularDto);
      
      this.deviceApiService.vincularDispositivo(vincularDto).subscribe({
        next: async (response: any) => {
          console.log('✅ [MODAL] Respuesta del servidor vincularDispositivo:', response);
          
          // Crear el dispositivo agregado al servicio BLE con los datos de la respuesta
          const deviceToAdd: ConnectedDevice = {
            ...device,
            adulto: {
              id_adulto: response?.adultoMayor?.id_adulto || 0,
              nombre: data.nombre,
              fecha_nacimiento: data.fecha_nacimiento || '1950-01-01',
              direccion: data.direccion || 'No especificada'
            }
          };
          
          console.log('📱 [MODAL] Registrando dispositivo en BLE con datos del adulto:', deviceToAdd);
          this.bleService.addConnectedDevice(deviceToAdd);
          
          // Limpiar dispositivo pendiente
          this.bleService.clearPendingDevice();
          this.bleService.clearWifiConnected();
          this.showPendingCard = false;
          
          await this.showToast('¡Dispositivo configurado exitosamente en la BD!', 'success');
          
          // Recargar dispositivos después de un pequeño delay para asegurar que BD está actualizada
          setTimeout(() => {
            console.log('🔄 [MODAL] Recargando dispositivos guardados...');
            this.cargarDispositivosGuardados();
          }, 500);
        },
        error: async (error: any) => {
          console.error('❌ [MODAL] Error guardando dispositivo en BD:', error);
          let errorMsg = 'Error al guardar el dispositivo en la base de datos';
          
          if (error && error.error) {
            if (typeof error.error === 'string') {
              errorMsg += ': ' + error.error;
            } else if (error.error.message) {
              errorMsg += ': ' + error.error.message;
            }
          }
          
          await this.showToast(errorMsg, 'danger');
          
          // Limpiar dispositivo pendiente incluso si hay error
          this.bleService.clearPendingDevice();
          this.bleService.clearWifiConnected();
          this.showPendingCard = false;
        }
      });
    } else {
      await this.showToast('Configuración cancelada', 'warning');
      
      // Limpiar dispositivo pendiente
      this.bleService.clearPendingDevice();
      this.bleService.clearWifiConnected();
      this.showPendingCard = false;
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
