import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  mailOutline, 
  lockClosedOutline, 
  eyeOutline, 
  eyeOffOutline,
  notificationsOutline,
  personCircleOutline,
  settingsOutline,
  logOutOutline,
  homeOutline,
  helpCircleOutline,
  personCircle,
  createOutline,
  locationOutline,
  notificationsOffOutline
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { AuthInterceptor } from './app/interceptors/auth.interceptor';

// Registrar todos los iconos que usa la aplicación
addIcons({
  'person-outline': personOutline,
  'mail-outline': mailOutline,
  'lock-closed-outline': lockClosedOutline,
  'eye-outline': eyeOutline,
  'eye-off-outline': eyeOffOutline,
  'notifications-outline': notificationsOutline,
  'person-circle-outline': personCircleOutline,
  'person-circle': personCircle,
  'settings-outline': settingsOutline,
  'log-out-outline': logOutOutline,
  'home-outline': homeOutline,
  'help-circle-outline': helpCircleOutline,
  'create-outline': createOutline,
  'location-outline': locationOutline,
  'notifications-off-outline': notificationsOffOutline
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    importProvidersFrom(HttpClientModule),
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
