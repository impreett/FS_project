import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './config';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  constructor(private http: HttpClient) {}

  getPendingUsers() {
    return this.http.get<any[]>(`${API_BASE}/admin/pending-users`);
  }

  approveUser(id: string) {
    return this.http.put(`${API_BASE}/admin/approve-user/${id}`, null);
  }

  denyUser(id: string) {
    return this.http.delete(`${API_BASE}/admin/deny-user/${id}`);
  }

  disableUser(id: string) {
    return this.http.put(`${API_BASE}/admin/disable-user/${id}`, null);
  }

  getActiveUsers() {
    return this.http.get<any[]>(`${API_BASE}/admin/active-users`);
  }

  getAllCases() {
    return this.http.get<any[]>(`${API_BASE}/admin/all-cases`);
  }

  getPendingCases() {
    return this.http.get<any[]>(`${API_BASE}/admin/pending-cases`);
  }

  approveCase(id: string) {
    return this.http.put(`${API_BASE}/admin/approve-case/${id}`, null);
  }

  denyCase(id: string) {
    return this.http.delete(`${API_BASE}/admin/deny-case/${id}`);
  }

  getRemovedCases() {
    return this.http.get<any[]>(`${API_BASE}/admin/removed-cases`);
  }

  getPendingUpdates() {
    return this.http.get<any[]>(`${API_BASE}/admin/pending-updates`);
  }

  approveUpdate(id: string) {
    return this.http.put(`${API_BASE}/admin/approve-update/${id}`, null);
  }

  denyUpdate(id: string) {
    return this.http.delete(`${API_BASE}/admin/deny-update/${id}`);
  }

  searchCases(params: { field: string; query: string }) {
    return this.http.get<any[]>(`${API_BASE}/admin/search-cases`, { params });
  }

  getCaseById(id: string) {
    return this.http.get<any>(`${API_BASE}/admin/case/${id}`);
  }
}
