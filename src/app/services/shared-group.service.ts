import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SharedGroup {
  id: number;
  name?: string;
  code: string;
  created_by: number;
  created_at: string;
  members: SharedGroupMember[];
  sharedDevices?: SharedGroupDevice[];
}

export interface SharedGroupMember {
  id: number;
  group_id: number;
  user_id: number;
  invited_by?: number;
  joined_at: string;
  is_creator?: boolean;
  user?: any;
}

export interface SharedGroupDevice {
  id: number;
  group_id: number;
  adulto_id: number;
  shared_by: number;
  shared_at: string;
  adulto?: any;
  groupName?: string;
  groupCode?: string;
}

@Injectable({ providedIn: 'root' })
export class SharedGroupService {
  private apiUrl = `${environment.apiUrl}/shared-group`;

  constructor(private http: HttpClient) {}

  createGroup(userId: number, name?: string): Observable<SharedGroup> {
    return this.http.post<SharedGroup>(`${this.apiUrl}/create`, { userId, name });
  }

  joinGroup(userId: number, code: string): Observable<SharedGroup> {
    return this.http.post<SharedGroup>(`${this.apiUrl}/join`, { userId, code });
  }

  getMyGroups(userId: number): Observable<SharedGroup[]> {
    return this.http.get<SharedGroup[]>(`${this.apiUrl}/my/${userId}`);
  }

  getGroupByCode(code: string): Observable<SharedGroup> {
    return this.http.get<SharedGroup>(`${this.apiUrl}/code/${code}`);
  }

  leaveGroup(userId: number, groupId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/leave`, { userId, groupId });
  }

  // ========== MÉTODOS PARA DISPOSITIVOS COMPARTIDOS ==========

  shareDevice(groupId: number, adultoId: number, userId: number): Observable<SharedGroupDevice> {
    return this.http.post<SharedGroupDevice>(`${this.apiUrl}/share-device`, { groupId, adultoId, userId });
  }

  unshareDevice(groupId: number, adultoId: number, userId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/unshare-device`, { groupId, adultoId, userId });
  }

  getGroupDevices(groupId: number): Observable<SharedGroupDevice[]> {
    return this.http.get<SharedGroupDevice[]>(`${this.apiUrl}/devices/${groupId}`);
  }

  getMySharedDevices(userId: number): Observable<SharedGroupDevice[]> {
    return this.http.get<SharedGroupDevice[]>(`${this.apiUrl}/my-shared-devices/${userId}`);
  }

  // ========== GESTIÓN DE MIEMBROS ==========

  removeMember(requesterId: number, groupId: number, memberIdToRemove: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/remove-member`, { requesterId, groupId, memberIdToRemove });
  }

  getGroupMembers(groupId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/members/${groupId}`);
  }
}
