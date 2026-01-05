# Sistema de Notificaciones Locales - CautelApp

## Descripción General

Este sistema permite que la aplicación envíe **notificaciones locales** al celular del usuario cuando llegan alertas de emergencia o ayuda desde los dispositivos ESP32. Las notificaciones aparecen en la barra de notificaciones del dispositivo móvil, incluso cuando la app está cerrada o en segundo plano.

## Componentes Implementados

### 1. LocalNotificationService (`local-notification.service.ts`)

Servicio centralizado para gestionar todas las notificaciones locales en la app.

**Características:**
- ✅ Solicita y verifica permisos de notificaciones
- ✅ Configura canales de notificación para Android
- ✅ Envía notificaciones de emergencia (color rojo)
- ✅ Envía notificaciones de ayuda (color naranja)
- ✅ Gestiona IDs únicos para cada notificación
- ✅ Configura sonido y vibración personalizados
- ✅ Listeners para detectar cuando el usuario toca una notificación

**Métodos principales:**
```typescript
// Solicitar permisos
await localNotificationService.requestPermissions();

// Verificar permisos actuales
const hasPermissions = await localNotificationService.checkPermissions();

// Enviar notificación de emergencia
await localNotificationService.sendEmergencyNotification(
  '🚨 EMERGENCIA',
  'Juan necesita asistencia de inmediato',
  { notificationId: 123 }
);

// Enviar notificación de ayuda
await localNotificationService.sendHelpNotification(
  '⚠️ SOLICITUD DE AYUDA',
  'María necesita ayuda',
  { notificationId: 124 }
);

// Enviar notificación genérica con tipo
await localNotificationService.sendNotification(
  'Título',
  'Mensaje',
  'EMERGENCIA', // o 'AYUDA'
  { data: 'extra' }
);
```

### 2. Tab1Page Modificado (`tab1.page.ts`)

La página de notificaciones ahora incluye:

**Sistema de Polling:**
- Cada 10 segundos verifica si hay nuevas notificaciones desde el backend
- Compara IDs de notificaciones anteriores con las nuevas
- Envía notificación local solo para alertas nuevas

**Flujo de Detección:**
```
1. Usuario inicia sesión
2. Se cargan notificaciones existentes (sin enviar notificaciones locales)
3. Inicia polling cada 10 segundos
4. Cuando detecta una nueva notificación:
   - Envía notificación local al dispositivo
   - Actualiza la UI con la nueva notificación
   - Guarda el ID para no volver a notificar
```

**Código clave:**
```typescript
// Al iniciar la página
async ngOnInit() {
  // Solicitar permisos
  await this.localNotificationService.requestPermissions();
  
  // Cargar notificaciones iniciales
  await this.loadNotifications();
  
  // Iniciar polling cada 10 segundos
  this.startPolling();
}

// Verificar nuevas notificaciones
private async checkForNewNotifications() {
  const notifications = await this.notificationService.getUserNotifications();
  
  // Filtrar solo las nuevas
  const newNotifications = notifications.filter(n => 
    !this.previousNotificationIds.has(n.id_notificacion)
  );
  
  // Enviar notificación local para cada nueva
  for (const notification of newNotifications) {
    await this.sendLocalNotificationForAlert(notification);
  }
}
```

### 3. AppComponent Modificado (`app.component.ts`)

**Inicialización:**
- Solicita permisos de notificaciones al iniciar la app
- Asegura que los permisos estén disponibles desde el inicio

```typescript
async initializeApp() {
  await this.platform.ready();
  
  // Solicitar permisos de notificaciones locales
  await this.localNotificationService.requestPermissions();
}
```

## Flujo de Notificaciones Completo

### Escenario 1: Alerta de Emergencia

```
1. ESP32 detecta caída
   ↓
2. ESP32 envía webhook a backend
   POST https://piensa-cautelapp-back.onrender.com/notifications/webhook/esp32
   {
     "mac_address": "AA:BB:CC:DD:EE:FF",
     "tipo": "EMERGENCIA",
     "mensaje": "Caída detectada",
     "bateria": 85
   }
   ↓
3. Backend crea notificación en DB
   ↓
4. Backend notifica a grupos compartidos (si aplica)
   ↓
5. Frontend (Tab1) polling cada 10s detecta nueva notificación
   ↓
6. Frontend envía notificación local:
   📱 "🚨 EMERGENCIA"
   📱 "Juan necesita asistencia de inmediato: Caída detectada"
   ↓
7. Usuario recibe notificación en pantalla bloqueada/barra de estado
   ↓
8. Usuario toca notificación → App se abre en Tab1
```

### Escenario 2: Solicitud de Ayuda

```
1. ESP32 detecta botón de ayuda presionado
   ↓
2. ESP32 envía webhook con tipo "AYUDA"
   ↓
3. Backend procesa y guarda en DB
   ↓
4. Frontend detecta nueva notificación
   ↓
5. Frontend envía notificación local:
   📱 "⚠️ SOLICITUD DE AYUDA"
   📱 "María necesita ayuda: Botón de ayuda presionado"
   ↓
6. Todos los miembros del grupo compartido reciben la notificación
```

## Permisos Necesarios

### Android

La app solicita el permiso `POST_NOTIFICATIONS` (Android 13+) automáticamente.

**Permisos en `AndroidManifest.xml`:**
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### iOS

**Configuración en `Info.plist`:**
```xml
<key>NSUserNotificationsUsageDescription</key>
<string>CautelApp necesita enviar notificaciones para alertarte sobre emergencias y solicitudes de ayuda de tus seres queridos.</string>
```

## Personalización de Notificaciones

### Canales de Android

El servicio crea un canal llamado **"Notificaciones CautelApp"** con:
- ✅ Importancia máxima (aparece como heads-up notification)
- ✅ Sonido personalizado: `notification_sound.wav`
- ✅ Vibración activada
- ✅ LED de notificación (color rojo #FF0000)
- ✅ Visibilidad pública (aparece en pantalla bloqueada)

### Colores por Tipo

- 🔴 **EMERGENCIA**: `#DC2626` (rojo)
- 🟠 **AYUDA**: `#FF9500` (naranja)
- 🟢 **Genérica**: `#159A9C` (teal)

### Iconos

Utiliza el ícono pequeño configurado en `ic_stat_icon_config_sample`.

**Para cambiar el ícono:**
1. Crear imagen PNG monocromática (24x24dp)
2. Colocar en `android/app/src/main/res/drawable/`
3. Actualizar `smallIcon` en `local-notification.service.ts`

## Configuración de Sonidos

### Agregar Sonido Personalizado

1. **Crear archivo de audio:**
   - Formato: `.wav` o `.mp3`
   - Duración: 2-5 segundos
   - Nombre: `notification_sound.wav`

2. **Android:**
   - Colocar en: `android/app/src/main/res/raw/notification_sound.wav`
   - Ya está configurado en el canal de notificaciones

3. **iOS:**
   - Colocar en: `ios/App/App/Assets/notification_sound.wav`
   - Actualizar en `LocalNotificationService.ts`:
   ```typescript
   sound: 'notification_sound.wav'
   ```

## Testing

### Probar Notificaciones Locales

1. **Compilar y ejecutar en dispositivo Android:**
   ```bash
   ionic cap build android
   ionic cap sync android
   ionic cap run android -l
   ```

2. **Verificar permisos:**
   - Al abrir la app por primera vez debe solicitar permisos
   - Aceptar "Permitir notificaciones"

3. **Simular webhook desde ESP32:**
   ```bash
   curl -X POST https://piensa-cautelapp-back.onrender.com/notifications/webhook/esp32 \
     -H "Content-Type: application/json" \
     -d '{
       "mac_address": "AA:BB:CC:DD:EE:FF",
       "tipo": "EMERGENCIA",
       "mensaje": "Caída detectada - TEST",
       "bateria": 85
     }'
   ```

4. **Esperar polling (10 segundos máximo)**
   - La notificación local debe aparecer en el dispositivo
   - Verificar sonido y vibración

### Debugging

**Ver logs en Android Studio:**
```bash
adb logcat | grep -i "notification\|cautelapp"
```

**Logs en la app:**
- ✅ "Permisos de notificación local concedidos"
- ✅ "Canal de notificaciones configurado"
- ✅ "Notificación de emergencia enviada"
- ❌ "No se puede enviar notificación: permisos no concedidos"

## Limitaciones Conocidas

1. **Polling cada 10 segundos:**
   - Delay máximo de 10s para recibir notificación
   - Para notificaciones instantáneas, implementar WebSockets

2. **Solo en plataformas nativas:**
   - No funciona en navegador web
   - Requiere Capacitor y dispositivo físico/emulador

3. **Permisos denegados:**
   - Si el usuario deniega permisos, las notificaciones solo aparecen en la app
   - Debe ir manualmente a configuración del dispositivo para habilitarlas

## Mejoras Futuras

### WebSockets para Notificaciones Instantáneas

Reemplazar polling con WebSockets:

```typescript
// Backend: notifications.gateway.ts
@WebSocketGateway()
export class NotificationsGateway {
  @SubscribeMessage('subscribe_notifications')
  handleSubscribe(client: Socket, userId: number) {
    client.join(`user_${userId}`);
  }
  
  async notifyUser(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('new_notification', notification);
  }
}

// Frontend: Tab1Page
ngOnInit() {
  // Conectar a WebSocket
  this.socket.on('new_notification', (notification) => {
    this.sendLocalNotificationForAlert(notification);
  });
}
```

### Notificaciones Agrupadas

Para múltiples notificaciones, agruparlas:

```typescript
await LocalNotifications.schedule({
  notifications: [{
    id: 1,
    title: '3 nuevas emergencias',
    body: 'Juan, María y Pedro necesitan ayuda',
    group: 'emergencias',
    groupSummary: true
  }]
});
```

### Acciones Rápidas

Agregar botones de acción:

```typescript
await LocalNotifications.schedule({
  notifications: [{
    id: 1,
    title: '🚨 EMERGENCIA',
    body: 'Juan necesita asistencia',
    actionTypeId: 'emergency_actions',
    extra: { notificationId: 123 }
  }]
});

// Registrar acciones
await LocalNotifications.registerActionTypes({
  types: [{
    id: 'emergency_actions',
    actions: [
      { id: 'view', title: 'Ver detalles' },
      { id: 'call', title: 'Llamar' }
    ]
  }]
});
```

## Soporte

Para problemas o preguntas:
- Backend: Verificar logs en Render dashboard
- Frontend: Revisar consola de Android Studio o Xcode
- ESP32: Monitor serial para debugging de webhook

---

**Última actualización:** Enero 2025
**Versión:** 1.0.0
