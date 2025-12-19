import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page {

  constructor() {}

}
