import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminHome } from '../admin-home/admin-home';
import { AuthService } from '../../services/auth';
import { CaseService } from '../../services/case';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterLink, AdminHome],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  cases: any[] = [];
  loading = true;
  error: string | null = null;
  isAdmin = false;

  constructor(private auth: AuthService, private caseService: CaseService) {
    this.isAdmin = this.auth.isAdmin();
  }

  async ngOnInit() {
    if (this.isAdmin) {
      this.loading = false;
      return;
    }
    try {
      this.loading = true;
      const res = await firstValueFrom(this.caseService.getCases());
      this.cases = res || [];
    } catch {
      this.error = 'Failed to fetch cases.';
    } finally {
      this.loading = false;
    }
  }
}
