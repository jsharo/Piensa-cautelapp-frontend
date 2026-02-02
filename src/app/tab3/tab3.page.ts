import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonItem, IonToggle, IonCheckbox,
  IonButton, IonIcon,
  IonFab, IonFabButton,
  AlertController, ToastController, PopoverController,
  ModalController, GestureController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, addOutline, trashOutline, alarmOutline, timeOutline, closeOutline,
  checkmarkOutline, personCircle, medicalOutline, calendarOutline,
  notificationsOutline, checkmarkCircleOutline, filterOutline,
  playOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { AlarmService } from '../services/alarm.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';
import { AlarmModalComponent } from './alarm-modal/alarm-modal.component';
import { AlarmBackgroundService } from '../services/alarm.background.service';
import { Inject } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// INTERFACE MODIFICADA:
interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  category: 'medicamento' | 'cita' | 'otro';
  repeatDays: number[]; // 0-6 (domingo-sábado)
  notes?: string;
  notificationId?: number; // <-- NUEVO: ID de notificación programada
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent,
    IonItem, IonToggle, IonCheckbox,
    IonButton, IonIcon,
    IonFab, IonFabButton
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab3Page implements OnInit, OnDestroy {
  alarms: Alarm[] = [];
  private checkIntervalId: any;
  userProfileImage: string | null = null;
  selectedCategory: 'all' | 'medicamento' | 'cita' | 'otro' = 'all';
  editingAlarm: Alarm | null = null;
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private isPlayingSound = false;
  private triggeredAlarmsToday: Set<string> = new Set(); // Track alarmas ya disparadas hoy
  
  // Modo de selección múltiple
  isSelectionMode = false;
  selectedAlarms: Set<string> = new Set(); // IDs de alarmas seleccionadas
  private longPressTimer: any;
  private longPressDelay = 500; // milisegundos

  // CONSTRUCTOR MODIFICADO:
  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private auth: AuthService,
    private alarmService: AlarmService,
    private popoverController: PopoverController,
    private modalController: ModalController,
    private gestureCtrl: GestureController,
    @Inject(AlarmBackgroundService) private alarmBackground: AlarmBackgroundService // <-- NUEVO INYECTADO
  ) {
    addIcons({
      'add': add,
      'add-outline': addOutline,
      'trash-outline': trashOutline,
      'alarm-outline': alarmOutline,
      'time-outline': timeOutline,
      'close-outline': closeOutline,
      'checkmark-outline': checkmarkOutline,
      'person-circle': personCircle,
      'medical-outline': medicalOutline,
      'calendar-outline': calendarOutline,
      'notifications-outline': notificationsOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'filter-outline': filterOutline,
      'play-outline': playOutline
    });
    // Inicializar audio solo si estamos en un navegador (no en Android nativo)
    if (typeof Audio !== 'undefined') {
      this.audio = new Audio();
      this.audio.src = 'assets/sounds/alarm_sound.mp3';
      this.audio.load();
      this.audio.loop = true;
    }
  }

  // ngOnInit MODIFICADO:
  async ngOnInit() {
    this.loadAlarms();
    this.loadUserProfileImage();

    // Verificar y solicitar permisos de notificación
    await this.checkAndRequestPermissions();

    // Programar todas las alarmas cargadas
    await this.scheduleAllAlarms();

    // Escuchar eventos de alarma desde notificaciones
    window.addEventListener('alarmTriggered', (event: any) => {
      const alarmId = event.detail.alarmId;
      const alarm = this.alarms.find(a => a.id === alarmId);
      if (alarm) {
        this.triggerAlarm(alarm);
      }
    });

    // Iniciar monitoreo en primer plano (cada 10 segundos) - solo como fallback
    this.startForegroundCheck();
  }

  // Nuevo método para verificar permisos
  private async checkAndRequestPermissions(): Promise<void> {
    const hasPermissions = await this.alarmBackground.checkPermissions();
    
    if (!hasPermissions) {
      const alert = await this.alertController.create({
        header: '🔔 Permisos de Notificación',
        message: 'Para que las alarmas funcionen correctamente en segundo plano, necesitamos los siguientes permisos:\n\n' +
                 '• Notificaciones\n' +
                 '• Alarmas y recordatorios exactos\n\n' +
                 'Si las alarmas no funcionan, verifica en: Ajustes > Apps > CautelApp > Permisos',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            cssClass: 'secondary'
          },
          {
            text: 'Permitir',
            handler: async () => {
              const granted = await this.alarmBackground.requestPermissionsManually();
              if (!granted) {
                this.showToast('⚠️ Sin permisos, las alarmas no sonarán en segundo plano', 5000);
              } else {
                this.showToast('✅ Permisos concedidos. Verifica "Alarmas y recordatorios" en ajustes si es necesario', 5000);
              }
            }
          }
        ],
        cssClass: 'premium-alert'
      });
      
      await alert.present();
    }
  }

  ngOnDestroy() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }
    this.stopAlarmSound();
  }

  loadUserProfileImage() {
    const user = this.auth.getCurrentUser();
    if (user && (user as any).imagen) {
      this.userProfileImage = (user as any).imagen;
    }
  }

  async openProfileMenu(event: any) {
    this.loadUserProfileImage();
    const currentUser = this.auth.getCurrentUser();

    const popover = await this.popoverController.create({
      component: ProfileMenuComponent,
      event: event,
      componentProps: {
        userEmail: currentUser?.email || 'usuario@example.com',
        userName: currentUser?.nombre || 'Usuario'
      },
      translucent: true,
      cssClass: 'profile-popover'
    });

    return await popover.present();
  }

  // MÉTODO MODIFICADO:
  loadAlarms() {
    const saved = localStorage.getItem('cautela_alarms');
    if (saved) {
      this.alarms = JSON.parse(saved);
    }
  }

  // MÉTODO MODIFICADO:
  saveAlarms() {
    localStorage.setItem('cautela_alarms', JSON.stringify(this.alarms));
  }

  async openAddModal() {
    const modal = await this.modalController.create({
      component: AlarmModalComponent,
      cssClass: 'alarm-modal-centered'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'save' && data) {
      console.log('📥 Data recibida del modal:', data);
      console.log('🕐 Hora ISO recibida:', data.time);
      
      // Crear nueva alarma
      const timeFormatted = this.formatTimeFromISO(data.time);
      console.log('🕐 Hora formateada HH:mm:', timeFormatted);
      
      const newAlarm: Alarm = {
        id: Date.now().toString(),
        time: timeFormatted,
        label: data.label,
        enabled: true,
        category: data.category,
        repeatDays: data.repeatDays,
        notes: data.notes
      };

      console.log('✅ Alarma creada:', newAlarm);

      // Programar notificación
      try {
        const notificationId = await this.alarmBackground.scheduleAlarm(newAlarm);
        newAlarm.notificationId = notificationId;
      } catch (error) {
        console.error('Error programando nueva alarma:', error);
      }

      this.alarms.push(newAlarm);
      this.alarms.sort((a, b) => a.time.localeCompare(b.time));
      this.saveAlarms();
      this.showToast('Alarma creada');
    }
  }

  async editAlarm(alarm: Alarm) {
    const modal = await this.modalController.create({
      component: AlarmModalComponent,
      componentProps: {
        editingAlarm: alarm
      },
      cssClass: 'alarm-modal-centered'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'save' && data) {
      console.log('📝 === EDITANDO ALARMA ===');
      console.log('📥 Data recibida:', data);
      
      // Cancelar notificación existente
      if (alarm.notificationId) {
        await this.alarmBackground.cancelAlarm(alarm.id);
      }

      // Actualizar todos los campos de la alarma
      alarm.time = this.formatTimeFromISO(data.time);
      alarm.label = data.label;
      alarm.category = data.category;
      alarm.repeatDays = [...data.repeatDays]; // Copiar array
      alarm.notes = data.notes;

      console.log('✅ Alarma actualizada:', alarm);

      // Reprogramar si está habilitada
      if (alarm.enabled) {
        try {
          const notificationId = await this.alarmBackground.scheduleAlarm(alarm);
          alarm.notificationId = notificationId;
        } catch (error) {
          console.error('❌ Error reprogramando alarma:', error);
        }
      }

      this.saveAlarms();
      this.showToast('✅ Alarma actualizada');
    }
  }

  formatTimeFromISO(isoString: string): string {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // MÉTODO onTouchStart: inicia el temporizador para long press
  onTouchStart(alarm: Alarm, event: TouchEvent) {
    // Si ya está en modo selección, no activar long press
    if (this.isSelectionMode) return;
    
    this.longPressTimer = setTimeout(async () => {
      // Haptic feedback
      await Haptics.impact({ style: ImpactStyle.Medium });
      
      // Activar modo de selección y seleccionar esta alarma
      this.isSelectionMode = true;
      this.selectedAlarms.add(alarm.id);
      
      console.log('🔒 Modo selección activado');
    }, this.longPressDelay);
  }

  // MÉTODO onTouchEnd: cancela el temporizador si se suelta antes
  onTouchEnd(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // MÉTODO onTouchMove: cancela el long press si el dedo se mueve
  onTouchMove(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // MÉTODO toggleAlarmSelection: selecciona/deselecciona una alarma
  toggleAlarmSelection(alarm: Alarm, event: Event) {
    event.stopPropagation();
    
    if (this.selectedAlarms.has(alarm.id)) {
      this.selectedAlarms.delete(alarm.id);
    } else {
      this.selectedAlarms.add(alarm.id);
      Haptics.impact({ style: ImpactStyle.Light });
    }
  }

  // MÉTODO exitSelectionMode: sale del modo de selección
  exitSelectionMode() {
    this.isSelectionMode = false;
    this.selectedAlarms.clear();
  }

  // MÉTODO deleteSelectedAlarms: elimina todas las alarmas seleccionadas
  async deleteSelectedAlarms() {
    const count = this.selectedAlarms.size;
    
    if (count === 0) return;

    // Mostrar confirmación
    const alert = await this.alertController.create({
      header: '¿Eliminar alarmas?',
      message: `Se eliminarán ${count} alarma${count > 1 ? 's' : ''}`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            // Cancelar notificaciones
            for (const alarmId of this.selectedAlarms) {
              await this.alarmBackground.cancelAlarm(alarmId);
            }
            
            // Eliminar alarmas
            this.alarms = this.alarms.filter(a => !this.selectedAlarms.has(a.id));
            this.saveAlarms();
            
            // Feedback
            await Haptics.notification({ type: NotificationType.Success });
            this.showToast(`${count} alarma${count > 1 ? 's eliminadas' : ' eliminada'}`);
            
            // Salir del modo de selección
            this.exitSelectionMode();
          }
        }
      ]
    });

    await alert.present();
  }

  // MÉTODO isAlarmSelected: verifica si una alarma está seleccionada
  isAlarmSelected(alarm: Alarm): boolean {
    return this.selectedAlarms.has(alarm.id);
  }

  // MÉTODO deleteAlarm MODIFICADO:
  async deleteAlarm(alarm: Alarm) {
    // Cancelar notificación si existe
    if (alarm.notificationId) {
      await this.alarmBackground.cancelAlarm(alarm.id);
    }

    this.alarms = this.alarms.filter(a => a.id !== alarm.id);
    this.saveAlarms();
    
    // Haptic feedback al eliminar
    await Haptics.notification({ type: NotificationType.Success });
    this.showToast('Alarma eliminada');
  }

  // MÉTODO toggleAlarm MODIFICADO:
  async toggleAlarm(alarm: Alarm, event?: any) {
    if (event) {
      event.stopPropagation();
    }

    alarm.enabled = !alarm.enabled;

    if (alarm.enabled) {
      // Programar notificación
      try {
        const notificationId = await this.alarmBackground.scheduleAlarm(alarm);
        alarm.notificationId = notificationId;
      } catch (error) {
        console.error('Error programando alarma:', error);
      }
    } else {
      // Cancelar notificación
      if (alarm.notificationId) {
        await this.alarmBackground.cancelAlarm(alarm.id);
        alarm.notificationId = undefined;
      }
    }

    this.saveAlarms();
    this.showToast(alarm.enabled ? 'Alarma activada' : 'Alarma desactivada');
  }

  // Funciones de filtrado (SIN CAMBIOS)
  filterByCategory(category: 'all' | 'medicamento' | 'cita' | 'otro') {
    this.selectedCategory = category;
  }

  getFilteredAlarms(): Alarm[] {
    if (this.selectedCategory === 'all') {
      return this.alarms;
    }
    return this.alarms.filter(a => a.category === this.selectedCategory);
  }

  getActiveAlarmsCount(): number {
    return this.alarms.filter(a => a.enabled).length;
  }

  // Funciones auxiliares (SIN CAMBIOS)
  getCategoryIcon(category: string): string {
    switch (category) {
      case 'medicamento': return 'medical-outline';
      case 'cita': return 'calendar-outline';
      default: return 'notifications-outline';
    }
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getDayAbbr(day: number): string {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return days[day];
  }

  // MÉTODO NUEVO: scheduleAllAlarms (reemplaza a startAlarmCheck)
  private async scheduleAllAlarms(): Promise<void> {
    try {
      // Cancelar todas las alarmas existentes
      await this.alarmBackground.cancelAllAlarms();

      // Programar solo las alarmas activas
      for (const alarm of this.alarms.filter(a => a.enabled)) {
        try {
          const notificationId = await this.alarmBackground.scheduleAlarm(alarm);
          alarm.notificationId = notificationId;
        } catch (error) {
          console.error(`Error programando alarma ${alarm.label}:`, error);
        }
      }

      this.saveAlarms();
    } catch (error) {
      console.error('Error programando alarmas:', error);
    }
  }





  async triggerAlarm(alarm: Alarm) {
    console.log('⏰ Disparando alarma:', alarm.label);
    
    // Solo desactivar si NO tiene días de repetición (alarma de una sola vez)
    const isRecurring = alarm.repeatDays && alarm.repeatDays.length > 0;
    
    if (!isRecurring) {
      alarm.enabled = false;
      // Cancelar notificación programada
      if (alarm.notificationId) {
        await this.alarmBackground.cancelAlarm(alarm.id);
        alarm.notificationId = undefined;
      }
      this.saveAlarms();
    }

    // Reproducir sonido y vibrar
    this.playAlarmSound();

    // Notificar al backend (opcional)
    this.alarmService.triggerAlarm({
      ...alarm,
      timestamp: new Date().toISOString()
    }).subscribe({
      next: () => console.log('✅ Backend notificado'),
      error: (err) => console.error('❌ Error notificando backend', err)
    });

    // Mostrar alerta en la app
    const alert = await this.alertController.create({
      header: '⏰ ¡Alarma!',
      subHeader: alarm.label,
      message: alarm.notes ? `${this.formatTime(alarm.time)}\n${alarm.notes}` : `Son las ${this.formatTime(alarm.time)}`,
      buttons: [
        {
          text: 'Posponer 10 min',
          role: 'cancel',
          handler: () => {
            this.stopAlarmSound();
            this.snoozeAlarm(alarm);
          }
        },
        {
          text: 'OK',
          role: 'confirm',
          handler: () => {
            this.stopAlarmSound();
          }
        }
      ],
      cssClass: 'alarm-alert'
    });

    await alert.present();
  }

  snoozeAlarm(alarm: Alarm) {
    // Actualizar la hora de la alarma existente (10 minutos adelante)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    const snoozeTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Cancelar la notificación anterior si existe
    if (alarm.notificationId) {
      this.alarmBackground.cancelAlarm(alarm.notificationId.toString()).catch((err: any) => {
        console.warn('⚠️ Error al cancelar alarma anterior:', err);
      });
    }

    // Actualizar la alarma existente
    alarm.time = snoozeTime;
    alarm.repeatDays = []; // Eliminar repeticiones al posponer
    
    // Reordenar alarmas por hora
    this.alarms.sort((a, b) => a.time.localeCompare(b.time));
    this.saveAlarms();

    // Reprogramar la alarma con la nueva hora
    this.alarmBackground.scheduleAlarm(alarm).then((notificationId: number) => {
      alarm.notificationId = notificationId;
      this.saveAlarms();
    });

    this.showToast('Alarma pospuesta 10 minutos');
  }

  // MÉTODO NUEVO: startForegroundCheck
  private startForegroundCheck() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    // Limpiar el set de alarmas disparadas cada día a medianoche
    this.resetTriggeredAlarmsAtMidnight();

    this.checkIntervalId = setInterval(() => {
      const now = new Date();
      const currentH = now.getHours().toString().padStart(2, '0');
      const currentM = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentH}:${currentM}`;
      const currentDay = now.getDay();

      this.alarms.forEach(alarm => {
        // Clave única para esta alarma en este minuto
        const alarmKey = `${alarm.id}-${currentTime}`;
        
        // Evitar disparar la misma alarma múltiples veces en el mismo minuto
        if (this.triggeredAlarmsToday.has(alarmKey)) {
          return;
        }

        if (alarm.enabled && alarm.time === currentTime) {
          // Si tiene repetición, verificar el día
          if (alarm.repeatDays && alarm.repeatDays.length > 0) {
            if (alarm.repeatDays.includes(currentDay)) {
              this.triggeredAlarmsToday.add(alarmKey);
              this.triggerAlarm(alarm);
            }
          } else {
            // Si no tiene repetición, disparar solo una vez
            this.triggeredAlarmsToday.add(alarmKey);
            this.triggerAlarm(alarm);
          }
        }
      });
    }, 10000); // Verificar cada 10 segundos
  }

  // Resetear alarmas disparadas a medianoche
  private resetTriggeredAlarmsAtMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Próxima medianoche
    
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.triggeredAlarmsToday.clear();
      console.log('🔄 Alarmas disparadas hoy reseteadas');
      // Configurar el próximo reset
      this.resetTriggeredAlarmsAtMidnight();
    }, msUntilMidnight);
  }

  // MÉTODO NUEVO: checkMissedAlarms
  private async checkMissedAlarms(): Promise<void> {
    const now = new Date();

    const missedAlarms = this.alarms.filter(alarm => {
      if (!alarm.enabled) return false;

      // Verificar si la alarma debería haberse disparado en los últimos 5 minutos
      const [alarmHour, alarmMinute] = alarm.time.split(':').map(Number);
      const alarmDate = new Date();
      alarmDate.setHours(alarmHour, alarmMinute, 0, 0);

      const diffMinutes = (now.getTime() - alarmDate.getTime()) / (1000 * 60);

      // Si la alarma era para hace menos de 5 minutos y aún no se ha disparado
      return diffMinutes >= 0 && diffMinutes <= 5;
    });

    if (missedAlarms.length > 0) {
      // Mostrar la primera alarma perdida
      this.triggerAlarm(missedAlarms[0]);
    }
  }

  async playAlarmSound() {
    if (this.isPlayingSound) return;
    this.isPlayingSound = true;

    // Vibración fuerte para llamar la atención
    try {
      await Haptics.vibrate({ duration: 1000 });
      // Repetir vibración cada 2 segundos
      const vibrateInterval = setInterval(async () => {
        if (this.isPlayingSound) {
          await Haptics.vibrate({ duration: 500 });
        } else {
          clearInterval(vibrateInterval);
        }
      }, 2000);
    } catch (e) {
      console.log('Vibración no disponible');
    }

    // En Android nativo, el sonido lo maneja LocalNotifications
    // Solo reproducir audio si estamos en navegador
    if (this.audio) {
      try {
        // Crear AudioContext si no existe (necesario para algunos navegadores)
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Reanudar el contexto de audio si está suspendido
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        this.audio.volume = 1.0;
        await this.audio.play();
        console.log('Reproduciendo sonido de alarma');
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    }
  }

  stopAlarmSound() {
    this.isPlayingSound = false;
    
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    
    // Detener vibración (ya se detendrá automáticamente con isPlayingSound = false)
  }

  async showToast(message: string, duration: number = 2000) {
    const toast = await this.toastController.create({
      message: message,
      duration: duration,
      position: 'bottom',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }
}