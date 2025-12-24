import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon, PopoverController, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personOutline, personCircle, locationOutline, settingsOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ProfileModalComponent } from '../profile-modal/profile-modal.component';

@Component({
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class ProfileMenuComponent implements OnInit {
  @Input() userEmail: string = '';
  @Input() userName: string = '';
  profileImage: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private popoverController: PopoverController,
    private modalController: ModalController
  ) {
    addIcons({ personCircle, personOutline, locationOutline, logOutOutline, settingsOutline });
  }

  ngOnInit() {
    this.loadUserImage();
  }

  loadUserImage() {
    const user = this.authService.getCurrentUser();
    if (user && (user as any).imagen) {
      this.profileImage = (user as any).imagen;
    }
  }

  async goToProfile() {
    try {
      await this.popoverController.dismiss();
      
      const modal = await this.modalController.create({
        component: ProfileModalComponent,
        cssClass: 'profile-modal',
        backdropDismiss: true,
        showBackdrop: true
      });

      await modal.present();
    } catch (error) {
      console.error('Error opening profile modal:', error);
    }
  }

  async goToConfiguration() {
    try {
      await this.popoverController.dismiss();
      this.router.navigate(['/configuration']);
    } catch (error) {
      console.error('Error navigating to configuration:', error);
    }
  }

  async logout() {
    try {
      this.authService.logout();
      await this.popoverController.dismiss();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }
}
