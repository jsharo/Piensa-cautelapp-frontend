# 🔊 Configuración de Sonidos para Alarmas

## ✅ Estado Actual

Los sonidos de alarma están correctamente configurados en dos ubicaciones:

### 1. Para la app web y primer plano (HTML Audio)
**Ubicación:** `src/assets/sounds/alarm_sound.mp3`
- ✅ Funciona cuando la app está abierta
- ✅ Se reproduce desde tab3.page.ts usando `HTMLAudioElement`

### 2. Para notificaciones de Android en segundo plano
**Ubicación:** `android/app/src/main/res/raw/alarm_sound.mp3`
- ✅ Funciona cuando la app está cerrada o en segundo plano
- ✅ Android busca automáticamente en `res/raw/` cuando se especifica el nombre sin extensión

---

## 🔧 Cómo funciona el sistema dual

### Cuando la app está en PRIMER PLANO:
1. La alarma suena usando el `HTMLAudioElement` en tab3.page.ts
2. Se reproduce el archivo de `src/assets/sounds/alarm_sound.mp3`
3. Ventaja: Control total del audio (loop, volumen, etc.)

### Cuando la app está en SEGUNDO PLANO:
1. Local Notifications de Capacitor dispara la notificación
2. Android reproduce `android/app/src/main/res/raw/alarm_sound.mp3`
3. Ventaja: Funciona incluso si la app está cerrada

---

## 🎵 Cambiar el sonido de alarma

Si quieres cambiar el sonido:

1. **Reemplazar el archivo en ambas ubicaciones:**
   ```
   src/assets/sounds/alarm_sound.mp3
   android/app/src/main/res/raw/alarm_sound.mp3
   ```

2. **Requisitos del archivo:**
   - Formato: MP3 (recomendado)
   - Duración: 5-30 segundos
   - Volumen: Normalizado (no muy bajo)
   - Calidad: Mínimo 128 kbps

3. **Después de cambiar el archivo:**
   ```bash
   # Copiar el nuevo archivo a Android
   cp src/assets/sounds/alarm_sound.mp3 android/app/src/main/res/raw/alarm_sound.mp3
   
   # Sincronizar cambios con Capacitor
   ionic cap sync android
   
   # Reconstruir la app
   ionic cap build android
   ```

---

## 📱 Notas importantes para Android

### El nombre del archivo DEBE ser:
- **Sin extensión** en el código: `sound: 'alarm_sound'` ✅
- **Con extensión .mp3** en el sistema de archivos: `alarm_sound.mp3` ✅

### El directorio raw:
- Si no existe `android/app/src/main/res/raw/`, créalo manualmente
- Android solo acepta archivos en minúsculas y sin espacios
- Formatos soportados: mp3, wav, ogg

---

## 🔍 Troubleshooting

### La alarma no suena en segundo plano:
1. ✅ Verificar que el archivo existe en `res/raw/`
2. ✅ Verificar permisos de notificación
3. ✅ Verificar que el canal de alarmas está creado correctamente
4. ✅ En Android: No molestar debe permitir alarmas

### La alarma no suena en primer plano:
1. ✅ Verificar que el archivo existe en `assets/sounds/`
2. ✅ Verificar que el navegador permite reproducir audio
3. ✅ Verificar volumen del dispositivo

---

## 🎯 Código relevante

### alarm.background.service.ts (Segundo plano)
```typescript
sound: 'alarm_sound', // SIN .mp3
```

### tab3.page.ts (Primer plano)
```typescript
this.audio = new Audio();
this.audio.src = 'assets/sounds/alarm_sound.mp3'; // CON .mp3
```

---

## ✨ Mejoras futuras opcionales

1. **Sonidos por categoría:**
   - `medicamento.mp3` - sonido suave
   - `cita.mp3` - sonido más urgente
   - `otro.mp3` - sonido neutral

2. **Vibración personalizada:**
   - Ya implementado con Haptics
   - Patrón: 1 segundo cada 2 segundos

3. **Volumen gradual:**
   - Empezar bajo y subir gradualmente
   - Requiere control más fino del audio
