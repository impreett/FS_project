import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

type AdminUpdateFormErrors = {
  case_title?: string;
  case_type?: string;
  case_description?: string;
  suspects?: string;
  victim?: string;
  guilty_name?: string;
  case_date?: string;
  status?: string;
  case_handler?: string;
};

@Component({
  selector: 'app-admin-update-form',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-update-form.html',
  styleUrl: './admin-update-form.css',
})
export class AdminUpdateForm implements OnInit {
  formData: any = {};
  officers: string[] = [];
  loading = true;
  errors: AdminUpdateFormErrors = {};
  todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  id = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private caseService: CaseService
  ) {}

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    try {
      const caseRes = await firstValueFrom(this.caseService.getCaseById(this.id));
      const formattedDate = new Date(caseRes.case_date).toISOString().split('T')[0];
      this.formData = { ...caseRes, case_date: formattedDate };

      const officersRes = await firstValueFrom(this.adminService.getActiveUsers());
      const names = (officersRes || []).map((o: any) => o.fullname || o);
      const currentHandler = caseRes.case_handler;
      if (currentHandler && !names.includes(currentHandler)) {
        names.unshift(currentHandler);
      }
      this.officers = names;
    } catch (err) {
      console.error(err);
      alert('Failed to load data. You may not be authorized.');
    } finally {
      this.loading = false;
    }
  }

  onChange(name: string, value: string) {
    if (name === 'case_date') {
      const clamped = value && value > this.todayStr ? this.todayStr : value;
      this.formData = { ...this.formData, [name]: clamped };
      return;
    }
    this.formData = { ...this.formData, [name]: value };
  }

  validate() {
    const errs: AdminUpdateFormErrors = {};
    const namesListRegex =
      /^\s*[A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s*,\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)*\s*$/;

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
    const checkNamesField = (val: string) => {
      const v = (val || '').trim();
      if (!v) return 'If there is no person, enter N/A.';
      if (v.toUpperCase() === 'N/A') return '';
      return namesListRegex.test(v) ? '' : "Enter names like 'Name, Name, Name'.";
    };

    const sErr = checkNamesField(this.formData.suspects);
    if (sErr) errs.suspects = sErr;
    const vErr = checkNamesField(this.formData.victim);
    if (vErr) errs.victim = vErr;
    const gErr = checkNamesField(this.formData.guilty_name);
    if (gErr) errs.guilty_name = gErr;
    if (!this.formData.case_date) {
      errs.case_date = 'Please select a case date';
    }
    if (!this.formData.status) {
      errs.status = 'Please select a case status';
    }
    if (!this.formData.case_handler) {
      errs.case_handler = 'Please select a case handler';
    }

    this.errors = errs;
    return Object.keys(errs).length === 0;
  }

  async onSubmit() {
    try {
      if (!this.validate()) return;
      if (this.formData.case_date && this.formData.case_date > this.todayStr) {
        alert('Case date cannot be in the future.');
        return;
      }
      await firstValueFrom(this.caseService.updateCase(this.id, this.formData));
      alert('Case updated successfully!');
      this.router.navigate(['/admin/update-case']);
    } catch {
      alert('Error updating case.');
    }
  }
}
