# Guía Rápida: Probar Notificaciones Locales

## Pasos para Probar

### 1. Compilar y Ejecutar la App

```bash
cd "c:\Projects\Proyecto Fin\Piensa-cautelapp-frontend"

# Compilar la aplicación
ionic build

# Sincronizar con Android
ionic cap sync android

# Abrir en Android Studio
ionic cap open android
```

### 2. Permisos en Primera Ejecución

Al abrir la app por primera vez:
- ✅ Se solicitarán permisos de notificaciones
- ✅ Aceptar "Permitir notificaciones"
- ⚠️ Si deniega permisos, las notificaciones solo aparecerán dentro de la app

### 3. Simular una Alerta de Emergencia

**Opción A: Desde Postman o cURL**

```bash
# EMERGENCIA
curl -X POST https://piensa-cautelapp-back.onrender.com/notifications/webhook/esp32 \
  -H "Content-Type: application/json" \
  -d '{
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "tipo": "EMERGENCIA",
    "mensaje": "Caída detectada - Prueba de notificación",
    "bateria": 85
  }'

# AYUDA
curl -X POST https://piensa-cautelapp-back.onrender.com/notifications/webhook/esp32 \
  -H "Content-Type: application/json" \
  -d '{
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "tipo": "AYUDA",
    "mensaje": "Botón de ayuda presionado - Prueba",
    "bateria": 90
  }'
```

**Nota:** Reemplaza `"AA:BB:CC:DD:EE:FF"` con la dirección MAC de un dispositivo registrado en tu cuenta.

### 4. Esperar la Notificación Local

- ⏱️ **Tiempo de espera:** Máximo 10 segundos (polling interval)
- 📱 **Dónde aparece:**
  - En la barra de notificaciones del dispositivo
  - En la pantalla de bloqueo
  - Como banner si la app está abierta

### 5. Verificar Comportamiento

✅ **Lo que debes ver:**
1. Notificación local con título "🚨 EMERGENCIA" o "⚠️ SOLICITUD DE AYUDA"
2. Sonido y vibración del dispositivo
3. Al tocar la notificación, se abre la app en Tab1
4. La notificación aparece en la lista de Tab1

✅ **Colores esperados:**
- 🔴 EMERGENCIA: Color rojo (#DC2626)
- 🟠 AYUDA: Color naranja (#FF9500)

## Verificar Logs

### En Android Studio

```bash
# Ver todos los logs
adb logcat

# Filtrar solo notificaciones
adb logcat | grep -i "notification"

# Filtrar logs de la app
adb logcat | grep -i "cautelapp"
```

### Logs Esperados

```
✅ Permisos de notificación local concedidos
✅ Canal de notificaciones configurado
✅ Listeners de notificaciones configurados
✅ Notificación de emergencia enviada: {id: 1, title: "🚨 EMERGENCIA", ...}
```

## Troubleshooting

### Problema: No aparece la notificación local

**Soluciones:**
1. Verificar que los permisos estén concedidos
2. Ir a Configuración → Apps → CautelApp → Notificaciones → Activar
3. Verificar que el dispositivo esté registrado con esa MAC address
4. Revisar logs de Android Studio

### Problema: Notificación sin sonido

**Soluciones:**
1. Verificar que el dispositivo no esté en modo silencio
2. Ir a Configuración → Apps → CautelApp → Notificaciones → Sonido → Activar
3. Verificar que el archivo `notification_sound.wav` exista en `android/app/src/main/res/raw/`

### Problema: Delay muy largo (más de 10 segundos)

**Explicación:**
- El sistema actual usa polling cada 10 segundos
- Para notificaciones instantáneas, se requiere implementar WebSockets

## Comandos Útiles

```bash
# Recompilar y ejecutar
ionic cap sync android && ionic cap run android -l

# Limpiar caché y recompilar
ionic build --prod
ionic cap sync android
ionic cap copy android

# Ver dispositivos conectados
adb devices

# Reinstalar app
adb uninstall com.cautelapp.app
ionic cap run android
```

## Notas Importantes

1. **Primera vez:** La app solicitará permisos automáticamente
2. **Polling:** Las notificaciones pueden tardar hasta 10 segundos en llegar
3. **Solo nativas:** No funciona en navegador web, solo en dispositivo/emulador
4. **Grupos compartidos:** Todos los miembros del grupo reciben la notificación

## Próximos Pasos

Después de verificar que funciona:
1. Probar con ESP32 real (no simulación)
2. Probar con múltiples dispositivos en grupo compartido
3. Verificar comportamiento con app en segundo plano
4. Verificar comportamiento con app cerrada

---

**¿Todo funcionando? 🎉**
Las notificaciones locales ahora están completamente integradas en tu app!
