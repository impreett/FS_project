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
  suspects?: string;
  victim?: string;
  guilty_name?: string;
  case_date?: string;
  case_handler?: string;
  status?: string;
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
    suspects: '',
    victim: '',
    guilty_name: '',
    case_date: '',
    status: 'ACTIVE',
    case_handler: '',
  };
  errors: AddCaseErrors = {};
  successMessage = '';
  todayStr = new Date().toISOString().split('T')[0];

  constructor(private auth: AuthService, private caseService: CaseService) {}

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

  validate() {
    const tempErrors: AddCaseErrors = {};
    const namesListRegex =
      /^\s*[A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s*,\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)*\s*$/;

    if (!this.formData.case_title || this.formData.case_title.length < 5) {
      tempErrors.case_title = 'Title must be at least 5 characters.';
    }
    if (!this.formData.case_type) {
      tempErrors.case_type = 'Please select a case type.';
    }
    if (!this.formData.case_description || this.formData.case_description.length < 20) {
      tempErrors.case_description = 'Description must be at least 20 characters.';
    }
    if (!this.formData.case_date) {
      tempErrors.case_date = 'Case date is required.';
    }
    if (this.user?.isAdmin && !this.formData.case_handler) {
      tempErrors.case_handler = 'Please select a case handler.';
    }

    const checkNamesField = (val: string) => {
      const v = (val || '').trim();
      if (!v) return 'If there is no person, enter N/A.';
      if (v.toUpperCase() === 'N/A') return '';
      return namesListRegex.test(v) ? '' : "Enter names like 'Name, Name, Name'.";
    };

    const sErr = checkNamesField(this.formData.suspects);
    if (sErr) tempErrors.suspects = sErr;
    const vErr = checkNamesField(this.formData.victim);
    if (vErr) tempErrors.victim = vErr;
    const gErr = checkNamesField(this.formData.guilty_name);
    if (gErr) tempErrors.guilty_name = gErr;

    this.errors = tempErrors;
    return Object.values(tempErrors).every((x) => !x);
  }

  async onSubmit() {
    if (!this.validate()) return;
    try {
      const payload = { ...this.formData, isApproved: !!this.user?.isAdmin };
      await firstValueFrom(this.caseService.addCase(payload));
      this.successMessage = 'Case added successfully!';
      this.formData = {
        case_title: '',
        case_type: '',
        case_description: '',
        suspects: '',
        victim: '',
        guilty_name: '',
        case_date: '',
        status: 'ACTIVE',
        case_handler: this.user?.isAdmin ? '' : this.user?.fullname || '',
      };
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error('Error details:', err?.error || err);
      this.successMessage = '';
      alert('Error adding case: ' + (err?.error?.msg || err?.message || err));
    }
  }
}
