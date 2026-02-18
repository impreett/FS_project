import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ReportService } from '../../services/report';

type ReportIssueErrors = {
  reportText?: string;
};

@Component({
  selector: 'app-report-issue',
  imports: [CommonModule, FormsModule],
  templateUrl: './report-issue.html',
  styleUrl: './report-issue.css',
})
export class ReportIssue implements OnInit {
  reportText = '';
  userEmail = '';
  tokenError = false;
  errors: ReportIssueErrors = {};

  constructor(private auth: AuthService, private reportService: ReportService, private router: Router) {}

  ngOnInit() {
    const user = this.auth.getUser();
    if (user && user.email) {
      this.userEmail = user.email;
    } else {
      this.tokenError = true;
      this.userEmail = 'N/A - Your login session is outdated.';
    }
  }

  validate() {
    const tempErrors: ReportIssueErrors = {};
    if (!this.reportText || this.reportText.trim() === '') {
      tempErrors.reportText = 'Please describe your issue';
    } else if (this.reportText.trim().length < 50) {
      tempErrors.reportText = 'Report must be at least 50 characters';
    }
    this.errors = tempErrors;
    return Object.keys(tempErrors).length === 0;
  }

  async onSubmit() {
    if (this.tokenError) {
      alert('Your login session is outdated. Please log out and log in again to submit a report.');
      return;
    }
    if (!this.validate()) return;
    try {
      await firstValueFrom(
        this.reportService.submitReport({ email: this.userEmail, reportText: this.reportText })
      );
      alert('Your report has been submitted successfully.');
      this.router.navigate(['/']);
    } catch (err: any) {
      console.error('Error details:', err?.error || err);
      alert('Error submitting report: ' + (err?.error?.error || err?.error?.msg || err?.message));
    }
  }
}
