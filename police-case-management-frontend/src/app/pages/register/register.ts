import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Footer } from '../../components/footer/footer';
import { AuthService } from '../../services/auth';

type RegisterErrors = {
  fullname?: string;
  police_id?: string;
  contact?: string;
  email?: string;
  city?: string;
  password?: string;
  conf_password?: string;
};

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink, Footer],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  formData = {
    fullname: '',
    police_id: '',
    contact: '',
    email: '',
    city: '',
    password: '',
    conf_password: '',
  };
  errors: RegisterErrors = {};
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  validate() {
    const {
      fullname,
      police_id,
      contact,
      email,
      city,
      password,
      conf_password,
    } = this.formData;
    const tempErrors: RegisterErrors = {};
    tempErrors.fullname = fullname ? '' : 'Please enter your full name.';
    if (fullname && !/^[a-zA-Z\s]+$/.test(fullname)) {
      tempErrors.fullname = 'Only alphabets are allowed.';
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

    this.errors = tempErrors;
    return Object.values(tempErrors).every((x) => x === '');
  }

  onChangeName(value: string) {
    this.formData.fullname = value.toUpperCase();
  }

  async onSubmit() {
    if (!this.validate()) return;
    this.loading = true;
    try {
      const { fullname, police_id, contact, email, city, password } = this.formData;
      const newUser = { fullname, police_id, contact, email, city, password };
      const res = await firstValueFrom(this.auth.register(newUser));
      alert(res?.msg || 'Registration successful.');
      this.router.navigate(['/login']);
    } catch (err: any) {
      alert(err?.error?.msg || 'Error registering');
    } finally {
      this.loading = false;
    }
  }
}
