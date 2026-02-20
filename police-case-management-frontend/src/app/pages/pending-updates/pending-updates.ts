import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

@Component({
  selector: 'app-pending-updates',
  imports: [CommonModule, RouterLink],
  templateUrl: './pending-updates.html',
  styleUrl: './pending-updates.css',
})
export class PendingUpdates implements OnInit {
  updates: any[] = [];
  originals: Record<string, any> = {};
  loading = true;
  successMessage = '';
  infoMessage = '';
  sortOrder: 'latest' | 'oldest' = 'latest';
  private readonly monthYearFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  });

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

  setSortOrder(order: 'latest' | 'oldest') {
    this.sortOrder = order;
  }

  get sortedUpdates() {
    return [...this.updates].sort((a, b) => {
      const aTime = new Date(a?.requestedAt || 0).getTime();
      const bTime = new Date(b?.requestedAt || 0).getTime();
      return this.sortOrder === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }

  get groupedUpdates() {
    const groups: Array<{ label: string; items: any[] }> = [];
    for (const updateItem of this.sortedUpdates) {
      const dateObj = new Date(updateItem?.requestedAt || 0);
      const label = Number.isNaN(dateObj.getTime())
        ? 'Unknown Date'
        : this.monthYearFormatter.format(dateObj);

      const currentGroup = groups[groups.length - 1];
      if (!currentGroup || currentGroup.label !== label) {
        groups.push({ label, items: [updateItem] });
      } else {
        currentGroup.items.push(updateItem);
      }
    }
    return groups;
  }
}
