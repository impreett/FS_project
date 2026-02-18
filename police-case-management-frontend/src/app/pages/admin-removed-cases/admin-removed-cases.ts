import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

@Component({
  selector: 'app-admin-removed-cases',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-removed-cases.html',
  styleUrl: './admin-removed-cases.css',
})
export class AdminRemovedCases implements OnInit {
  cases: any[] = [];
  loading = true;
  message = '';

  constructor(private adminService: AdminService, private caseService: CaseService) {}

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.adminService.getRemovedCases());
      this.cases = res || [];
    } catch {
      this.message = 'Failed to fetch removed cases.';
    } finally {
      this.loading = false;
    }
  }

  async handleRestore(caseId: string) {
    if (!window.confirm('Are you sure you want to restore this case?')) return;
    try {
      const res: any = await firstValueFrom(this.caseService.restoreCase(caseId));
      this.message = res?.msg || 'Case restored successfully';
      this.cases = this.cases.filter((c) => c._id !== caseId);
    } catch {
      this.message = 'Error restoring case.';
    }
  }
}
