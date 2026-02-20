import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
  encapsulation: ViewEncapsulation.None,
})
export class Header implements OnInit, OnDestroy {
  private readonly onWheelListener = (event: WheelEvent) => {
    const isHeaderHidden = document.body.classList.contains('header-hidden');

    if (event.deltaY > 0 && !isHeaderHidden) {
      // First down scroll hides header/navbar before page scroll starts.
      event.preventDefault();
      this.setHeaderHidden(true);
      return;
    }

    if (event.deltaY < 0 && isHeaderHidden) {
      // First up scroll shows header/navbar before page scroll starts.
      event.preventDefault();
      this.setHeaderHidden(false);
    }
  };

  constructor(private router: Router, public auth: AuthService) {}

  ngOnInit() {
    this.setHeaderHidden(false);
    window.addEventListener('wheel', this.onWheelListener, { passive: false });
  }

  ngOnDestroy() {
    window.removeEventListener('wheel', this.onWheelListener);
    document.body.classList.remove('header-hidden');
  }

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

  private setHeaderHidden(isHidden: boolean) {
    document.body.classList.toggle('header-hidden', isHidden);
  }
}
