import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController, ModalController } from '@ionic/angular';
import { AuthService, User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage implements OnInit {
  user: User | null = null;
  loading = true;
  isEditingEmail = false;
  newEmail = '';
  emailError = '';

  constructor(
    private auth: AuthService,
    private navCtrl: NavController,
    private toast: ToastController,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    // Try from local storage first for fast display
    this.user = this.auth.getCurrentUser();
    this.auth.me().subscribe({
      next: (u) => {
        this.user = u;
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        const t = await this.toast.create({
          message: 'No se pudo cargar el perfil',
          color: 'danger',
          duration: 2500,
          position: 'top',
        });
        t.present();
      },
    });
  }

  logout() {
    this.auth.logout();
    this.navCtrl.navigateRoot('/login', { replaceUrl: true });
  }

  openEmailEdit() {
    this.newEmail = this.user?.email || '';
    this.emailError = '';
    this.isEditingEmail = true;
  }

  closeEmailEdit() {
    this.isEditingEmail = false;
    this.newEmail = '';
    this.emailError = '';
  }

  emailValid(value: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(value);
  }

  validateEmail() {
    if (!this.newEmail) {
      this.emailError = 'El correo es obligatorio';
      return false;
    }
    if (!this.emailValid(this.newEmail)) {
      this.emailError = 'Ingresa un correo electrónico válido';
      return false;
    }
    if (this.newEmail === this.user?.email) {
      this.emailError = 'El nuevo correo es igual al actual';
      return false;
    }
    this.emailError = '';
    return true;
  }

  async updateEmail() {
    if (!this.validateEmail() || !this.user) {
      return;
    }

    this.loading = true;

    this.http
      .patch(`${environment.apiUrl}/user/${this.user.id_usuario}`, {
        email: this.newEmail,
      })
      .subscribe({
        next: async (updatedUser: any) => {
          this.user = updatedUser;
          // Actualizar el usuario en localStorage
          this.auth.setCurrentUser(updatedUser);
          
          this.loading = false;
          this.closeEmailEdit();
          
          const toast = await this.toast.create({
            message: 'Correo electrónico actualizado exitosamente',
            color: 'success',
            duration: 3000,
            position: 'top',
          });
          toast.present();
        },
        error: async (err) => {
          this.loading = false;
          let errorMessage = 'No se pudo actualizar el correo electrónico';
          
          if (err.error?.message) {
            errorMessage = err.error.message;
          } else if (err.status === 409) {
            errorMessage = 'Este correo ya está en uso';
          }
          
          const toast = await this.toast.create({
            message: errorMessage,
            color: 'danger',
            duration: 3000,
            position: 'top',
          });
          toast.present();
        },
      });
  }
}
