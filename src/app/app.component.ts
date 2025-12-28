import { Component, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppComponent {
  constructor(private platform: Platform) {
    this.initializeApp();
  }

  async initializeApp() {
    this.platform.ready().then(async () => {
      // Configurar Status Bar
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#1E3A8A' }); // dark-blue del header
      } catch (e) {
        console.log('Status bar not available:', e);
      }
    });
  }
}

@NgModule({
  imports: [
    // ...otros módulos...
    FormsModule
  ],
  // ...código existente...
})
export class Tab2PageModule {}
