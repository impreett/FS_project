import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
  encapsulation: ViewEncapsulation.None,
})
export class Header {
  constructor(private router: Router, public auth: AuthService) {}

  get user() {
    return this.auth.getUser();
  }

  get userName() {
    return this.user?.fullname || 'User';
  }

  logout() {
    this.auth.clearToken();
    this.router.navigate(['/login']);
  }
}
