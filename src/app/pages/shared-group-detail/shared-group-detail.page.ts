import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { SharedGroupService, SharedGroup, SharedGroupDevice, SharedGroupMember } from '../../services/shared-group.service';
import { AuthService } from '../../services/auth.service';
import { DeviceApiService, DispositivoVinculado } from '../../services/device-api.service';

@Component({
  selector: 'app-shared-group-detail',
  templateUrl: './shared-group-detail.page.html',
  styleUrls: ['./shared-group-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedGroupDetailPage implements OnInit {
  sharedGroup: SharedGroup | null = null;
  inviteCode: string | null = null;
  joinCode: string = '';
  joinError: string = '';
  isLoadingGroup = false;
  
  // Dispositivos del usuario
  myDevices: DispositivoVinculado[] = [];
  isLoadingDevices = false;
  
  // Dispositivos compartidos en el grupo
  sharedDevices: SharedGroupDevice[] = [];
  
  // Selección múltiple
  selectedDevices: Set<number> = new Set();
  selectionMode = false;

  constructor(
    private modalController: ModalController,
    private sharedGroupService: SharedGroupService,
    private auth: AuthService,
    private toastController: ToastController,
    private deviceApiService: DeviceApiService
  ) {}

  ngOnInit() {
    this.loadExistingGroup();
    this.loadMyDevices();
  }

  async loadExistingGroup(): Promise<void> {
    const user = this.auth.getCurrentUser();
    if (!user) return;
    
    this.isLoadingGroup = true;
    this.sharedGroupService.getMyGroups(user.id_usuario).subscribe(
      (groups: any[]) => {
        if (groups.length > 0) {
          this.sharedGroup = groups[0];
          this.inviteCode = groups[0].code;
          this.sharedDevices = groups[0].sharedDevices || [];
        }
        this.isLoadingGroup = false;
      },
      () => {
        this.isLoadingGroup = false;
      }
    );
  }

  async loadMyDevices(): Promise<void> {
    this.isLoadingDevices = true;
    this.deviceApiService.obtenerMisDispositivos().subscribe(
      (devices: DispositivoVinculado[]) => {
        this.myDevices = devices;
        this.isLoadingDevices = false;
      },
      (error) => {
        console.error('Error cargando dispositivos:', error);
        this.isLoadingDevices = false;
      }
    );
  }

  async createOrGetGroup(): Promise<void> {
    this.isLoadingGroup = true;
    this.inviteCode = null;
    this.sharedGroup = null;
    this.joinError = '';
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.isLoadingGroup = false;
      return;
    }
    this.sharedGroupService.getMyGroups(user.id_usuario).subscribe(
      (groups: any[]) => {
        if (groups.length > 0) {
          this.sharedGroup = groups[0];
          this.inviteCode = groups[0].code;
          this.sharedDevices = groups[0].sharedDevices || [];
          this.isLoadingGroup = false;
        } else {
          this.sharedGroupService.createGroup(user.id_usuario).subscribe(
            (group: any) => {
              this.sharedGroup = group;
              this.inviteCode = group.code;
              this.sharedDevices = group.sharedDevices || [];
              this.isLoadingGroup = false;
              this.showToast('Grupo creado exitosamente', 'success');
            },
            () => {
              this.isLoadingGroup = false;
              this.showToast('Error al crear el grupo', 'danger');
            }
          );
        }
      },
      () => {
        this.isLoadingGroup = false;
      }
    );
  }

  async joinGroupByCode(): Promise<void> {
    this.joinError = '';
    const user = this.auth.getCurrentUser();
    
    if (!user) {
      this.joinError = 'Debes iniciar sesión para unirte a un grupo';
      await this.showToast('Debes iniciar sesión', 'danger');
      return;
    }
    
    const code = this.joinCode.trim().toLowerCase();
    
    if (!code) {
      this.joinError = 'Debes ingresar un código de invitación';
      await this.showToast('Ingresa un código válido', 'warning');
      return;
    }
    
    // Validar que el código tenga el formato correcto (8 caracteres hexadecimales)
    if (code.length !== 8 || !/^[0-9a-fA-F]+$/.test(code)) {
      this.joinError = 'El código debe tener 8 caracteres hexadecimales';
      await this.showToast('Formato de código inválido', 'warning');
      return;
    }
    
    this.isLoadingGroup = true;
    this.sharedGroupService.joinGroup(user.id_usuario, code).subscribe(
      async (group: any) => {
        console.log('Grupo obtenido exitosamente:', group);
        this.sharedGroup = group;
        this.inviteCode = group.code;
        this.sharedDevices = group.sharedDevices || [];
        this.isLoadingGroup = false;
        this.joinCode = '';
        this.joinError = '';
        await this.showToast('¡Te has unido al grupo exitosamente!', 'success');
        
        // Recargar mis dispositivos para actualizar la UI
        this.loadMyDevices();
      },
      async (err: any) => {
        console.error('Error al unirse al grupo:', err);
        this.isLoadingGroup = false;
        
        // Mensaje de error más específico
        if (err.error?.message) {
          this.joinError = err.error.message;
        } else if (err.status === 404) {
          this.joinError = 'Código de invitación no encontrado';
        } else if (err.status === 400) {
          this.joinError = 'Código inválido o ya eres miembro';
        } else {
          this.joinError = 'No se pudo unir al grupo. Verifica el código e intenta nuevamente';
        }
        
        await this.showToast(this.joinError, 'danger');
      }
    );
  }

  formatJoinCode(event: any): void {
    let value = event.target.value || '';
    // Convertir a minúsculas y eliminar caracteres no hexadecimales
    value = value.toLowerCase().replace(/[^0-9a-f]/g, '');
    this.joinCode = value;
  }

  async copyInviteCode(): Promise<void> {
    if (!this.inviteCode) return;
    try {
      await navigator.clipboard.writeText(this.inviteCode);
      await this.showToast('Código copiado al portapapeles', 'success');
    } catch (err) {
      // Fallback para navegadores que no soporten clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = this.inviteCode;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        await this.showToast('Código copiado al portapapeles', 'success');
      } catch (e) {
        await this.showToast('No se pudo copiar el código', 'danger');
      }
      document.body.removeChild(textArea);
    }
  }

  async leaveGroup(): Promise<void> {
    if (!this.sharedGroup) return;
    
    const confirmed = confirm('¿Estás seguro de que deseas salir del grupo? Dejarás de recibir notificaciones compartidas.');
    if (!confirmed) return;
    
    const user = this.auth.getCurrentUser();
    if (!user) return;
    
    this.isLoadingGroup = true;
    this.sharedGroupService.leaveGroup(user.id_usuario, this.sharedGroup.id).subscribe(
      async () => {
        this.sharedGroup = null;
        this.inviteCode = null;
        this.sharedDevices = [];
        this.isLoadingGroup = false;
        await this.showToast('Has salido del grupo exitosamente', 'success');
      },
      async (error: any) => {
        this.isLoadingGroup = false;
        console.error('Error al salir del grupo:', error);
        await this.showToast('Error al salir del grupo', 'danger');
      }
    );
  }

  // ========== MÉTODOS PARA COMPARTIR DISPOSITIVOS ==========

  isDeviceShared(adultoId: number): boolean {
    return this.sharedDevices.some(sd => sd.adulto_id === adultoId);
  }

  async shareDevice(device: DispositivoVinculado): Promise<void> {
    const user = this.auth.getCurrentUser();
    if (!user || !this.sharedGroup) return;

    if (this.isDeviceShared(device.id_adulto)) {
      await this.showToast('Este dispositivo ya está compartido', 'warning');
      return;
    }

    this.isLoadingDevices = true;
    this.sharedGroupService.shareDevice(this.sharedGroup.id, device.id_adulto, user.id_usuario).subscribe(
      async (sharedDevice: SharedGroupDevice) => {
        this.sharedDevices.push(sharedDevice);
        this.isLoadingDevices = false;
        await this.showToast(`${device.nombre} compartido exitosamente`, 'success');
      },
      async (error: any) => {
        this.isLoadingDevices = false;
        console.error('Error al compartir dispositivo:', error);
        await this.showToast('Error al compartir dispositivo', 'danger');
      }
    );
  }

  async unshareDevice(adultoId: number, deviceName: string): Promise<void> {
    const user = this.auth.getCurrentUser();
    if (!user || !this.sharedGroup) return;

    const confirmed = confirm(`¿Deseas dejar de compartir "${deviceName}"?`);
    if (!confirmed) return;

    this.isLoadingDevices = true;
    this.sharedGroupService.unshareDevice(this.sharedGroup.id, adultoId, user.id_usuario).subscribe(
      async () => {
        this.sharedDevices = this.sharedDevices.filter(sd => sd.adulto_id !== adultoId);
        this.isLoadingDevices = false;
        await this.showToast('Dispositivo descompartido exitosamente', 'success');
      },
      async (error: any) => {
        this.isLoadingDevices = false;
        console.error('Error al descompartir dispositivo:', error);
        await this.showToast('Error al descompartir dispositivo', 'danger');
      }
    );
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

  // ========== MÉTODOS DE SELECCIÓN MÚLTIPLE ==========

  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.selectedDevices.clear();
    }
  }

  toggleDeviceSelection(adultoId: number) {
    if (this.selectedDevices.has(adultoId)) {
      this.selectedDevices.delete(adultoId);
    } else {
      this.selectedDevices.add(adultoId);
    }
  }

  isDeviceSelected(adultoId: number): boolean {
    return this.selectedDevices.has(adultoId);
  }

  selectAll() {
    this.myDevices.forEach(device => {
      this.selectedDevices.add(device.id_adulto);
    });
  }

  deselectAll() {
    this.selectedDevices.clear();
  }

  async shareSelectedDevices() {
    const user = this.auth.getCurrentUser();
    if (!user || !this.sharedGroup) return;

    const devicesToShare = this.myDevices.filter(d => 
      this.selectedDevices.has(d.id_adulto) && !this.isDeviceShared(d.id_adulto)
    );

    if (devicesToShare.length === 0) {
      await this.showToast('No hay dispositivos seleccionados para compartir', 'warning');
      return;
    }

    const confirmed = confirm(`¿Deseas compartir ${devicesToShare.length} dispositivo(s) con el grupo?`);
    if (!confirmed) return;

    this.isLoadingDevices = true;
    let sharedCount = 0;
    let errorCount = 0;

    for (const device of devicesToShare) {
      try {
        const result = await this.sharedGroupService.shareDevice(
          this.sharedGroup.id, 
          device.id_adulto, 
          user.id_usuario
        ).toPromise();
        if (result) {
          this.sharedDevices.push(result);
          sharedCount++;
        }
      } catch (error) {
        console.error(`Error compartiendo ${device.nombre}:`, error);
        errorCount++;
      }
    }

    this.isLoadingDevices = false;
    this.selectedDevices.clear();
    this.selectionMode = false;

    if (sharedCount > 0) {
      await this.showToast(`${sharedCount} dispositivo(s) compartido(s) exitosamente`, 'success');
    }
    if (errorCount > 0) {
      await this.showToast(`Error al compartir ${errorCount} dispositivo(s)`, 'danger');
    }
  }

  async unshareSelectedDevices() {
    const user = this.auth.getCurrentUser();
    if (!user || !this.sharedGroup) return;

    const devicesToUnshare = this.myDevices.filter(d => 
      this.selectedDevices.has(d.id_adulto) && this.isDeviceShared(d.id_adulto)
    );

    if (devicesToUnshare.length === 0) {
      await this.showToast('No hay dispositivos compartidos seleccionados', 'warning');
      return;
    }

    const confirmed = confirm(`¿Deseas dejar de compartir ${devicesToUnshare.length} dispositivo(s)?`);
    if (!confirmed) return;

    this.isLoadingDevices = true;
    let unsharedCount = 0;
    let errorCount = 0;

    for (const device of devicesToUnshare) {
      try {
        await this.sharedGroupService.unshareDevice(
          this.sharedGroup.id, 
          device.id_adulto, 
          user.id_usuario
        ).toPromise();
        this.sharedDevices = this.sharedDevices.filter(sd => sd.adulto_id !== device.id_adulto);
        unsharedCount++;
      } catch (error) {
        console.error(`Error descompartiendo ${device.nombre}:`, error);
        errorCount++;
      }
    }

    this.isLoadingDevices = false;
    this.selectedDevices.clear();
    this.selectionMode = false;

    if (unsharedCount > 0) {
      await this.showToast(`${unsharedCount} dispositivo(s) descompartido(s) exitosamente`, 'success');
    }
    if (errorCount > 0) {
      await this.showToast(`Error al descompartir ${errorCount} dispositivo(s)`, 'danger');
    }
  }

  get selectedCount(): number {
    return this.selectedDevices.size;
  }

  get selectedSharedCount(): number {
    return Array.from(this.selectedDevices).filter(id => this.isDeviceShared(id)).length;
  }

  get selectedUnsharedCount(): number {
    return Array.from(this.selectedDevices).filter(id => !this.isDeviceShared(id)).length;
  }

  // ========== GESTIÓN DE MIEMBROS ==========

  isGroupCreator(): boolean {
    const user = this.auth.getCurrentUser();
    return user && this.sharedGroup ? this.sharedGroup.created_by === user.id_usuario : false;
  }

  async removeMember(member: SharedGroupMember) {
    const user = this.auth.getCurrentUser();
    if (!user || !this.sharedGroup) return;

    if (!this.isGroupCreator()) {
      await this.showToast('Solo el creador puede expulsar miembros', 'warning');
      return;
    }

    if (member.user_id === this.sharedGroup.created_by) {
      await this.showToast('No puedes expulsar al creador del grupo', 'warning');
      return;
    }

    const confirmed = confirm(`¿Expulsar a ${member.user?.nombre || 'este miembro'} del grupo?`);
    if (!confirmed) return;

    this.isLoadingGroup = true;
    this.sharedGroupService.removeMember(user.id_usuario, this.sharedGroup.id, member.user_id).subscribe(
      async () => {
        if (this.sharedGroup) {
          this.sharedGroup.members = this.sharedGroup.members.filter(m => m.user_id !== member.user_id);
        }
        this.isLoadingGroup = false;
        await this.showToast('Miembro expulsado exitosamente', 'success');
      },
      async (error: any) => {
        this.isLoadingGroup = false;
        console.error('Error al expulsar miembro:', error);
        await this.showToast(error.error?.message || 'Error al expulsar miembro', 'danger');
      }
    );
  }

  getMemberRole(member: SharedGroupMember): string {
    if (member.user_id === this.sharedGroup?.created_by) {
      return 'Creador';
    }
    return 'Miembro';
  }

  getInvitedByName(member: SharedGroupMember): string {
    if (!member.invited_by) return 'Fundador';
    if (this.sharedGroup) {
      const inviter = this.sharedGroup.members.find(m => m.user_id === member.invited_by);
      return inviter?.user?.nombre || 'Usuario';
    }
    return 'Desconocido';
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

  goBack() {
    this.modalController.dismiss();
  }
}
