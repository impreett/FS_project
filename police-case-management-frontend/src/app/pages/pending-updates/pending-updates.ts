import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

@Component({
  selector: 'app-pending-updates',
  imports: [CommonModule],
  templateUrl: './pending-updates.html',
  styleUrl: './pending-updates.css',
})
export class PendingUpdates implements OnInit {
  updates: any[] = [];
  originals: Record<string, any> = {};
  loading = true;
  successMessage = '';
  infoMessage = '';

  constructor(private adminService: AdminService, private caseService: CaseService) {}

  async ngOnInit() {
    await this.fetchPendingUpdates();
  }

  async fetchPendingUpdates() {
    try {
      const res = await firstValueFrom(this.adminService.getPendingUpdates());
      this.updates = res || [];

      const ids = Array.from(
        new Set((this.updates || []).map((u: any) => u.originalCaseId).filter(Boolean))
      );
      if (ids.length) {
        const pairs = await Promise.all(
          ids.map(async (id) => {
            try {
              const r = await firstValueFrom(this.caseService.getCaseById(id));
              return [id, r];
            } catch {
              return [id, null];
            }
          })
        );
        this.originals = Object.fromEntries(pairs);
      } else {
        this.originals = {};
      }
    } catch {
      alert('Failed to fetch pending updates.');
    } finally {
      this.loading = false;
    }
  }

  async handleApprove(updateId: string) {
    try {
      await firstValueFrom(this.adminService.approveUpdate(updateId));
      this.successMessage = 'Update approved and applied successfully!';
      this.infoMessage = '';
      this.updates = this.updates.filter((u) => u._id !== updateId);
      window.scrollTo(0, 0);
    } catch {
      alert('Error approving update.');
    }
  }

  async handleDeny(updateId: string) {
    try {
      await firstValueFrom(this.adminService.denyUpdate(updateId));
      this.infoMessage = 'Update request cancelled successfully!';
      this.successMessage = '';
      this.updates = this.updates.filter((u) => u._id !== updateId);
      window.scrollTo(0, 0);
    } catch {
      alert('Error denying update.');
    }
  }
}
