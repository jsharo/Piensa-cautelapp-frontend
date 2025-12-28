import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface AlarmData {
  id: string;
  label: string;
  time: string;
  category: string;
  userId?: string;
  deviceId?: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlarmService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private deviceId: string;

  constructor(private http: HttpClient) {
    this.deviceId = this.getOrCreateDeviceId();
  }

  triggerAlarm(alarmData: AlarmData): Observable<any> {
    const data: AlarmData = {
      ...alarmData,
      deviceId: this.deviceId,
      timestamp: new Date().toISOString()
    };
    
    return this.http.post(`${this.apiUrl}/alarms/trigger`, data);
  }
  
  logAlarmSnooze(alarmId: string, minutes: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/alarms/snooze`, {
      alarmId,
      minutes,
      deviceId: this.deviceId,
      timestamp: new Date().toISOString()
    });
  }
  
  logAlarmDismiss(alarmId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/alarms/dismiss`, {
      alarmId,
      deviceId: this.deviceId,
      timestamp: new Date().toISOString()
    });
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('cautela_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('cautela_device_id', deviceId);
    }
    return deviceId;
  }
}