import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-pending-cases',
  imports: [CommonModule, RouterLink],
  templateUrl: './pending-cases.html',
  styleUrl: './pending-cases.css',
})
export class PendingCases implements OnInit {
  cases: any[] = [];
  loading = true;
  successMessage = '';

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.adminService.getPendingCases());
      this.cases = res || [];
    } catch (err) {
      console.error(err);
      alert('Failed to fetch pending cases.');
    } finally {
      this.loading = false;
    }
  }

  async handleApprove(caseId: string) {
    try {
      await firstValueFrom(this.adminService.approveCase(caseId));
      this.successMessage = 'Case approved!';
      this.cases = this.cases.filter((c) => c._id !== caseId);
      window.scrollTo(0, 0);
    } catch {
      alert('Error approving case.');
    }
  }

  async handleDeny(caseId: string) {
    if (!window.confirm('Are you sure you want to deny this case?')) return;
    try {
      await firstValueFrom(this.adminService.denyCase(caseId));
      this.cases = this.cases.filter((c) => c._id !== caseId);
    } catch {
      alert('Error denying case.');
    }
  }
}
