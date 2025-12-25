import { Component } from '@angular/core';
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
  nombre: string = '';
  fechaNacimiento: string = '';
  direccion: string = '';
  isEditMode: boolean = false;
  title: string = 'Información del Adulto Mayor';

  constructor(private modalController: ModalController) {}

  // Método para configurar datos iniciales en modo edición
  setData(data: { nombre: string; fecha_nacimiento: string; direccion: string }) {
    this.nombre = data.nombre;
    // Convertir DateTime a formato date input (YYYY-MM-DD)
    if (data.fecha_nacimiento) {
      this.fechaNacimiento = new Date(data.fecha_nacimiento).toISOString().split('T')[0];
    }
    this.direccion = data.direccion;
    this.isEditMode = true;
    this.title = 'Editar Adulto Mayor';
  }

  dismiss() {
    this.modalController.dismiss();
  }

  save() {
    if (!this.nombre.trim()) {
      return;
    }

    this.modalController.dismiss({
      nombre: this.nombre,
      fecha_nacimiento: this.fechaNacimiento || undefined,
      direccion: this.direccion || undefined
    });
  }
}
