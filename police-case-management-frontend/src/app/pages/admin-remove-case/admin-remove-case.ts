import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

@Component({
  selector: 'app-admin-remove-case',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-remove-case.html',
  styleUrl: './admin-remove-case.css',
})
export class AdminRemoveCase implements OnInit {
  cases: any[] = [];
  loading = true;
  message = '';

  constructor(private adminService: AdminService, private caseService: CaseService) {}

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.adminService.getAllCases());
      this.cases = res || [];
    } catch {
      this.message = 'Failed to fetch cases.';
    } finally {
      this.loading = false;
    }
  }

  async handleRemove(caseId: string) {
    if (!window.confirm('Are you sure you want to remove this case?')) return;
    try {
      await firstValueFrom(this.caseService.removeCase(caseId));
      this.message = 'Case removed successfully!';
      this.cases = this.cases.filter((c) => c._id !== caseId);
      window.scrollTo(0, 0);
    } catch {
      this.message = 'Error removing case.';
    }
  }
}
