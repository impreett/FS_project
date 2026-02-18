import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from './config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'token';

  constructor(private http: HttpClient) {}

  login(payload: { email: string; password: string }) {
    return this.http.post<{ token: string }>(`${API_BASE}/auth/login`, payload);
  }

  register(payload: {
    fullname: string;
    police_id: string;
    contact: string;
    email: string;
    city: string;
    password: string;
  }) {
    return this.http.post<{ msg: string }>(`${API_BASE}/auth/register`, payload);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  getUser(): any | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded?.user ?? decoded ?? null;
    } catch {
      return null;
    }
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  isAdmin() {
    return this.getUser()?.isAdmin === true;
  }
}
