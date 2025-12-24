import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonToggle,
  IonButton, IonIcon, IonModal, IonDatetime,
  IonFab, IonFabButton, IonButtons, IonNote,
  IonItemSliding, IonItemOptions, IonItemOption,
  AlertController, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline, alarmOutline, timeOutline, closeOutline, checkmarkOutline } from 'ionicons/icons';

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonToggle,
    IonButton, IonIcon, IonModal, IonDatetime,
    IonFab, IonFabButton, IonButtons, IonNote,
    IonItemSliding, IonItemOptions, IonItemOption
  ],
})
export class Tab3Page implements OnInit, OnDestroy {
  alarms: Alarm[] = [];
  isModalOpen = false;
  newAlarmTime: string = new Date().toISOString();
  newAlarmLabel: string = '';
  private intervalId: any;

  constructor(
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ addOutline, trashOutline, alarmOutline, timeOutline, closeOutline, checkmarkOutline });
  }

  ngOnInit() {
    this.loadAlarms();
    this.startAlarmCheck();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
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
      enabled: true
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

  toggleAlarm(alarm: Alarm) {
    alarm.enabled = !alarm.enabled;
    this.saveAlarms();
  }

  private startAlarmCheck() {
    this.intervalId = setInterval(() => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const triggeredAlarms = this.alarms.filter(a => a.enabled && a.time === currentTime);

      triggeredAlarms.forEach(alarm => {
        this.triggerAlarm(alarm);
      });
    }, 10000); // Check every 10 seconds
  }

  async triggerAlarm(alarm: Alarm) {
    // Disable to avoid repeated triggers in the same minute
    alarm.enabled = false;
    this.saveAlarms();

    const alert = await this.alertController.create({
      header: '¡Alarma!',
      subHeader: alarm.label,
      message: `Son las ${alarm.time}`,
      buttons: ['OK'],
      cssClass: 'premium-alert'
    });

    await alert.present();
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
