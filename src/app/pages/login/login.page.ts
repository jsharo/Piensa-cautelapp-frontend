import { Component, OnInit } from '@angular/core';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

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
    private toastCtrl: ToastController,
    private authService: AuthService
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

    // Llamada real al API
    this.authService.login({
      email: this.email,
      contrasena: this.password,
      remember: this.remember
    }).subscribe({
      next: async (response) => {
        this.loading = false;
        
        // Login exitoso
        await this.showToast('¡Bienvenido! Iniciando sesión...', 'success');
        
        // Navegar a tabs
        setTimeout(() => {
          this.navCtrl.navigateRoot('/tabs', { replaceUrl: true });
        }, 500);
      },
      error: async (error) => {
        this.loading = false;
        
        // Manejo de errores específicos
        let message = 'Error al iniciar sesión. Intenta de nuevo.';
        
        if (error.status === 401) {
          message = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
        } else if (error.status === 0) {
          message = 'No se puede conectar con el servidor. Verifica tu conexión.';
        } else if (error.error?.message) {
          message = error.error.message;
        }
        
        await this.showToast(message, 'danger');
      }
    });
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
