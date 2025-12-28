import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AlarmService {
    private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

    constructor(private http: HttpClient) { }

    triggerAlarm(alarmData: { id: string; label: string; time: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/alarms/trigger`, alarmData);
    }
}
