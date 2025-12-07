import { Component, OnInit } from '@angular/core';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage implements OnInit {

  email = '';
  password = '';
  remember = true;
  loading = false;
  emailError = '';
  passwordError = '';
  passwordVisible = false;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    // Auto-focus en el campo de email después de que la vista se cargue
    setTimeout(() => {
      const emailInput = document.querySelector('ion-input[name="email"]');
      if (emailInput) {
        (emailInput as any).setFocus();
      }
    }, 300);
  }

  get canSubmit(): boolean {
    return this.emailValid(this.email) && this.password.length >= 6;
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
    if (!this.password) {
      this.passwordError = '';
      return;
    }
    if (this.password.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres';
    } else if (this.password.length > 50) {
      this.passwordError = 'La contraseña es demasiado larga';
    } else {
      this.passwordError = '';
    }
  }

  emailValid(value: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(value);
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  async entrar() {
    // Limpiar errores previos
    this.emailError = '';
    this.passwordError = '';

    // Validación completa antes de enviar
    if (!this.email) {
      this.emailError = 'El correo electrónico es requerido';
      return;
    }

    if (!this.emailValid(this.email)) {
      this.emailError = 'Ingresa un correo electrónico válido';
      return;
    }

    if (!this.password) {
      this.passwordError = 'La contraseña es requerida';
      return;
    }

    if (this.password.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;

    // Simulación de login; aquí iría la llamada real al API
    setTimeout(async () => {
      this.loading = false;

      // Guardar sesión si el usuario lo pidió
      if (this.remember) {
        localStorage.setItem('rememberSession', 'true');
        localStorage.setItem('userEmail', this.email);
      }

      // Login exitoso
      await this.showToast('¡Bienvenido! Iniciando sesión...', 'success');
      
      // Navegar a tabs (automáticamente redirige a tab1)
      this.navCtrl.navigateRoot('/tabs', { replaceUrl: true });
    }, 1200);
  }

  goRegister() {
    this.navCtrl.navigateForward('/create-acount');
  }

  forgotPassword() {
    // Navegar o mostrar modal de recuperación
    this.navCtrl.navigateForward('/recuperar');
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
