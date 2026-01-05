import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  LucideAngularModule, 
  Clock, 
  Type, 
  Tag, 
  Repeat, 
  FileText, 
  Eye, 
  Pencil, 
  AlarmClock,
  Pill,
  Calendar,
  Bell,
  CheckCircle,
  X
} from 'lucide-angular';

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
  imports: [CommonModule, FormsModule, LucideAngularModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AlarmModalComponent implements OnInit {
  @Input() editingAlarm: Alarm | null = null;

  newAlarmTime: string = ''; // Se inicializa en ngOnInit
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

  // Iconos de Lucide
  readonly Clock = Clock;
  readonly Type = Type;
  readonly Tag = Tag;
  readonly Repeat = Repeat;
  readonly FileText = FileText;
  readonly Eye = Eye;
  readonly Pencil = Pencil;
  readonly AlarmClock = AlarmClock;
  readonly Pill = Pill;
  readonly Calendar = Calendar;
  readonly Bell = Bell;
  readonly CheckCircle = CheckCircle;
  readonly X = X;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    if (this.editingAlarm) {
      // Modo edición: convertir HH:mm a ISO string para ion-datetime
      const [hours, minutes] = this.editingAlarm.time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      this.newAlarmTime = date.toISOString();
      
      this.newAlarmLabel = this.editingAlarm.label;
      this.newAlarmCategory = this.editingAlarm.category;
      this.newAlarmRepeatDays = [...this.editingAlarm.repeatDays];
      this.newAlarmNotes = this.editingAlarm.notes || '';
    } else {
      // Modo creación: establecer hora 5 minutos en el futuro
      const date = new Date();
      date.setMinutes(date.getMinutes() + 5);
      date.setSeconds(0, 0);
      this.newAlarmTime = date.toISOString();
    }
  }

  formatTime(isoString: string): string {
    if (!isoString) {
      console.warn('⚠️ formatTime: isoString vacío');
      return '00:00';
    }
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        console.error('❌ formatTime: fecha inválida', isoString);
        return '00:00';
      }
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error('❌ formatTime error:', error);
      return '00:00';
    }
  }

  getCategoryIcon(category: 'medicamento' | 'cita' | 'otro'): any {
    const icons = {
      'medicamento': Pill,
      'cita': Calendar,
      'otro': Bell
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

  onLabelChange(event: any): void {
    // Forzar la actualización del valor
    const value = event.target?.value || event.detail?.value || '';
    this.newAlarmLabel = value;
    console.log('📝 Título actualizado:', this.newAlarmLabel);
  }

  onTimeChange(event: any): void {
    // Forzar la actualización de la hora
    const value = event.detail?.value || event.target?.value;
    if (value) {
      this.newAlarmTime = value;
      console.log('🕐 Hora actualizada:', {
        raw: this.newAlarmTime,
        formateada: this.formatTime(this.newAlarmTime)
      });
    }
  }

  async saveAlarm(): Promise<void> {
    // Debug: ver el valor actual
    console.log('🔍 Verificando título:', {
      raw: this.newAlarmLabel,
      tipo: typeof this.newAlarmLabel,
      longitud: this.newAlarmLabel?.length,
      trimmed: this.newAlarmLabel?.trim(),
      longitudTrimmed: this.newAlarmLabel?.trim().length
    });

    // Validación del título
    if (!this.newAlarmLabel || !this.newAlarmLabel.trim()) {
      console.warn('⚠️ Título vacío o solo espacios');
      await this.showToast('⚠️ Por favor ingresa un título para la alarma', 'warning');
      return;
    }

    // Validación de la hora
    if (!this.newAlarmTime) {
      await this.showToast('⚠️ Por favor selecciona una hora', 'warning');
      return;
    }

    // Logs detallados de todos los campos
    console.log('📝 === GUARDANDO ALARMA ===');
    console.log('🕐 Hora ISO:', this.newAlarmTime);
    console.log('🕐 Hora formateada:', this.formatTime(this.newAlarmTime));
    console.log('📌 Título:', this.newAlarmLabel);
    console.log('🏷️ Categoría:', this.newAlarmCategory);
    console.log('📅 Días de repetición:', this.newAlarmRepeatDays);
    console.log('📝 Notas:', this.newAlarmNotes || '(vacío)');
    console.log('🔧 Modo:', this.editingAlarm ? 'EDICIÓN' : 'CREACIÓN');

    const alarmData: Partial<Alarm> = {
      time: this.newAlarmTime,
      label: this.newAlarmLabel.trim(),
      category: this.newAlarmCategory,
      repeatDays: [...this.newAlarmRepeatDays], // Copia el array
      notes: this.newAlarmNotes.trim() || undefined,
      enabled: true
    };

    if (this.editingAlarm) {
      alarmData.id = this.editingAlarm.id;
    }

    console.log('✅ Datos finales a guardar:', alarmData);

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
