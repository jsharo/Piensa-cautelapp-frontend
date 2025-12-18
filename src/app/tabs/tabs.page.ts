import { Component, EnvironmentInjector, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, watchOutline, alarmOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  constructor() {
    addIcons({ homeOutline, watchOutline, alarmOutline });
  }
}
