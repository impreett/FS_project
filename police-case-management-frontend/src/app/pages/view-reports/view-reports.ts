import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ReportService } from '../../services/report';

@Component({
  selector: 'app-view-reports',
  imports: [CommonModule],
  templateUrl: './view-reports.html',
  styleUrl: './view-reports.css',
})
export class ViewReports implements OnInit {
  reports: any[] = [];
  loading = true;

  constructor(private reportService: ReportService) {}

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.reportService.getReports());
      this.reports = res || [];
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  async handleMarkAsRead(reportId: string) {
    if (!window.confirm('Are you sure you want to mark this report as read?')) return;
    try {
      await firstValueFrom(this.reportService.deleteReport(reportId));
      this.reports = this.reports.filter((report) => report._id !== reportId);
    } catch (err) {
      console.error(err);
      alert('Error removing report.');
    }
  }
}
