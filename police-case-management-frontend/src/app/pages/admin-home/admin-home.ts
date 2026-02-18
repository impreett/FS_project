import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-admin-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.css',
})
export class AdminHome implements OnInit {
  cases: any[] = [];
  loading = true;

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.adminService.getAllCases());
      this.cases = res || [];
    } catch {
      alert('Failed to fetch cases. You may not be an admin.');
    } finally {
      this.loading = false;
    }
  }
}
