import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab3Page {
  constructor() {}
}
