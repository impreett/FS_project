import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Footer } from '../../components/footer/footer';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink, Footer],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  formData = { email: '', password: '' };
  errors = { email: '', password: '' };
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  validate() {
    const next = { email: '', password: '' };
    if (!this.formData.email) {
      next.email = 'Please enter your Email';
    } else {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(this.formData.email)) {
        next.email = 'Enter a valid Email address';
      }
    }
    if (!this.formData.password) {
      next.password = 'Please enter your password';
    }
    this.errors = next;
    return !next.email && !next.password;
  }

  async onSubmit() {
    if (!this.validate()) return;
    this.loading = true;
    try {
      const res = await firstValueFrom(this.auth.login(this.formData));
      const token = res?.token;
      if (!token) {
        throw new Error('Missing token');
      }
      this.auth.setToken(token);
      this.router.navigate(['/']);
    } catch (err: any) {
      const status = err?.status;
      if (status === 403) {
        alert(
          'Your credentials are under review. If you were an approved user, your ID is disabled. For further information, please submit a report.'
        );
        return;
      }
      const msg = (err?.error?.msg || err?.error?.message || '').toString().toLowerCase();
      if (
        msg.includes('under review') ||
        msg.includes('not approved') ||
        msg.includes('disabled') ||
        msg.includes('approval')
      ) {
        alert(
          'Your credentials are under review. If you were an approved user, your ID is disabled. For further information, please submit a report.'
        );
      } else {
        alert('Invalid Email or Password');
      }
    } finally {
      this.loading = false;
    }
  }
}
