import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule, NavController, ToastController, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss']
})
export class ForgotPasswordPage implements OnInit {

  email = '';
  emailError = '';
  loading = false;
  step: 'email' | 'code' | 'reset' = 'email'; // email -> code -> reset
  resetCode = '';
  newPassword = '';
  confirmPassword = '';
  passwordError = '';
  codeError = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Componente inicializado
  }

  emailValid(value: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(value);
  }

  validateEmail() {
    if (!this.email) {
      this.emailError = '';
      return;
    }
    if (!this.emailValid(this.email)) {
      this.emailError = 'Ingresa un correo electrónico válido';
    } else {
      this.emailError = '';
    }
  }

  validatePassword() {
    if (!this.newPassword) {
      this.passwordError = '';
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres';
    } else if (this.newPassword.length > 50) {
      this.passwordError = 'La contraseña es demasiado larga';
    } else if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden';
    } else {
      this.passwordError = '';
    }
  }

  async requestReset() {
    this.emailError = '';

    if (!this.email) {
      this.emailError = 'El correo electrónico es requerido';
      return;
    }

    if (!this.emailValid(this.email)) {
      this.emailError = 'Ingresa un correo electrónico válido';
      return;
    }

    this.loading = true;

    this.authService.requestPasswordReset(this.email).subscribe({
      next: async (response) => {
        this.loading = false;
        await this.showToast('Se envió un código de verificación a tu email', 'success');
        this.step = 'code';
      },
      error: async (error) => {
        this.loading = false;
        let message = 'Error al enviar el código, intenta de nuevo';
        
        if (error.status === 404) {
          message = 'No encontramos una cuenta con ese correo';
        } else if (error.error?.message) {
          message = error.error.message;
        }
        
        await this.showToast(message, 'danger');
      }
    });
  }

  async verifyCode() {
    this.codeError = '';

    if (!this.resetCode) {
      this.codeError = 'El código es requerido';
      return;
    }

    this.loading = true;

    this.authService.verifyResetCode(this.email, this.resetCode).subscribe({
      next: async (response) => {
        this.loading = false;
        await this.showToast('Código verificado, ahora ingresa tu nueva contraseña', 'success');
        this.step = 'reset';
      },
      error: async (error) => {
        this.loading = false;
        let message = 'Código inválido, intenta de nuevo';
        
        if (error.error?.message) {
          message = error.error.message;
        }
        
        await this.showToast(message, 'danger');
      }
    });
  }

  async resetPassword() {
    this.passwordError = '';

    if (!this.newPassword) {
      this.passwordError = 'La contraseña es requerida';
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;

    this.authService.resetPassword(this.email, this.resetCode, this.newPassword).subscribe({
      next: async (response) => {
        this.loading = false;
        await this.showToast('Contraseña actualizada correctamente', 'success');
        
        setTimeout(() => {
          this.navCtrl.navigateRoot('/login', { replaceUrl: true });
        }, 500);
      },
      error: async (error) => {
        this.loading = false;
        let message = 'Error al actualizar la contraseña, intenta de nuevo';
        
        if (error.error?.message) {
          message = error.error.message;
        }
        
        await this.showToast(message, 'danger');
      }
    });
  }

  goBack() {
    if (this.step === 'email') {
      this.navCtrl.back();
    } else if (this.step === 'code') {
      this.step = 'email';
      this.resetCode = '';
    } else {
      this.step = 'code';
      this.newPassword = '';
      this.confirmPassword = '';
    }
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPassword() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color,
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
}
