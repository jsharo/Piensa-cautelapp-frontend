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
}

export interface SharedGroupMember {
  id: number;
  group_id: number;
  user_id: number;
  joined_at: string;
  user?: any;
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
}
