import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CaseService } from '../../services/case';

type UpdateFormErrors = {
  case_title?: string;
  case_type?: string;
  case_description?: string;
  involvedPeople?: string;
  case_date?: string;
  status?: string;
};

type PersonRole = 'suspects' | 'victim' | 'guilty_name' | '';

type InvolvedPerson = {
  name: string;
  age: string | number;
  role: PersonRole;
};

type RoleListItem = {
  index: number;
  name: string;
  age: string;
};

@Component({
  selector: 'app-update-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './update-form.html',
  styleUrl: './update-form.css',
})
export class UpdateForm implements OnInit {
  id = '';
  loading = true;
  error = '';
  formData: any = {};
  involvedPeople: InvolvedPerson[] = [];
  errors: UpdateFormErrors = {};
  todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private caseService: CaseService
  ) {}

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    try {
      const caseRes = await firstValueFrom(this.caseService.getCaseById(this.id));
      const formattedDate = new Date(caseRes.case_date).toISOString().split('T')[0];
      this.formData = { ...caseRes, case_date: formattedDate };
      this.involvedPeople = [
        ...this.parsePeopleField(caseRes?.suspects, 'suspects'),
        ...this.parsePeopleField(caseRes?.guilty_name, 'guilty_name'),
        ...this.parsePeopleField(caseRes?.victim, 'victim'),
      ];
    } catch {
      this.error = 'Failed to load case details.';
    } finally {
      this.loading = false;
    }
  }

  private normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  private parsePeopleField(value: unknown, role: Exclude<PersonRole, ''>): InvolvedPerson[] {
    if (Array.isArray(value)) {
      return value
        .map((entry: any) => {
          if (!entry || typeof entry !== 'object') return null;
          const name = this.normalizeText(entry.name);
          if (!name) return null;
          const ageText =
            entry.age === null || entry.age === undefined || entry.age === ''
              ? ''
              : String(entry.age).trim();
          return { name, age: ageText, role };
        })
        .filter((entry) => !!entry) as InvolvedPerson[];
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
            age: this.normalizeText(withAge[2]),
            role,
          };
        }

        const nameOnly = part.match(/^Name:\s*(.+)$/i);
        const name = nameOnly ? this.normalizeText(nameOnly[1]) : this.normalizeText(part);
        if (!name) return null;

        return {
          name,
          age: '',
          role,
        };
      })
      .filter((entry) => !!entry) as InvolvedPerson[];
  }

  addPersonForRole(role: Exclude<PersonRole, ''>) {
    this.involvedPeople.push({
      name: '',
      age: '',
      role,
    });
  }

  private getPeopleByRole(role: Exclude<PersonRole, ''>): RoleListItem[] {
    return this.involvedPeople
      .map((person, index) => ({ person, index }))
      .filter((entry) => entry.person.role === role)
      .map((entry) => ({
        index: entry.index,
        name: this.normalizeText(entry.person.name),
        age: this.normalizeText(entry.person.age),
      }));
  }

  get suspectPeople() {
    return this.getPeopleByRole('suspects');
  }

  get guiltyPeople() {
    return this.getPeopleByRole('guilty_name');
  }

  get victimPeople() {
    return this.getPeopleByRole('victim');
  }

  removePerson(index: number) {
    this.involvedPeople.splice(index, 1);
  }

  trackByIndex(_index: number, item: RoleListItem) {
    return item.index;
  }

  onPersonNameChange(index: number, value: string) {
    if (!this.involvedPeople[index]) return;
    this.involvedPeople[index].name = value;
  }

  onPersonAgeChange(index: number, value: string) {
    if (!this.involvedPeople[index]) return;
    const trimmed = this.normalizeText(value);
    if (!trimmed) {
      this.involvedPeople[index].age = '';
      return;
    }
    if (!/^\d{0,3}$/.test(trimmed)) {
      return;
    }
    const numeric = Number(trimmed);
    this.involvedPeople[index].age = numeric > 120 ? '120' : trimmed;
  }

  private buildPeoplePayload() {
    const grouped: {
      suspects: Array<{ name: string; age: number | null }>;
      victim: Array<{ name: string; age: number | null }>;
      guilty_name: Array<{ name: string; age: number | null }>;
    } = {
      suspects: [],
      victim: [],
      guilty_name: [],
    };

    for (const person of this.involvedPeople) {
      const name = this.normalizeText(person.name);
      const ageText = this.normalizeText(person.age);
      const role = person.role;
      if (!name || !role) continue;
      grouped[role].push({
        name,
        age: ageText ? Number(ageText) : null,
      });
    }

    return {
      suspects: grouped.suspects,
      victim: grouped.victim,
      guilty_name: grouped.guilty_name,
    };
  }

  validate() {
    const errs: UpdateFormErrors = {};
    const nameRegex = /^[A-Za-z ]+$/;

    if (!this.formData.case_title || (this.formData.case_title || '').length < 5) {
      errs.case_title = !this.formData.case_title ? 'Please enter the case title' : 'At least 5 characters';
    }
    if (!this.formData.case_type) {
      errs.case_type = 'Please select a case type';
    }
    if (!this.formData.case_description || (this.formData.case_description || '').length < 20) {
      errs.case_description = !this.formData.case_description
        ? 'Please provide a description'
        : 'At least 20 characters';
    }
    if (this.involvedPeople.length > 0) {
      for (const person of this.involvedPeople) {
        const name = this.normalizeText(person.name);
        const ageText = this.normalizeText(person.age);
        const letters = name.replace(/\s/g, '').length;
        if (!name || letters < 3 || letters > 20 || !nameRegex.test(name)) {
          errs.involvedPeople = 'Each name must be 3-20 letters (alphabets and spaces only).';
          break;
        }
        if (!ageText || !/^\d{1,3}$/.test(ageText) || Number(ageText) > 120) {
          errs.involvedPeople = 'Each age must be between 0 and 120.';
          break;
        }
      }
    }
    if (!this.formData.case_date) {
      errs.case_date = 'Please select a case date';
    } else if (this.formData.case_date > this.todayStr) {
      errs.case_date = 'Case date cannot be in the future';
    }
    if (!this.formData.status) {
      errs.status = 'Please select a case status';
    }

    this.errors = errs;
    return Object.keys(errs).length === 0;
  }

  async onSubmit() {
    try {
      if (!this.validate()) return;
      const { _id, __v, isApproved, is_removed, createdAt, updatedAt, ...cleanFormData } =
        this.formData || {};
      const peoplePayload = this.buildPeoplePayload();
      const updateRequestData = {
        ...cleanFormData,
        ...peoplePayload,
        originalCaseId: this.id,
      };
      await firstValueFrom(this.caseService.requestUpdate(updateRequestData));
      alert('Update request submitted successfully!');
      this.router.navigate(['/update']);
    } catch (err: any) {
      alert('Error submitting update request: ' + (err?.error?.error || err?.error?.msg || err?.message));
    }
  }
}
