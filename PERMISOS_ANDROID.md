# 🔐 Permisos de Android - CautelApp

## Permisos Configurados

La aplicación solicita automáticamente los siguientes permisos:

### ✅ Permisos Solicitados Automáticamente

1. **POST_NOTIFICATIONS** (Android 13+)
   - **Propósito**: Mostrar notificaciones de alarmas
   - **Se solicita**: Al iniciar la app en Tab3 (Alarmas)
   - **Usuario ve**: Diálogo del sistema "¿Permitir notificaciones?"

### ⚙️ Permisos que el Usuario DEBE Activar Manualmente

2. **SCHEDULE_EXACT_ALARM** (Android 12+)
   - **Propósito**: Programar alarmas exactas en segundo plano
   - **Se solicita**: El sistema NO muestra diálogo automático
   - **Usuario DEBE ir a**: 
     ```
     Ajustes > Apps > CautelApp > Alarmas y recordatorios > ACTIVAR
     ```
   - **⚠️ CRÍTICO**: Sin este permiso, las alarmas NO sonarán en segundo plano

### 📱 Otros Permisos Declarados

3. **USE_FULL_SCREEN_INTENT**
   - Mostrar alarmas en pantalla completa (pantalla bloqueada)

4. **VIBRATE**
   - Vibración al sonar alarmas

5. **WAKE_LOCK**
   - Despertar dispositivo cuando suene alarma

6. **ACCESS_NOTIFICATION_POLICY**
   - Gestión avanzada de notificaciones

## 🔍 Verificación de Permisos

### Desde la App

El código verifica permisos en:
- `alarm.background.service.ts`: Método `requestPermissions()`
- `tab3.page.ts`: Método `checkAndRequestPermissions()`

### Logs en Consola

```
✅ Permisos de notificación ya concedidos
ℹ️ Verificando permiso SCHEDULE_EXACT_ALARM...
📋 Si las alarmas no funcionan, verifica en Ajustes > Apps > CautelApp > Alarmas y recordatorios
```

## ⚠️ Problemas Comunes

### Alarma no suena en segundo plano

**Causa**: Falta permiso SCHEDULE_EXACT_ALARM

**Solución**:
1. Ajustes de Android
2. Apps > CautelApp
3. Alarmas y recordatorios
4. **ACTIVAR**

### No aparece notificación

**Causa**: POST_NOTIFICATIONS denegado

**Solución**:
1. La app muestra diálogo al entrar a Tab3
2. Presionar "Permitir"
3. Si se denegó antes: Ajustes > Apps > CautelApp > Notificaciones > ACTIVAR

## 📋 Checklist para el Usuario

Cuando instales la app por primera vez:

- [ ] Al abrir Tab3, permitir NOTIFICACIONES (diálogo automático)
- [ ] Ir a Ajustes > Apps > CautelApp > Alarmas y recordatorios > ACTIVAR
- [ ] Crear alarma de prueba (2 min)
- [ ] Presionar HOME
- [ ] Verificar que la alarma suene

## 🛠️ Para Desarrolladores

### Archivos Relacionados

- `android/app/src/main/AndroidManifest.xml`: Declaración de permisos
- `src/app/services/alarm.background.service.ts`: Lógica de verificación
- `src/app/tab3/tab3.page.ts`: UI para solicitar permisos

### Testing

```typescript
// Verificar permisos
await this.alarmBackground.checkPermissions();

// Solicitar permisos
await this.alarmBackground.requestPermissionsManually();

// Ver notificaciones pendientes
await this.alarmBackground.getPendingNotifications();
```

## 📚 Referencias

- [Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications)
- [Android Permissions Guide](https://developer.android.com/guide/topics/permissions/overview)
- [SCHEDULE_EXACT_ALARM](https://developer.android.com/reference/android/Manifest.permission#SCHEDULE_EXACT_ALARM)
