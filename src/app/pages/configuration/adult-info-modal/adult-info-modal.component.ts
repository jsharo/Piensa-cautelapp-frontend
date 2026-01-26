import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonDatetime, IonPopover, ModalController } from '@ionic/angular/standalone';
import { LucideAngularModule, User, Calendar, MapPin, X, Check } from 'lucide-angular';

export interface AdultInfo {
  nombre: string;
  fecha_nacimiento?: string;
  direccion?: string;
}

@Component({
  selector: 'app-adult-info-modal',
  templateUrl: './adult-info-modal.component.html',
  styleUrls: ['./adult-info-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonDatetime,
    IonPopover,
    LucideAngularModule
  ]
})
export class AdultInfoModalComponent {
  @Input() nombre: string = '';
  @Input() fecha_nacimiento: string = '';
  @Input() direccion: string = '';
  @Input() isEditMode: boolean = false;
  @Input() title: string = 'Información del Adulto Mayor';

  @ViewChild('fechaPopover') fechaPopover!: IonPopover;

  // Iconos de Lucide
  readonly UserIcon = User;
  readonly CalendarIcon = Calendar;
  readonly MapPinIcon = MapPin;
  readonly XIcon = X;
  readonly CheckIcon = Check;

  constructor(private modalController: ModalController) {}

  dismiss() {
    console.log('❌ Modal cerrado sin guardar');
    this.modalController.dismiss();
  }

  save() {
    if (!this.nombre.trim()) {
      return;
    }

    const dataToReturn = {
      nombre: this.nombre.trim(),
      fecha_nacimiento: this.fecha_nacimiento || undefined,
      direccion: this.direccion?.trim() || undefined
    };
    
    console.log('✅ Modal guardado con datos:', JSON.stringify(dataToReturn, null, 2));

    this.modalController.dismiss(dataToReturn);
  }

  /**
   * Retorna la fecha máxima permitida (hoy)
   * Se usa para evitar que se seleccionen fechas futuras
   */
  getMaxDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Abre el popover de fecha
   */
  async abrirFechaPicker(event: Event) {
    if (this.fechaPopover) {
      this.fechaPopover.event = event;
      await this.fechaPopover.present();
    }
  }

  /**
   * Confirma la selección de fecha
   */
  confirmarFecha() {
    if (this.fechaPopover) {
      this.fechaPopover.dismiss();
    }
  }

  /**
   * Formatea la fecha en formato legible
   */
  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    try {
      const date = new Date(fecha);
      const opciones: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      };
      return date.toLocaleDateString('es-ES', opciones);
    } catch (e) {
      return fecha;
    }
  }
}