import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonLabel, IonInput, ModalController } from '@ionic/angular/standalone';
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
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    LucideAngularModule
  ]
})
export class AdultInfoModalComponent {
  @Input() nombre: string = '';
  @Input() fecha_nacimiento: string = '';
  @Input() direccion: string = '';
  @Input() isEditMode: boolean = false;
  @Input() title: string = 'Información del Adulto Mayor';

  // Iconos de Lucide
  readonly UserIcon = User;
  readonly CalendarIcon = Calendar;
  readonly MapPinIcon = MapPin;
  readonly XIcon = X;
  readonly CheckIcon = Check;

  constructor(private modalController: ModalController) {}

  dismiss() {
    this.modalController.dismiss();
  }

  save() {
    if (!this.nombre.trim()) {
      return;
    }

    const dataToReturn = {
      nombre: this.nombre,
      fecha_nacimiento: this.fecha_nacimiento || undefined,
      direccion: this.direccion || undefined
    };
    
    console.log('📝 Datos del modal:', JSON.stringify(dataToReturn, null, 2));

    this.modalController.dismiss(dataToReturn);
  }
}