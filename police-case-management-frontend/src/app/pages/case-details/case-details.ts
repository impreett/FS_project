import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { AdminService } from '../../services/admin';
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
export class CaseDetails implements OnInit {
  caseItem: any = null;
  loading = true;
  error: string | null = null;
  user: any = null;
  successMessage = '';
  id = '';
  victimPeople: PersonDisplay[] = [];
  suspectPeople: PersonDisplay[] = [];
  guiltyPeople: PersonDisplay[] = [];

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private adminService: AdminService,
    private caseService: CaseService
  ) {}

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
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
    } catch {
      this.error = 'Could not fetch case details.';
    } finally {
      this.loading = false;
    }
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
          const ageValue = entry.age === null || entry.age === undefined || entry.age === '' ? 'N/A' : String(entry.age);
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
        const withAge = part.match(/^Name:\s*(.+?)\s+Age:\s*(\d{1,3})$/i);
        if (withAge) {
          return {
            name: this.normalizeText(withAge[1]),
            age: this.normalizeText(withAge[2]) || 'N/A',
          };
        }

        const nameOnly = part.match(/^Name:\s*(.+)$/i);
        if (nameOnly) {
          return {
            name: this.normalizeText(nameOnly[1]),
            age: 'N/A',
          };
        }

        return {
          name: this.normalizeText(part),
          age: 'N/A',
        };
      })
      .filter((entry) => !!entry.name);
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
      this.successMessage = 'Case approved!';
      if (this.caseItem) {
        this.caseItem = { ...this.caseItem, isApproved: true };
      }
      window.scrollTo(0, 0);
    } catch {
      alert('Error approving case.');
    }
  }

  async handleDeny() {
    if (!window.confirm('Are you sure you want to deny this case?')) return;
    try {
      await firstValueFrom(this.adminService.denyCase(this.id));
      window.history.back();
    } catch {
      alert('Error denying case.');
    }
  }
}
