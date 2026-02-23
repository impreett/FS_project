import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { AdminService } from '../../services/admin';
import { AppFeedbackService } from '../../services/app-feedback.service';
import { CaseService } from '../../services/case';

type PersonDisplay = {
  name: string;
  age: string;
};

@Component({
  selector: 'app-case-details',
  imports: [CommonModule],
  templateUrl: './case-details.html',
  styleUrl: './case-details.css',
})
export class CaseDetails implements OnInit, OnDestroy {
  caseItem: any = null;
  loading = true;
  error: string | null = null;
  user: any = null;
  actionMessage = '';
  actionMessageType: 'success' | 'danger' | 'info' = 'info';
  private actionMessageTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly actionMessageDurationMs = 7000;
  id = '';
  navigationSource = '';
  victimPeople: PersonDisplay[] = [];
  suspectPeople: PersonDisplay[] = [];
  guiltyPeople: PersonDisplay[] = [];
  changesDone: string[] = [];
  private pendingDecisionCompleted = false;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private auth: AuthService,
    private adminService: AdminService,
    private caseService: CaseService,
    private feedback: AppFeedbackService
  ) {}

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.navigationSource = this.route.snapshot.queryParamMap.get('from') || '';
    this.user = this.auth.getUser();

    try {
      let res;
      try {
        res = await firstValueFrom(this.adminService.getCaseById(this.id));
      } catch {
        res = await firstValueFrom(this.caseService.getCaseById(this.id));
      }
      this.caseItem = res;
      this.victimPeople = this.parsePeople(this.caseItem?.victim);
      this.suspectPeople = this.parsePeople(this.caseItem?.suspects);
      this.guiltyPeople = this.parsePeople(this.caseItem?.guilty_name);
      this.changesDone = this.parseChangesDone(this.caseItem?.changes_done);
    } catch {
      this.error = 'Could not fetch case details.';
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy() {
    this.clearActionMessageTimer();
  }

  closeActionMessage() {
    this.clearActionMessageTimer();
    this.actionMessage = '';
  }

  private normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private parsePeople(value: unknown): PersonDisplay[] {
    if (Array.isArray(value)) {
      return value
        .map((entry: any) => {
          if (!entry || typeof entry !== 'object') return null;
          const name = this.normalizeText(entry.name);
          if (!name) return null;
          const ageValue =
            entry.age === null || entry.age === undefined || entry.age === ''
              ? 'Unidentified'
              : String(entry.age);
          return { name, age: ageValue };
        })
        .filter((entry): entry is PersonDisplay => !!entry);
    }

    const text = this.normalizeText(value);
    if (!text || text.toUpperCase() === 'N/A') return [];

    return text
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const withAge = part.match(/^Name:\s*(.+?)\s+Age:\s*([^,]+)$/i);
        if (withAge) {
          const parsedAge = this.normalizeText(withAge[2]);
          return {
            name: this.normalizeText(withAge[1]),
            age: parsedAge || 'Unidentified',
          };
        }

        const nameOnly = part.match(/^Name:\s*(.+)$/i);
        if (nameOnly) {
          return {
            name: this.normalizeText(nameOnly[1]),
            age: 'Unidentified',
          };
        }

        return {
          name: this.normalizeText(part),
          age: 'Unidentified',
        };
      })
      .filter((entry) => !!entry.name);
  }

  private parseChangesDone(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeText(item)).filter(Boolean);
    }
    const text = this.normalizeText(value);
    return text ? [text] : [];
  }

  get peopleNameColumnWidth(): string {
    const people = [...this.victimPeople, ...this.suspectPeople, ...this.guiltyPeople];
    const longest = people.reduce((max, person) => {
      const displayLength = `Name: ${person.name}`.length;
      return displayLength > max ? displayLength : max;
    }, 10);
    return `${longest}ch`;
  }

  formatPeopleDisplay(people: PersonDisplay[], emptyText: string): string {
    if (!people.length) return emptyText;
    return people
      .map((person) => `Name: ${person.name}   Age: ${person.age}`)
      .join(', ');
  }

  async handleApprove() {
    try {
      await firstValueFrom(this.adminService.approveCase(this.id));
      this.showActionMessage('Case approved!', 'success');
      if (this.caseItem) {
        this.caseItem = { ...this.caseItem, isApproved: true };
      }
      this.pendingDecisionCompleted = true;
      window.scrollTo(0, 0);
    } catch {
      this.showActionMessage('Error approving case.', 'danger');
      window.scrollTo(0, 0);
    }
  }

  async handleDeny() {
    const confirmed = await this.feedback.confirm({
      title: 'Deny case?',
      message: 'Are you sure you want to deny this case?',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      confirmTone: 'reject',
      cancelTone: 'check',
    });
    if (!confirmed) return;
    try {
      await firstValueFrom(this.adminService.denyCase(this.id));
      this.pendingDecisionCompleted = true;
      this.showActionMessage('Case denied!', 'success');
      window.scrollTo(0, 0);
    } catch {
      this.showActionMessage('Error denying case.', 'danger');
      window.scrollTo(0, 0);
    }
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl('/');
  }

  private showActionMessage(message: string, type: 'success' | 'danger' | 'info' = 'info') {
    this.clearActionMessageTimer();
    this.actionMessageType = type;
    this.actionMessage = message;
    this.actionMessageTimer = setTimeout(() => {
      this.actionMessage = '';
      this.actionMessageTimer = null;
    }, this.actionMessageDurationMs);
  }

  private clearActionMessageTimer() {
    if (this.actionMessageTimer) {
      clearTimeout(this.actionMessageTimer);
      this.actionMessageTimer = null;
    }
  }

  get showPendingDecisionActions(): boolean {
    return (
      Boolean(this.user?.isAdmin) &&
      this.navigationSource === 'admin-pending-cases' &&
      Boolean(this.caseItem) &&
      !Boolean(this.caseItem?.isApproved) &&
      !this.pendingDecisionCompleted
    );
  }

  get showRemoveAction(): boolean {
    return (
      Boolean(this.user?.isAdmin) &&
      this.navigationSource === 'admin-remove-case' &&
      Boolean(this.caseItem) &&
      !Boolean(this.caseItem?.is_removed)
    );
  }

  get showRestoreAction(): boolean {
    return (
      Boolean(this.user?.isAdmin) &&
      this.navigationSource === 'admin-removed-cases' &&
      Boolean(this.caseItem) &&
      Boolean(this.caseItem?.is_removed)
    );
  }

  async handleRemoveFromCaseDetails() {
    const confirmed = await this.feedback.confirm({
      title: 'Remove case?',
      message: 'Are you sure you want to remove',
      subject: String(this.caseItem?.case_title || 'this case'),
      messageSuffix: '?',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      confirmTone: 'approve',
      cancelTone: 'check',
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.caseService.removeCase(this.id));
      this.showActionMessage('Case removed successfully!', 'success');
      if (this.caseItem) {
        this.caseItem = { ...this.caseItem, is_removed: true };
      }
      window.scrollTo(0, 0);
    } catch {
      this.showActionMessage('Error removing case.', 'danger');
      window.scrollTo(0, 0);
    }
  }

  async handleRestoreFromCaseDetails() {
    try {
      await firstValueFrom(this.caseService.restoreCase(this.id));
      this.showActionMessage('Case restored successfully!', 'success');
      if (this.caseItem) {
        this.caseItem = { ...this.caseItem, is_removed: false };
      }
      window.scrollTo(0, 0);
    } catch {
      this.showActionMessage('Error restoring case.', 'danger');
      window.scrollTo(0, 0);
    }
  }
}
