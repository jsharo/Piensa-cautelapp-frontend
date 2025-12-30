import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonToggle,
  IonButton, IonIcon, IonModal, IonDatetime,
  IonButtons, IonFab, IonFabButton,
  IonItemSliding, IonItemOptions, IonItemOption,
  AlertController, ToastController, PopoverController,
  IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add, addOutline, trashOutline, alarmOutline, timeOutline, closeOutline,
  checkmarkOutline, personCircle, medicalOutline, calendarOutline,
  notificationsOutline, checkmarkCircleOutline, filterOutline,
  volumeHighOutline, playOutline
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { AlarmService } from '../services/alarm.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';
// NUEVAS IMPORTACIONES:
import { AlarmBackgroundService } from '../services/alarm.background.service';
import { Inject } from '@angular/core';
import { App } from '@capacitor/app';

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
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonItem, IonLabel, IonToggle,
    IonButton, IonIcon, IonModal, IonDatetime,
    IonButtons, IonFab, IonFabButton,
    IonItemSliding, IonItemOptions, IonItemOption,
    IonInput
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab3Page implements OnInit, OnDestroy {
  alarms: Alarm[] = [];
  isModalOpen = false;
  newAlarmTime: string = new Date().toISOString();
  newAlarmLabel: string = '';
  newAlarmCategory: 'medicamento' | 'cita' | 'otro' = 'medicamento';
  newAlarmRepeatDays: number[] = [];
  newAlarmNotes: string = '';
  private intervalId: any;
  userProfileImage: string | null = null;
  selectedCategory: 'all' | 'medicamento' | 'cita' | 'otro' = 'all';
  editingAlarm: Alarm | null = null;
  private audio: HTMLAudioElement;

  daysOfWeek = [
    { label: 'D', value: 0 },
    { label: 'L', value: 1 },
    { label: 'M', value: 2 },
    { label: 'X', value: 3 },
    { label: 'J', value: 4 },
    { label: 'V', value: 5 },
    { label: 'S', value: 6 }
  ];

  // CONSTRUCTOR MODIFICADO:
  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private auth: AuthService,
    private alarmService: AlarmService,
    private popoverController: PopoverController,
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
      'volume-high-outline': volumeHighOutline,
      'play-outline': playOutline
    });
    this.audio = new Audio('assets/sounds/alarm_sound.mp3');
    this.audio.loop = true;
  }

  // ngOnInit MODIFICADO COMPLETAMENTE:
  async ngOnInit() {
    this.loadAlarms();
    this.loadUserProfileImage();
    
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
    
    // Escuchar cuando la app se vuelve activa
    App.addListener('appStateChange', async (state) => {
      if (state.isActive) {
        // Verificar si hay alarmas pendientes cuando la app se abre
        await this.checkMissedAlarms();
      }
    });
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
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

  openAddModal() {
    this.editingAlarm = null;
    this.newAlarmTime = new Date().toISOString();
    this.newAlarmLabel = '';
    this.newAlarmCategory = 'medicamento';
    this.newAlarmRepeatDays = [];
    this.newAlarmNotes = '';
    this.isModalOpen = true;
  }

  editAlarm(alarm: Alarm) {
    this.editingAlarm = alarm;
    const [hours, minutes] = alarm.time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    this.newAlarmTime = date.toISOString();
    this.newAlarmLabel = alarm.label;
    this.newAlarmCategory = alarm.category;
    this.newAlarmRepeatDays = [...alarm.repeatDays];
    this.newAlarmNotes = alarm.notes || '';
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingAlarm = null;
  }

  // MÉTODO saveAlarm COMPLETAMENTE MODIFICADO:
  async saveAlarm() {
    if (!this.newAlarmLabel.trim()) {
      this.showToast('Por favor ingresa un título');
      return;
    }

    const time = new Date(this.newAlarmTime);
    const alarmTime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    if (this.editingAlarm) {
      // Cancelar notificación existente
      if (this.editingAlarm.notificationId) {
        await this.alarmBackground.cancelAlarm(this.editingAlarm.id);
      }
      
      // Editar alarma existente
      this.editingAlarm.time = alarmTime;
      this.editingAlarm.label = this.newAlarmLabel;
      this.editingAlarm.category = this.newAlarmCategory;
      this.editingAlarm.repeatDays = [...this.newAlarmRepeatDays];
      this.editingAlarm.notes = this.newAlarmNotes;
      
      // Reprogramar si está habilitada
      if (this.editingAlarm.enabled) {
        try {
          const notificationId = await this.alarmBackground.scheduleAlarm(this.editingAlarm);
          this.editingAlarm.notificationId = notificationId;
        } catch (error) {
          console.error('Error reprogramando alarma:', error);
        }
      }
      
      this.showToast('Alarma actualizada');
    } else {
      // Crear nueva alarma
      const newAlarm: Alarm = {
        id: Date.now().toString(),
        time: alarmTime,
        label: this.newAlarmLabel,
        enabled: true,
        category: this.newAlarmCategory,
        repeatDays: [...this.newAlarmRepeatDays],
        notes: this.newAlarmNotes
      };
      
      // Programar notificación
      try {
        const notificationId = await this.alarmBackground.scheduleAlarm(newAlarm);
        newAlarm.notificationId = notificationId;
      } catch (error) {
        console.error('Error programando nueva alarma:', error);
      }
      
      this.alarms.push(newAlarm);
      this.showToast('Alarma creada');
    }

    this.alarms.sort((a, b) => a.time.localeCompare(b.time));
    this.saveAlarms();
    this.closeModal();
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
    if (isOpen) {
      this.newAlarmTime = new Date().toISOString();
      this.newAlarmLabel = '';
    }
  }

  // MÉTODO ELIMINAR O MANTENER (ya no se usa pero puedes dejarlo):
  addAlarm() {
    const time = new Date(this.newAlarmTime);
    const alarmTime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    const newAlarm: Alarm = {
      id: Date.now().toString(),
      time: alarmTime,
      label: this.newAlarmLabel || 'Alarma',
      enabled: true,
      category: 'otro',
      repeatDays: []
    };

    this.alarms.push(newAlarm);
    this.alarms.sort((a, b) => a.time.localeCompare(b.time));
    this.saveAlarms();
    this.setOpen(false);
    this.showToast('Alarma agregada');
  }

  // MÉTODO deleteAlarm MODIFICADO:
  async deleteAlarm(alarm: Alarm) {
    // Cancelar notificación si existe
    if (alarm.notificationId) {
      await this.alarmBackground.cancelAlarm(alarm.id);
    }
    
    this.alarms = this.alarms.filter(a => a.id !== alarm.id);
    this.saveAlarms();
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

  isDaySelected(day: number): boolean {
    return this.newAlarmRepeatDays.includes(day);
  }

  toggleDay(day: number) {
    const index = this.newAlarmRepeatDays.indexOf(day);
    if (index > -1) {
      this.newAlarmRepeatDays.splice(index, 1);
    } else {
      this.newAlarmRepeatDays.push(day);
    }
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

  async testAlarm() {
    this.playAlarmSound();
    const alert = await this.alertController.create({
      header: 'Prueba de Alarma',
      message: 'Esta es una prueba del sistema de sonido.',
      buttons: [{
        text: 'Detener',
        handler: () => {
          this.stopAlarmSound();
        }
      }],
      cssClass: 'premium-alert'
    });
    await alert.present();

    // Notify backend anyway to test connectivity
    this.alarmService.triggerAlarm({
      id: 'test',
      label: 'Prueba de Sistema',
      time: 'AHORA',
      category: 'otro', // Valor de ejemplo
      timestamp: new Date().toISOString() // Valor actual
    }).subscribe();
  }

  async triggerAlarm(alarm: Alarm) {
    // Desactivar alarma para que no se repita
    alarm.enabled = false;
    
    // Cancelar notificación
    if (alarm.notificationId) {
      await this.alarmBackground.cancelAlarm(alarm.id);
      alarm.notificationId = undefined;
    }
    
    this.saveAlarms();

    // Reproducir sonido
    this.playAlarmSound();

    // Call backend service
    this.alarmService.triggerAlarm({
      ...alarm,
      timestamp: new Date().toISOString()
    }).subscribe({
      next: () => console.log('Backend notified of alarm'),
      error: (err) => console.error('Error notifying backend', err)
    });

    // Mostrar alerta en la app
    const alert = await this.alertController.create({
      header: '¡Alarma!',
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
    // Crear una alarma temporal de 10 minutos
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    const snoozeTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const snoozeAlarm: Alarm = {
      id: Date.now().toString(),
      time: snoozeTime,
      label: `${alarm.label} (pospuesto)`,
      enabled: true,
      category: alarm.category,
      repeatDays: [],
      notes: alarm.notes
    };

    this.alarms.push(snoozeAlarm);
    this.alarms.sort((a, b) => a.time.localeCompare(b.time));
    this.saveAlarms();
    
    // Programar la alarma pospuesta
    this.alarmBackground.scheduleAlarm(snoozeAlarm).then((notificationId: number) => {
      snoozeAlarm.notificationId = notificationId;
      this.saveAlarms();
    });
    
    this.showToast('Alarma pospuesta 10 minutos');
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

  playAlarmSound() {
    this.audio.play().then(() => {
      console.log('Reproduciendo sonido de alarma');
    }).catch(err => {
      console.error('Error al reproducir el sonido:', err);
      // Reintentar si es necesario o mostrar mensaje
    });
  }

  stopAlarmSound() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      cssClass: 'custom-toast'
    });
    await toast.present();
  }
}