import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { CaseService } from '../../services/case';

type AddCaseErrors = {
  case_title?: string;
  case_type?: string;
  case_description?: string;
  involvedPeople?: string;
  case_date?: string;
  case_handler?: string;
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
  selector: 'app-add-case',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-case.html',
  styleUrl: './add-case.css',
})
export class AddCase implements OnInit {
  user: any = null;
  officers: string[] = [];
  formData: any = {
    case_title: '',
    case_type: '',
    case_description: '',
    case_date: '',
    status: 'ACTIVE',
    case_handler: '',
  };
  involvedPeople: InvolvedPerson[] = [];
  errors: AddCaseErrors = {};
  successMessage = '';
  todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

  constructor(private auth: AuthService, private caseService: CaseService) {}

  private normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  async ngOnInit() {
    this.user = this.auth.getUser();
    if (this.user?.isAdmin) {
      try {
        const res = await firstValueFrom(this.caseService.getOfficers());
        this.officers = (res || []).map((o: any) => o.fullname || o);
      } catch {
        console.error('Failed to fetch officers');
      }
    } else if (this.user) {
      this.formData.case_handler = this.user.fullname;
    }
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
      suspects: Array<{ name: string; age: number }>;
      victim: Array<{ name: string; age: number }>;
      guilty_name: Array<{ name: string; age: number }>;
    } = {
      suspects: [],
      victim: [],
      guilty_name: [],
    };

    for (const person of this.involvedPeople) {
      const name = this.normalizeText(person.name);
      const age = this.normalizeText(person.age);
      const role = person.role;
      if (!name || !age || !role) continue;
      grouped[role].push({ name, age: Number(age) });
    }

    return {
      suspects: grouped.suspects,
      victim: grouped.victim,
      guilty_name: grouped.guilty_name,
    };
  }

  validate() {
    const tempErrors: AddCaseErrors = {};
    const nameRegex = /^[A-Za-z ]+$/;

    if (!this.formData.case_title || this.formData.case_title.length < 5) {
      tempErrors.case_title = 'Title must be at least 5 characters.';
    }
    if (!this.formData.case_type) {
      tempErrors.case_type = 'Please select a case type.';
    }
    if (!this.formData.case_description || this.formData.case_description.length < 20) {
      tempErrors.case_description = 'Description must be at least 20 characters.';
    }
    const caseDateValue = String(this.formData.case_date || '');
    if (!caseDateValue) {
      tempErrors.case_date = 'Case date is required.';
    } else if (caseDateValue > this.todayStr) {
      tempErrors.case_date = 'Case date cannot be in the future.';
    }
    if (this.user?.isAdmin && !this.formData.case_handler) {
      tempErrors.case_handler = 'Please select a case handler.';
    }

    if (this.involvedPeople.length === 0) {
      tempErrors.involvedPeople = 'Add at least one person with name, age, and role.';
    } else {
      for (const person of this.involvedPeople) {
        const name = this.normalizeText(person.name);
        const ageText = this.normalizeText(person.age);
        const role = person.role;
        const letters = name.replace(/\s/g, '').length;

        if (!role || !name || letters < 3 || letters > 20 || !nameRegex.test(name)) {
          tempErrors.involvedPeople = 'Each name must be 3-20 letters (alphabets and spaces only).';
          break;
        }

        if (!ageText || !/^\d{1,3}$/.test(ageText) || Number(ageText) > 120) {
          tempErrors.involvedPeople = 'Each age must be between 0 and 120.';
          break;
        }
      }
    }

    this.errors = tempErrors;
    return Object.values(tempErrors).every((x) => !x);
  }

  async onSubmit() {
    if (!this.validate()) return;
    try {
      const peoplePayload = this.buildPeoplePayload();
      const payload = {
        ...this.formData,
        ...peoplePayload,
        isApproved: !!this.user?.isAdmin,
      };
      await firstValueFrom(this.caseService.addCase(payload));
      this.successMessage = 'Case added successfully!';
      this.formData = {
        case_title: '',
        case_type: '',
        case_description: '',
        case_date: '',
        status: 'ACTIVE',
        case_handler: this.user?.isAdmin ? '' : this.user?.fullname || '',
      };
      this.involvedPeople = [];
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error('Error details:', err?.error || err);
      this.successMessage = '';
      alert('Error adding case: ' + (err?.error?.msg || err?.message || err));
    }
  }
}
