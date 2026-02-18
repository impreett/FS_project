import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './config';

@Injectable({
  providedIn: 'root',
})
export class CaseService {
  constructor(private http: HttpClient) {}

  getCases(params?: { field?: string; query?: string }) {
    return this.http.get<any[]>(`${API_BASE}/cases`, { params });
  }

  getAssignedCases() {
    return this.http.get<any[]>(`${API_BASE}/cases/me/assigned`);
  }

  getCaseById(id: string) {
    return this.http.get<any>(`${API_BASE}/cases/${id}`);
  }

  addCase(payload: any) {
    return this.http.post(`${API_BASE}/cases`, payload);
  }

  requestUpdate(payload: any) {
    return this.http.post(`${API_BASE}/cases/request-update`, payload);
  }

  updateCase(id: string, payload: any) {
    return this.http.put(`${API_BASE}/cases/${id}`, payload);
  }

  removeCase(id: string) {
    return this.http.delete(`${API_BASE}/cases/${id}`);
  }

  restoreCase(id: string) {
    return this.http.put(`${API_BASE}/cases/${id}/restore`, {});
  }

  getOfficers() {
    return this.http.get<any[]>(`${API_BASE}/users/officers`);
  }
}
