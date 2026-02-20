import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

type SearchField =
  | 'for-all'
  | 'case_title'
  | 'case_type'
  | 'case_description'
  | 'suspects'
  | 'victim'
  | 'guilty_name'
  | 'case_date'
  | 'case_handler'
  | 'status'
  | 'isApproved';

@Component({
  selector: 'app-admin-remove-case',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-remove-case.html',
  styleUrl: './admin-remove-case.css',
})
export class AdminRemoveCase implements OnInit {
  cases: any[] = [];
  loading = true;
  message = '';
  sortOrder: 'latest' | 'oldest' = 'latest';
  searchField: SearchField = 'for-all';
  searchValue = '';
  caseTypes: string[] = [
    'Homicide (Murder)',
    'Manslaughter',
    'Rape / Sexual Assault',
    'Kidnapping / Abduction',
    'Aggravated Assault',
    'Simple Assault / Battery',
    'Robbery',
    'Burglary / House Breaking',
    'Theft (Larceny)',
    'Motor Vehicle Theft',
    'Vandalism / Criminal Damage',
    'Extortion / Blackmail',
    'Cybercrime / Hacking',
    'Fraud / Cheating',
    'Forgery / Counterfeiting',
    'Embezzlement / Breach of Trust',
    'Money Laundering',
    'Drug Offense (NDPS)',
    'Smuggling / Contraband',
    'Illegal Weapons',
    'Illegal Gambling',
    'Public Order / Rioting',
    'Domestic Violence',
    'Missing Person Report',
    'Traffic Accident (Non-Fatal)',
  ];
  todayStr = new Date().toISOString().split('T')[0];
  private readonly searchableFields: SearchField[] = [
    'case_title',
    'case_type',
    'case_description',
    'suspects',
    'victim',
    'guilty_name',
    'case_date',
    'case_handler',
    'status',
    'isApproved',
  ];
  private readonly monthYearFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  });

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

  setSortOrder(order: 'latest' | 'oldest') {
    this.sortOrder = order;
  }

  onSearchFieldChange(value: string) {
    this.searchField = (value as SearchField) || 'for-all';
    this.searchValue = '';
  }

  onSearchValueChange(value: string) {
    this.searchValue = value || '';
  }

  get officers() {
    const names = this.cases
      .map((caseItem) => String(caseItem?.case_handler ?? '').trim())
      .filter((name) => !!name);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }

  get filteredCases() {
    const query = this.searchValue;
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) return this.cases;

    return this.cases.filter((caseItem) => {
      if (this.searchField === 'for-all') {
        return this.searchableFields.some((field) =>
          this.normalize(this.getFieldValue(caseItem, field)).includes(normalizedQuery)
        );
      }

      if (
        this.searchField === 'case_type' ||
        this.searchField === 'case_handler' ||
        this.searchField === 'status'
      ) {
        return this.normalize(caseItem?.[this.searchField]) === normalizedQuery;
      }

      if (this.searchField === 'case_date') {
        return this.getDateValue(caseItem?.case_date) === query;
      }

      if (this.searchField === 'isApproved') {
        if (query !== '1' && query !== '0') return false;
        return Boolean(caseItem?.isApproved) === (query === '1');
      }

      return this.normalize(this.getFieldValue(caseItem, this.searchField)).includes(normalizedQuery);
    });
  }

  get sortedCases() {
    return [...this.filteredCases].sort((a, b) => {
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

  private getFieldValue(caseItem: any, field: SearchField): string {
    switch (field) {
      case 'suspects':
        return this.peopleToText(caseItem?.suspects);
      case 'victim':
        return this.peopleToText(caseItem?.victim);
      case 'guilty_name':
        return this.peopleToText(caseItem?.guilty_name);
      case 'case_date':
        return this.getDateSearchText(caseItem?.case_date);
      case 'isApproved':
        return caseItem?.isApproved ? 'approved' : 'pending';
      default:
        return String(caseItem?.[field] ?? '');
    }
  }

  private peopleToText(value: unknown): string {
    if (Array.isArray(value)) {
      return value
        .map((person) => this.personToText(person))
        .filter((text) => !!text)
        .join(' ');
    }
    return this.personToText(value);
  }

  private personToText(value: unknown): string {
    if (value && typeof value === 'object') {
      const person = value as { name?: unknown; age?: unknown };
      return `${String(person.name ?? '')} ${String(person.age ?? '')}`.trim();
    }
    return String(value ?? '');
  }

  private getDateSearchText(value: unknown): string {
    const raw = String(value ?? '');
    const dateObj = new Date(raw);
    if (Number.isNaN(dateObj.getTime())) return raw;

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${raw} ${day}-${month}-${year}`;
  }

  private getDateValue(value: unknown): string {
    const raw = String(value ?? '');
    const rawDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (rawDateMatch?.[1]) return rawDateMatch[1];

    const dateObj = new Date(raw);
    if (Number.isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalize(value: unknown): string {
    return String(value ?? '').toLowerCase().trim();
  }
}
