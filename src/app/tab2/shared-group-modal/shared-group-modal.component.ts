import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedGroupService, SharedGroup } from '../../services/shared-group.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-shared-group-modal',
  templateUrl: './shared-group-modal.component.html',
  styleUrls: ['./shared-group-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedGroupModalComponent implements OnInit {
  sharedGroup: SharedGroup | null = null;
  inviteCode: string | null = null;
  joinCode: string = '';
  joinError: string = '';
  isLoadingGroup = false;

  constructor(
    private modalController: ModalController,
    private sharedGroupService: SharedGroupService,
    private auth: AuthService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadExistingGroup();
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
        }
        this.isLoadingGroup = false;
      },
      () => {
        this.isLoadingGroup = false;
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
          this.isLoadingGroup = false;
        } else {
          this.sharedGroupService.createGroup(user.id_usuario).subscribe(
            (group: any) => {
              this.sharedGroup = group;
              this.inviteCode = group.code;
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
    if (!user || !this.joinCode.trim()) return;
    this.isLoadingGroup = true;
    this.sharedGroupService.joinGroup(user.id_usuario, this.joinCode.trim()).subscribe(
      async (group: any) => {
        this.sharedGroup = group;
        this.inviteCode = group.code;
        this.isLoadingGroup = false;
        this.joinCode = '';
        await this.showToast('¡Te has unido al grupo exitosamente!', 'success');
      },
      async (_err: any) => {
        this.joinError = 'Código inválido o ya eres miembro.';
        this.isLoadingGroup = false;
        await this.showToast('No se pudo unir al grupo', 'danger');
      }
    );
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

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 3000,
      position: 'top'
    });
    await toast.present();
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
