import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from './config';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(private http: HttpClient) {}

  submitPublicReport(payload: { email: string; reportText: string }) {
    return this.http.post(`${API_BASE}/reports/public`, payload);
  }

  submitReport(payload: { email: string; reportText: string }) {
    return this.http.post(`${API_BASE}/reports`, payload);
  }

  getReports() {
    return this.http.get<any[]>(`${API_BASE}/reports`);
  }

  deleteReport(id: string) {
    return this.http.delete(`${API_BASE}/reports/${id}`);
  }
}
