import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

@Component({
  selector: 'app-check-side-by-side',
  imports: [CommonModule, RouterLink],
  templateUrl: './check-side-by-side.html',
  styleUrl: './check-side-by-side.css',
})
export class CheckSideBySide implements OnInit {
  loading = true;
  error = '';
  update: any = null;
  original: any = null;

  private peopleCache = new Map<string, { name: string; age: string }[]>();

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService,
    private caseService: CaseService
  ) {}

  async ngOnInit() {
    const updateId = this.route.snapshot.paramMap.get('updateId') || '';
    if (!updateId) {
      this.error = 'Invalid update id.';
      this.loading = false;
      return;
    }

    try {
      const updates = await firstValueFrom(this.adminService.getPendingUpdates());
      const found = (updates || []).find((item: any) => item?._id === updateId);
      if (!found) {
        this.error = 'Pending update not found.';
        return;
      }

      this.update = found;

      try {
        this.original = await firstValueFrom(this.caseService.getCaseById(found.originalCaseId));
      } catch {
        this.original = null;
      }
    } catch {
      this.error = 'Failed to load side-by-side details.';
    } finally {
      this.loading = false;
    }
  }

  private normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private parsePeople(value: unknown): { name: string; age: string }[] {
    if (Array.isArray(value)) {
      return value
        .map((entry: any) => {
          if (!entry || typeof entry !== 'object') return null;
          const name = this.normalizeText(entry.name);
          if (!name) return null;
          const age =
            entry.age === null || entry.age === undefined || entry.age === ''
              ? 'Unidentified'
              : String(entry.age);
          return { name, age };
        })
        .filter((entry): entry is { name: string; age: string } => !!entry);
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

  peopleFor(value: unknown): { name: string; age: string }[] {
    const key = JSON.stringify(value ?? '');
    if (!this.peopleCache.has(key)) {
      this.peopleCache.set(key, this.parsePeople(value));
    }
    return this.peopleCache.get(key) || [];
  }

  peopleNameColumnWidthFor(caseLike: any): string {
    const people = [
      ...this.peopleFor(caseLike?.victim),
      ...this.peopleFor(caseLike?.suspects),
      ...this.peopleFor(caseLike?.guilty_name),
    ];

    const longest = people.reduce((max, person) => {
      const displayLength = `Name: ${person.name}`.length;
      return displayLength > max ? displayLength : max;
    }, 10);

    return `${longest}ch`;
  }
}
