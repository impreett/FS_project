import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from './config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly sessionTokenKey = 'session_token';

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
    return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.sessionTokenKey);
  }

  setToken(token: string, rememberMe = true) {
    if (rememberMe) {
      localStorage.setItem(this.tokenKey, token);
      sessionStorage.removeItem(this.sessionTokenKey);
      return;
    }
    sessionStorage.setItem(this.sessionTokenKey, token);
    localStorage.removeItem(this.tokenKey);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.sessionTokenKey);
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
