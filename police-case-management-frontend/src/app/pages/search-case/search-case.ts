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
}
