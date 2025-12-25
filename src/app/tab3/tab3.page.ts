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
  notificationsOutline, checkmarkCircleOutline, filterOutline 
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { ProfileMenuComponent } from '../tab1/profile-menu/profile-menu.component';

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  category: 'medicamento' | 'cita' | 'otro';
  repeatDays: number[]; // 0-6 (domingo-sábado)
  notes?: string;
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

  daysOfWeek = [
    { label: 'D', value: 0 },
    { label: 'L', value: 1 },
    { label: 'M', value: 2 },
    { label: 'X', value: 3 },
    { label: 'J', value: 4 },
    { label: 'V', value: 5 },
    { label: 'S', value: 6 }
  ];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private auth: AuthService,
    private popoverController: PopoverController
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
      'filter-outline': filterOutline
    });
  }

  ngOnInit() {
    this.loadAlarms();
    this.startAlarmCheck();
    this.loadUserProfileImage();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
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

  loadAlarms() {
    const saved = localStorage.getItem('cautela_alarms');
    if (saved) {
      this.alarms = JSON.parse(saved);
    }
  }

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

  saveAlarm() {
    if (!this.newAlarmLabel.trim()) {
      this.showToast('Por favor ingresa un título');
      return;
    }

    const time = new Date(this.newAlarmTime);
    const alarmTime = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    if (this.editingAlarm) {
      // Editar alarma existente
      this.editingAlarm.time = alarmTime;
      this.editingAlarm.label = this.newAlarmLabel;
      this.editingAlarm.category = this.newAlarmCategory;
      this.editingAlarm.repeatDays = [...this.newAlarmRepeatDays];
      this.editingAlarm.notes = this.newAlarmNotes;
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

  deleteAlarm(alarm: Alarm) {
    this.alarms = this.alarms.filter(a => a.id !== alarm.id);
    this.saveAlarms();
    this.showToast('Alarma eliminada');
  }

  toggleAlarm(alarm: Alarm, event?: any) {
    if (event) {
      event.stopPropagation();
    }
    alarm.enabled = !alarm.enabled;
    this.saveAlarms();
    this.showToast(alarm.enabled ? 'Alarma activada' : 'Alarma desactivada');
  }

  // Funciones de filtrado
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

  // Funciones auxiliares
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

  private startAlarmCheck() {
    this.intervalId = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDay = now.getDay();

      const triggeredAlarms = this.alarms.filter(a => {
        if (!a.enabled || a.time !== currentTime) return false;
        
        // Si no tiene días de repetición, se dispara siempre
        if (!a.repeatDays || a.repeatDays.length === 0) return true;
        
        // Si tiene días de repetición, verificar si hoy está incluido
        return a.repeatDays.includes(currentDay);
      });

      triggeredAlarms.forEach(alarm => {
        this.triggerAlarm(alarm);
      });
    }, 30000); // Check every 30 seconds
  }

  async triggerAlarm(alarm: Alarm) {
    const alert = await this.alertController.create({
      header: '¡Alarma!',
      subHeader: alarm.label,
      message: alarm.notes ? `${this.formatTime(alarm.time)}\n${alarm.notes}` : `Son las ${this.formatTime(alarm.time)}`,
      buttons: [
        {
          text: 'Posponer 10 min',
          role: 'cancel',
          handler: () => {
            this.snoozeAlarm(alarm);
          }
        },
        {
          text: 'OK',
          role: 'confirm'
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
    this.showToast('Alarma pospuesta 10 minutos');
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
