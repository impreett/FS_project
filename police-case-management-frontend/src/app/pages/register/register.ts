import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Footer } from '../../components/footer/footer';
import { AppFeedbackService } from '../../services/app-feedback.service';
import { AuthService } from '../../services/auth';

type RegisterErrors = {
  fullname?: string;
  police_id?: string;
  contact?: string;
  email?: string;
  city?: string;
  password?: string;
  conf_password?: string;
  term_of_use?: string;
};

type RegisterFormData = {
  fullname: string;
  police_id: string;
  contact: string;
  email: string;
  city: string;
  password: string;
  conf_password: string;
  term_of_use: boolean;
};

const REGISTER_DRAFT_KEY = 'pcm_register_draft';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, Footer],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  registerForm = this.fb.nonNullable.group({
    fullname: '',
    police_id: '',
    contact: '',
    email: '',
    city: '',
    password: '',
    conf_password: '',
    term_of_use: false,
  });
  errors: RegisterErrors = {};
  loading = false;
  successMessage = '';
  private shouldPersistDraftOnDestroy = true;

  constructor(
    private auth: AuthService,
    private router: Router,
    private feedback: AppFeedbackService
  ) {}

  ngOnInit() {
    this.restoreDraft();
  }

  ngOnDestroy() {
    if (this.shouldPersistDraftOnDestroy) {
      this.persistDraft();
    }
  }

  validate() {
    const {
      fullname,
      police_id,
      contact,
      email,
      city,
      password,
      conf_password,
      term_of_use,
    } = this.registerForm.getRawValue();
    const tempErrors: RegisterErrors = {};
    tempErrors.fullname = fullname ? '' : 'Please enter your full name.';
    if (fullname && !/^[a-zA-Z\s]+$/.test(fullname)) {
      tempErrors.fullname = 'Only letters and spaces are allowed.';
    }
    tempErrors.police_id = police_id.length === 8 ? '' : 'Police ID must be exactly 8 characters.';
    tempErrors.contact =
      contact.length === 10 && /^\d+$/.test(contact)
        ? ''
        : 'Contact number must be exactly 10 digits.';
    tempErrors.email = /\S+@\S+\.\S+/.test(email) ? '' : 'Please enter a valid email address.';
    tempErrors.city = city ? '' : 'Please select your city/district.';
    tempErrors.password = password.length === 8 ? '' : 'Password must be exactly 8 characters long.';
    tempErrors.conf_password = conf_password === password ? '' : 'Passwords do not match.';
    tempErrors.term_of_use = term_of_use ? '' : 'Please accept Terms & Conditions to continue.';

    this.errors = tempErrors;
    return Object.values(tempErrors).every((x) => x === '');
  }

  onChangeName(value: string) {
    this.registerForm.controls.fullname.setValue(value.toUpperCase());
  }

  closeSuccessMessage() {
    this.successMessage = '';
    this.shouldPersistDraftOnDestroy = false;
    this.clearDraft();
    this.router.navigate(['/login']);
  }

  async onSubmit() {
    if (!this.validate()) return;
    this.loading = true;
    try {
      const { fullname, police_id, contact, email, city, password } = this.registerForm.getRawValue();
      const newUser = { fullname, police_id, contact, email, city, password };
      await firstValueFrom(this.auth.register(newUser));
      this.shouldPersistDraftOnDestroy = false;
      this.clearDraft();
      this.successMessage = 'Registration successful. Awaiting admin approval.';
    } catch (err: any) {
      this.feedback.showError(err?.error?.msg || 'Error registering.');
    } finally {
      this.loading = false;
    }
  }

  private persistDraft() {
    try {
      sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(this.registerForm.getRawValue()));
    } catch {
      // Ignore storage errors.
    }
  }

  private clearDraft() {
    try {
      sessionStorage.removeItem(REGISTER_DRAFT_KEY);
    } catch {
      // Ignore storage errors.
    }
  }

  private restoreDraft() {
    try {
      const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<RegisterFormData>;
      this.registerForm.reset({
        fullname: typeof parsed.fullname === 'string' ? parsed.fullname : '',
        police_id: typeof parsed.police_id === 'string' ? parsed.police_id : '',
        contact: typeof parsed.contact === 'string' ? parsed.contact : '',
        email: typeof parsed.email === 'string' ? parsed.email : '',
        city: typeof parsed.city === 'string' ? parsed.city : '',
        password: typeof parsed.password === 'string' ? parsed.password : '',
        conf_password: typeof parsed.conf_password === 'string' ? parsed.conf_password : '',
        term_of_use: Boolean(parsed.term_of_use),
      });
    } catch {
      this.clearDraft();
    }
  }
}
