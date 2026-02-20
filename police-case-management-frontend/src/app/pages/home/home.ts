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
  sortOrder: 'latest' | 'oldest' = 'latest';
  private readonly monthYearFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  });

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
