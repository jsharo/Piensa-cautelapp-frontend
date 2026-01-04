import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkCircle, timeOutline, textOutline, 
  pricetagOutline, medicalOutline, calendarOutline, notificationsOutline,
  repeatOutline, documentTextOutline, eyeOutline, pencilOutline, alarmOutline
} from 'ionicons/icons';

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  category: 'medicamento' | 'cita' | 'otro';
  repeatDays: number[];
  notes?: string;
  notificationId?: number;
}

@Component({
  selector: 'app-alarm-modal',
  templateUrl: './alarm-modal.component.html',
  styleUrls: ['./alarm-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AlarmModalComponent implements OnInit {
  @Input() editingAlarm: Alarm | null = null;

  newAlarmTime: string = new Date().toISOString();
  newAlarmLabel: string = '';
  newAlarmCategory: 'medicamento' | 'cita' | 'otro' = 'medicamento';
  newAlarmRepeatDays: number[] = [];
  newAlarmNotes: string = '';

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
    private modalController: ModalController,
    private toastController: ToastController
  ) {
    addIcons({
      'close-outline': closeOutline,
      'checkmark-circle': checkmarkCircle,
      'time-outline': timeOutline,
      'text-outline': textOutline,
      'pricetag-outline': pricetagOutline,
      'medical-outline': medicalOutline,
      'calendar-outline': calendarOutline,
      'notifications-outline': notificationsOutline,
      'repeat-outline': repeatOutline,
      'document-text-outline': documentTextOutline,
      'eye-outline': eyeOutline,
      'pencil-outline': pencilOutline,
      'alarm-outline': alarmOutline
    });
  }

  ngOnInit() {
    if (this.editingAlarm) {
      this.newAlarmTime = this.editingAlarm.time;
      this.newAlarmLabel = this.editingAlarm.label;
      this.newAlarmCategory = this.editingAlarm.category;
      this.newAlarmRepeatDays = [...this.editingAlarm.repeatDays];
      this.newAlarmNotes = this.editingAlarm.notes || '';
    }
  }

  formatTime(isoString: string): string {
    if (!isoString) return '00:00';
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getCategoryIcon(category: 'medicamento' | 'cita' | 'otro'): string {
    const icons = {
      'medicamento': 'medical-outline',
      'cita': 'calendar-outline',
      'otro': 'notifications-outline'
    };
    return icons[category];
  }

  getDayAbbr(dayIndex: number): string {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return days[dayIndex];
  }

  isDaySelected(day: number): boolean {
    return this.newAlarmRepeatDays.includes(day);
  }

  toggleDay(day: number): void {
    const index = this.newAlarmRepeatDays.indexOf(day);
    if (index > -1) {
      this.newAlarmRepeatDays.splice(index, 1);
    } else {
      this.newAlarmRepeatDays.push(day);
    }
  }

  async saveAlarm(): Promise<void> {
    if (!this.newAlarmLabel.trim()) {
      await this.showToast('Por favor ingresa un título para la alarma', 'warning');
      return;
    }

    const alarmData: Partial<Alarm> = {
      time: this.newAlarmTime,
      label: this.newAlarmLabel,
      category: this.newAlarmCategory,
      repeatDays: this.newAlarmRepeatDays,
      notes: this.newAlarmNotes,
      enabled: true
    };

    if (this.editingAlarm) {
      alarmData.id = this.editingAlarm.id;
    }

    this.modalController.dismiss(alarmData, 'save');
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2000,
      position: 'top'
    });
    await toast.present();
  }

  dismiss() {
    this.modalController.dismiss(null, 'cancel');
  }
}
