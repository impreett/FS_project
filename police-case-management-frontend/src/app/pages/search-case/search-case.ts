import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

@Component({
  selector: 'app-search-case',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './search-case.html',
  styleUrl: './search-case.css',
})
export class SearchCase implements OnInit {
  cases: any[] = [];
  loading = false;
  searchField = 'for-all';
  searchQuery = '';
  officers: string[] = [];
  user: any = null;
  todayStr = new Date().toISOString().split('T')[0];

  constructor(
    private auth: AuthService,
    private adminService: AdminService,
    private caseService: CaseService
  ) {}

  async ngOnInit() {
    this.user = this.auth.getUser();
    try {
      const res = await firstValueFrom(this.caseService.getOfficers());
      this.officers = (res || []).map((o: any) => o.fullname || o);
    } catch {
      console.error('Failed to fetch officers');
    }
    await this.fetchCases();
  }

  async fetchCases() {
    this.loading = true;
    try {
      const params = { field: this.searchField, query: this.searchQuery };
      const res = this.user?.isAdmin
        ? await firstValueFrom(this.adminService.searchCases(params))
        : await firstValueFrom(this.caseService.getCases(params));
      this.cases = res || [];
    } catch (err) {
      console.error('Error fetching cases:', err);
      this.cases = [];
    } finally {
      this.loading = false;
    }
  }

  onSearchFieldChange(value: string) {
    this.searchField = value;
    this.searchQuery = '';
    this.fetchCases();
  }

  onSearchQueryChange(value: string) {
    this.searchQuery = value;
    this.fetchCases();
  }

  highlightText(value: unknown, fallback = ''): string {
    const plainText = this.toDisplayText(value).trim() || fallback;
    return this.applyHighlight(plainText);
  }

  displayDate(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return 'N/A';

    const dateObj = new Date(raw);
    if (Number.isNaN(dateObj.getTime())) return raw;

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  }

  displayApproval(value: unknown): string {
    return value ? 'Approved' : 'Pending';
  }

  private applyHighlight(text: string): string {
    const safeText = this.escapeHtml(text);
    const term = this.getHighlightTerm();
    if (!term) return safeText;

    const safeTermRegex = this.escapeRegExp(term);
    if (!safeTermRegex) return safeText;

    const regex = new RegExp(`(${safeTermRegex})`, 'gi');
    return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  private getHighlightTerm(): string {
    const query = String(this.searchQuery ?? '').trim();
    if (!query) return '';

    if (this.searchField === 'isApproved') {
      if (query === '1') return 'Approved';
      if (query === '0') return 'Pending';
    }

    if (this.searchField === 'case_date') {
      const match = query.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    }

    return query;
  }

  private toDisplayText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value
        .map((item) => this.toDisplayText(item))
        .filter((item) => !!item)
        .join(', ');
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const maybeName = String(obj['name'] ?? '').trim();
      const maybeAge = String(obj['age'] ?? '').trim();
      if (maybeName || maybeAge) {
        const parts = [];
        if (maybeName) parts.push(`Name: ${maybeName}`);
        if (maybeAge) parts.push(`Age: ${maybeAge}`);
        return parts.join(' ');
      }
      return Object.values(obj)
        .map((item) => this.toDisplayText(item))
        .filter((item) => !!item)
        .join(' ');
    }

    return String(value);
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
