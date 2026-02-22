import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';

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
  selector: 'app-pending-cases',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pending-cases.html',
  styleUrl: './pending-cases.css',
})
export class PendingCases implements OnInit, OnDestroy {
  cases: any[] = [];
  loading = true;
  successMessage = '';
  private successMessageTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly successMessageDurationMs = 7000;
  caseConfirm:
    | {
        id: string;
        title: string;
        action: 'approve' | 'deny';
      }
    | null = null;
  isSubmittingAction = false;
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

  ngOnDestroy() {
    this.clearSuccessMessageTimer();
  }

  closeSuccessMessage() {
    this.clearSuccessMessageTimer();
    this.successMessage = '';
  }

  handleApprove(caseItem: any) {
    this.openCaseConfirm(caseItem, 'approve');
  }

  handleDeny(caseItem: any) {
    this.openCaseConfirm(caseItem, 'deny');
  }

  private openCaseConfirm(caseItem: any, action: 'approve' | 'deny') {
    const id = String(caseItem?._id ?? '');
    if (!id) return;
    this.caseConfirm = {
      id,
      title: String(caseItem?.case_title ?? 'this case'),
      action,
    };
  }

  closeCaseConfirm() {
    if (this.isSubmittingAction) return;
    this.caseConfirm = null;
  }

  async confirmCaseAction() {
    if (!this.caseConfirm || this.isSubmittingAction) return;
    this.isSubmittingAction = true;
    const { id, action } = this.caseConfirm;
    try {
      if (action === 'approve') {
        await firstValueFrom(this.adminService.approveCase(id));
        this.showSuccessMessage('Case approved!');
        this.cases = this.cases.filter((c) => c._id !== id);
        window.scrollTo(0, 0);
      } else {
        await firstValueFrom(this.adminService.denyCase(id));
        this.cases = this.cases.filter((c) => c._id !== id);
      }
    } catch {
      alert(action === 'approve' ? 'Error approving case.' : 'Error denying case.');
    } finally {
      this.isSubmittingAction = false;
      this.caseConfirm = null;
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
        return this.normalize(this.getWholeCaseSearchText(caseItem)).includes(normalizedQuery);
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

  private getWholeCaseSearchText(caseItem: any): string {
    const parts: string[] = [];
    const walk = (value: unknown) => {
      if (value === null || value === undefined) return;

      if (value instanceof Date) {
        parts.push(value.toISOString(), this.formatDateForSearch(value));
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }

      if (typeof value === 'object') {
        Object.values(value as Record<string, unknown>).forEach(walk);
        return;
      }

      if (typeof value === 'boolean') {
        parts.push(value ? 'true approved yes 1' : 'false pending no 0');
        return;
      }

      const text = String(value).trim();
      if (!text) return;

      parts.push(text);

      const parsedDate = new Date(text);
      if (!Number.isNaN(parsedDate.getTime())) {
        parts.push(this.formatDateForSearch(parsedDate), this.getDateValue(text));
      }
    };

    walk(caseItem);
    return parts.join(' ');
  }

  private formatDateForSearch(dateObj: Date): string {
    const localDay = String(dateObj.getDate()).padStart(2, '0');
    const localMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
    const localYear = dateObj.getFullYear();
    const utcDay = String(dateObj.getUTCDate()).padStart(2, '0');
    const utcMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const utcYear = dateObj.getUTCFullYear();
    return `${localDay}-${localMonth}-${localYear} ${localYear}-${localMonth}-${localDay} ${utcDay}-${utcMonth}-${utcYear} ${utcYear}-${utcMonth}-${utcDay}`;
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

  private showSuccessMessage(message: string) {
    this.clearSuccessMessageTimer();
    this.successMessage = message;
    this.successMessageTimer = setTimeout(() => {
      this.successMessage = '';
      this.successMessageTimer = null;
    }, this.successMessageDurationMs);
  }

  private clearSuccessMessageTimer() {
    if (this.successMessageTimer) {
      clearTimeout(this.successMessageTimer);
      this.successMessageTimer = null;
    }
  }
}
