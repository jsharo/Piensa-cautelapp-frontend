import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage),
    canActivate: [noAuthGuard]
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
    canActivate: [authGuard]
  },
  {
    path: 'configuration',
    loadComponent: () => import('./pages/configuration/configuration.page').then(m => m.ConfigurationPage),
    canActivate: [authGuard]
  },
  {
    path: 'create-acount',
    loadComponent: () => import('./pages/create-acount/create-acount.page').then( m => m.CreateAcountPage),
    canActivate: [noAuthGuard]
  },
];
