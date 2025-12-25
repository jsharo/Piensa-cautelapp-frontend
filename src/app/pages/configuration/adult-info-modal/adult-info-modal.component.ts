import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem, IonLabel, IonInput, ModalController } from '@ionic/angular/standalone';

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
    IonInput
  ]
})
export class AdultInfoModalComponent {
  @Input() nombre: string = '';
  @Input() fechaNacimiento: string = '';
  @Input() direccion: string = '';
  @Input() isEditMode: boolean = false;
  @Input() title: string = 'Información del Adulto Mayor';

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
      fechaNacimiento: this.fechaNacimiento || undefined,
      direccion: this.direccion || undefined
    };
    
    console.log('📝 Datos del modal:', JSON.stringify(dataToReturn, null, 2));

    this.modalController.dismiss(dataToReturn);
  }
}