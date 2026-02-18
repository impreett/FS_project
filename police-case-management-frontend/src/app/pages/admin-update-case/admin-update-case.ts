import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-admin-update-case',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-update-case.html',
  styleUrl: './admin-update-case.css',
})
export class AdminUpdateCase implements OnInit {
  cases: any[] = [];
  loading = true;

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.adminService.getAllCases());
      this.cases = res || [];
    } catch {
      alert('Failed to fetch cases.');
    } finally {
      this.loading = false;
    }
  }
}
