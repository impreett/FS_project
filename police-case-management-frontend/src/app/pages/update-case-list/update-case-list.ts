import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CaseService } from '../../services/case';

type UpdateCaseErrors = {
  case_title?: string;
  case_type?: string;
  case_description?: string;
  suspects?: string;
  victim?: string;
  guilty_name?: string;
  case_date?: string;
  status?: string;
};

@Component({
  selector: 'app-update-case-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './update-case-list.html',
  styleUrl: './update-case-list.css',
})
export class UpdateCaseList implements OnInit {
  cases: any[] = [];
  loading = true;
  editingCaseId: string | null = null;
  formData: any = {};
  errors: UpdateCaseErrors = {};
  successMessage = '';
  todayStr = new Date().toISOString().split('T')[0];

  constructor(private caseService: CaseService) {}

  async ngOnInit() {
    try {
      const response = await firstValueFrom(this.caseService.getAssignedCases());
      this.cases = response || [];
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      this.loading = false;
    }
  }

  handleEditClick(caseItem: any) {
    this.editingCaseId = caseItem._id;
    const formattedDate = new Date(caseItem.case_date).toISOString().split('T')[0];
    this.formData = { ...caseItem, case_date: formattedDate };
    this.successMessage = '';
  }

  handleCancel() {
    this.editingCaseId = null;
    this.formData = {};
    this.errors = {};
  }

  validate() {
    const errs: UpdateCaseErrors = {};
    const namesListRegex =
      /^\s*[A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s*,\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)*\s*$/;

    if (!this.formData.case_title || (this.formData.case_title || '').length < 5) {
      errs.case_title = !this.formData.case_title
        ? 'Please enter the case title'
        : 'At least 5 characters';
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

    this.errors = errs;
    return Object.keys(errs).length === 0;
  }

  async onSubmit() {
    if (!this.validate()) return;
    try {
      const { _id, __v, isApproved, is_removed, createdAt, updatedAt, ...cleanFormData } =
        this.formData || {};
      const updateRequestData = {
        ...cleanFormData,
        originalCaseId: this.editingCaseId,
      };
      await firstValueFrom(this.caseService.requestUpdate(updateRequestData));
      this.successMessage = 'Update request submitted successfully!';
      this.editingCaseId = null;
      this.formData = {};
      this.errors = {};
      window.scrollTo(0, 0);
    } catch (err: any) {
      console.error('Error details:', err?.error || err);
      this.successMessage = '';
      alert('Error submitting update request: ' + (err?.error?.error || err?.error?.msg || err?.message));
    }
  }
}
