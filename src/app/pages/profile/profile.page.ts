import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController, ToastController } from '@ionic/angular';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss']
})
export class ProfilePage implements OnInit {
  user: User | null = null;
  loading = true;

  constructor(
    private auth: AuthService,
    private navCtrl: NavController,
    private toast: ToastController
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    // Try from local storage first for fast display
    this.user = this.auth.getCurrentUser();
    this.auth.me().subscribe({
      next: (u) => {
        this.user = u;
        this.loading = false;
      },
      error: async () => {
        this.loading = false;
        const t = await this.toast.create({
          message: 'No se pudo cargar el perfil',
          color: 'danger',
          duration: 2500,
          position: 'top',
        });
        t.present();
      },
    });
  }

  logout() {
    this.auth.logout();
    this.navCtrl.navigateRoot('/login', { replaceUrl: true });
  }
}
