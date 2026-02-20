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
  sortOrder: 'latest' | 'oldest' = 'latest';
  private readonly monthYearFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  });

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

  setSortOrder(order: 'latest' | 'oldest') {
    this.sortOrder = order;
  }

  get sortedCases() {
    return [...this.cases].sort((a, b) => {
      const aTime = new Date(a?.case_date || 0).getTime();
      const bTime = new Date(b?.case_date || 0).getTime();
      return this.sortOrder === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }

  get groupedCases() {
    const groups: Array<{ label: string; items: any[] }> = [];
    for (const caseItem of this.sortedCases) {
      const dateObj = new Date(caseItem?.case_date || 0);
      const label = Number.isNaN(dateObj.getTime())
        ? 'Unknown Date'
        : this.monthYearFormatter.format(dateObj);

      const currentGroup = groups[groups.length - 1];
      if (!currentGroup || currentGroup.label !== label) {
        groups.push({ label, items: [caseItem] });
      } else {
        currentGroup.items.push(caseItem);
      }
    }
    return groups;
  }
}
