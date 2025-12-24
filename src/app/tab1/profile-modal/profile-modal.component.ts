import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonIcon, IonInput, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, personCircle, mailOutline, camera } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonIcon, IonInput],
  templateUrl: './profile-modal.component.html',
  styleUrls: ['./profile-modal.component.scss']
})
export class ProfileModalComponent implements OnInit {
  userName: string = '';
  userEmail: string = '';
  isEditing: boolean = false;
  profileImage: string | null = null;

  constructor(
    private authService: AuthService,
    private modalController: ModalController
  ) {
    addIcons({ close, personCircle, mailOutline, camera });
  }

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.nombre || 'Usuario';
      this.userEmail = user.email || '';
      // Cargar imagen del usuario si existe
      if ((user as any).imagen) {
        this.profileImage = (user as any).imagen;
      }
    }
  }

  toggleEditing() {
    this.isEditing = !this.isEditing;
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }

      // Validar tamaño (máximo 2MB sin comprimir)
      if (file.size > 2 * 1024 * 1024) {
        alert('La imagen debe ser menor a 2MB');
        return;
      }

      // Leer la imagen y comprimir
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Comprimir imagen usando canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Reducir tamaño manteniendo proporción
          let width = img.width;
          let height = img.height;
          const maxWidth = 400;
          const maxHeight = 400;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * maxHeight / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convertir a base64 con compresión (0.7 = 70% quality)
          this.profileImage = canvas.toDataURL('image/jpeg', 0.7);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile() {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      alert('Error: No hay usuario autenticado');
      return;
    }

    // Validar que el nombre no esté vacío
    if (!this.userName || this.userName.trim().length === 0) {
      alert('El nombre no puede estar vacío');
      return;
    }

    // Preparar datos para actualizar
    const updateData: { nombre?: string; imagen?: string } = {};
    
    // Siempre enviar el nombre
    updateData.nombre = this.userName.trim();
    
    // Enviar imagen si existe
    if (this.profileImage) {
      updateData.imagen = this.profileImage;
    }

    console.log('Enviando datos:', updateData);

    // Guardar en BD
    this.authService.updateProfile(currentUser.id_usuario, updateData).subscribe({
      next: (user) => {
        console.log('Perfil actualizado:', user);
        this.isEditing = false;
        alert('Perfil actualizado correctamente');
        this.loadUserData();
      },
      error: (error) => {
        console.error('Error al actualizar perfil:', error);
        console.error('Detalles del error:', error.error);
        alert('Error al actualizar el perfil: ' + (error.error?.message || error.message));
      }
    });
  }

  dismiss() {
    this.modalController.dismiss();
  }
}
