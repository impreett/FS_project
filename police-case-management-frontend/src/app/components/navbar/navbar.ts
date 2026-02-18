import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  encapsulation: ViewEncapsulation.None,
})
export class Navbar {
  constructor(public auth: AuthService) {}

  get user() {
    return this.auth.getUser();
  }

  get isAdmin() {
    return this.auth.isAdmin();
  }
}
