import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que redirige a /tabs si el usuario ya está autenticado
 * Útil para páginas de login y registro
 */
export const noAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Usuario ya está autenticado, redirigir a tabs
    router.navigate(['/tabs']);
    return false;
  }

  // Usuario no autenticado, permitir acceso a login/registro
  return true;
};
