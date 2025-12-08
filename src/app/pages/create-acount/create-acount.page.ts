import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create-acount',
  templateUrl: './create-acount.page.html',
  styleUrls: ['./create-acount.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class CreateAcountPage implements OnInit {

  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  usernameError = '';
  emailError = '';
  passwordError = '';
  confirmPasswordError = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // Auto-focus en el campo de username después de que la vista se cargue
    setTimeout(() => {
      const usernameInput = document.querySelector('ion-input[name="username"]');
      if (usernameInput) {
        (usernameInput as any).setFocus();
      }
    }, 300);
  }

  get canSubmit(): boolean {
    return this.username.length >= 3 && 
           this.emailValid(this.email) && 
           this.password.length >= 6 &&
           this.password === this.confirmPassword;
  }

  validateUsername() {
    if (!this.username) {
      this.usernameError = '';
      return;
    }
    if (this.username.length < 3) {
      this.usernameError = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (this.username.length > 30) {
      this.usernameError = 'El nombre de usuario es demasiado largo';
    } else {
      this.usernameError = '';
    }
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
    
    // Re-validar confirmación si ya se ingresó
    if (this.confirmPassword) {
      this.validateConfirmPassword();
    }
  }

  validateConfirmPassword() {
    if (!this.confirmPassword) {
      this.confirmPasswordError = '';
      return;
    }
    if (this.confirmPassword !== this.password) {
      this.confirmPasswordError = 'Las contraseñas no coinciden';
    } else {
      this.confirmPasswordError = '';
    }
  }

  emailValid(value: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(value);
  }

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPassword() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  async registrar() {
    // Limpiar errores previos
    this.usernameError = '';
    this.emailError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';

    // Validación completa antes de enviar
    if (!this.username) {
      this.usernameError = 'El nombre de usuario es requerido';
      return;
    }

    if (this.username.length < 3) {
      this.usernameError = 'El nombre de usuario debe tener al menos 3 caracteres';
      return;
    }

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

    if (!this.confirmPassword) {
      this.confirmPasswordError = 'Debes confirmar tu contraseña';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.confirmPasswordError = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;

    // Llamada real al API de registro
    this.authService.register({
      nombre: this.username,
      email: this.email,
      contrasena: this.password
    }).subscribe({
      next: async (response) => {
        this.loading = false;
        
        // Registro exitoso
        await this.showToast('¡Cuenta creada exitosamente! Iniciando sesión...', 'success');
        
        // Navegar a tabs después de crear cuenta
        setTimeout(() => {
          this.navCtrl.navigateRoot('/tabs', { replaceUrl: true });
        }, 500);
      },
      error: async (error) => {
        this.loading = false;
        
        // Manejo de errores específicos
        let message = 'Error al crear la cuenta. Intenta de nuevo.';
        
        if (error.status === 409) {
          message = 'Este correo electrónico ya está registrado';
          this.emailError = message;
        } else if (error.status === 400) {
          message = 'Datos inválidos. Verifica los campos.';
        } else if (error.status === 0) {
          message = 'No se puede conectar con el servidor. Verifica tu conexión.';
        } else if (error.error?.message) {
          message = error.error.message;
        }
        
        await this.showToast(message, 'danger');
      }
    });
  }

  goLogin() {
    this.navCtrl.navigateBack('/login');
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

