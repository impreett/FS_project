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
  updateFilter: 'all' | 'recent' | 'updated' = 'all';
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

  setUpdateFilter(filter: 'all' | 'recent' | 'updated') {
    this.updateFilter = filter;
  }

  private getUpdatedTimestamp(caseItem: any) {
    const raw = caseItem?.updated_on || caseItem?.updatedAt;
    const time = new Date(raw || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  private isUpdatedCase(caseItem: any) {
    return this.getUpdatedTimestamp(caseItem) > 0;
  }

  private isRecentlyUpdatedCase(caseItem: any) {
    const updatedAt = this.getUpdatedTimestamp(caseItem);
    if (!updatedAt) return false;
    return Date.now() - updatedAt <= 24 * 60 * 60 * 1000;
  }

  get filteredCases() {
    if (this.updateFilter === 'recent') {
      return this.cases.filter((caseItem) => this.isRecentlyUpdatedCase(caseItem));
    }
    if (this.updateFilter === 'updated') {
      return this.cases.filter((caseItem) => this.isUpdatedCase(caseItem));
    }
    return this.cases;
  }

  get sortedCases() {
    return [...this.filteredCases].sort((a, b) => {
      const aTime =
        this.updateFilter === 'all'
          ? new Date(a?.case_date || 0).getTime()
          : this.getUpdatedTimestamp(a);
      const bTime =
        this.updateFilter === 'all'
          ? new Date(b?.case_date || 0).getTime()
          : this.getUpdatedTimestamp(b);
      return this.sortOrder === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }

  get groupedCases() {
    const groups: Array<{ label: string; items: any[] }> = [];
    for (const caseItem of this.sortedCases) {
      const dateSource =
        this.updateFilter === 'all'
          ? caseItem?.case_date
          : caseItem?.updated_on || caseItem?.updatedAt;
      const dateObj = new Date(dateSource || 0);
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
