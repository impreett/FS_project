import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Footer } from '../../components/footer/footer';
import { ReportService } from '../../services/report';

type PublicReportErrors = {
  email?: string;
  reportText?: string;
};

@Component({
  selector: 'app-public-report',
  imports: [CommonModule, FormsModule, Footer],
  templateUrl: './public-report.html',
  styleUrl: './public-report.css',
})
export class PublicReport {
  formData = { email: '', reportText: '' };
  errors: PublicReportErrors = {};

  constructor(private reportService: ReportService, private router: Router) {}

  validate() {
    const next: PublicReportErrors = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.formData.email) next.email = 'Please enter your Email';
    else if (!emailRe.test(this.formData.email)) next.email = 'Enter a valid Email address';
    if (!this.formData.reportText) next.reportText = 'Please describe your issue';
    else if ((this.formData.reportText || '').length < 50)
      next.reportText = 'Report must be at least 50 characters long';
    this.errors = next;
    return Object.keys(next).length === 0;
  }

  async onSubmit() {
    if (!this.validate()) return;
    try {
      await firstValueFrom(this.reportService.submitPublicReport(this.formData));
      alert('Your report has been submitted successfully.');
      this.router.navigate(['/login']);
    } catch {
      alert('Error submitting report. Please try again.');
    }
  }

  goBack() {
    window.history.back();
  }
}
