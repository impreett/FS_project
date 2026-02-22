import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Footer } from '../../components/footer/footer';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Footer],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnDestroy {
  private readonly fb = inject(FormBuilder);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  loading = false;
  submitted = false;
  errorMessage = '';
  private errorMessageTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private auth: AuthService, private router: Router) {}

  get emailControl() {
    return this.loginForm.controls.email;
  }

  get passwordControl() {
    return this.loginForm.controls.password;
  }

  get emailError() {
    if (!this.shouldShowFieldError(this.emailControl)) return '';
    if (this.emailControl.hasError('required')) return 'Please enter your email.';
    if (this.emailControl.hasError('email')) return 'Enter a valid email address.';
    return '';
  }

  get passwordError() {
    if (!this.shouldShowFieldError(this.passwordControl)) return '';
    if (this.passwordControl.hasError('required')) return 'Please enter your password.';
    return '';
  }

  private shouldShowFieldError(control: { invalid: boolean; touched: boolean }) {
    return control.invalid && (control.touched || this.submitted);
  }

  private isApprovalError(err: any) {
    if (err?.status === 403) return true;
    const msg = (err?.error?.msg || err?.error?.message || '').toString().toLowerCase();
    return (
      msg.includes('under review') ||
      msg.includes('not approved') ||
      msg.includes('disabled') ||
      msg.includes('approval')
    );
  }

  private showErrorMessage(message: string) {
    if (this.errorMessageTimer) {
      clearTimeout(this.errorMessageTimer);
      this.errorMessageTimer = null;
    }
    this.errorMessage = message;
    this.errorMessageTimer = setTimeout(() => {
      this.errorMessage = '';
      this.errorMessageTimer = null;
    }, 7000);
  }

  closeErrorMessage() {
    if (this.errorMessageTimer) {
      clearTimeout(this.errorMessageTimer);
      this.errorMessageTimer = null;
    }
    this.errorMessage = '';
  }

  async onSubmit() {
    this.submitted = true;
    this.loginForm.markAllAsTouched();
    this.closeErrorMessage();
    if (this.loginForm.invalid || this.loading) return;

    this.loading = true;
    try {
      const res = await firstValueFrom(this.auth.login(this.loginForm.getRawValue()));
      const token = res?.token;
      if (!token) {
        this.showErrorMessage('Invalid email or password.');
        return;
      }
      this.auth.setToken(token);
      this.router.navigate(['/']);
    } catch (err: any) {
      this.showErrorMessage(
        this.isApprovalError(err)
          ? 'Your credentials are under review. If you were an approved user, your ID is disabled. For further information, please submit a report.'
          : 'Invalid email or password.'
      );
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.errorMessageTimer) {
      clearTimeout(this.errorMessageTimer);
    }
  }
}
