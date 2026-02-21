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
  sortOrder: 'latest' | 'oldest' = 'latest';
  private readonly monthYearFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  });

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

  setSortOrder(order: 'latest' | 'oldest') {
    this.sortOrder = order;
  }

  private getReportTime(report: any) {
    const time = new Date(report?.date || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  get sortedReports() {
    return [...this.reports].sort((a, b) => {
      const aTime = this.getReportTime(a);
      const bTime = this.getReportTime(b);
      return this.sortOrder === 'latest' ? bTime - aTime : aTime - bTime;
    });
  }

  get groupedReports() {
    const groups: Array<{ label: string; items: any[] }> = [];
    for (const report of this.sortedReports) {
      const dateObj = new Date(report?.date || 0);
      const label = Number.isNaN(dateObj.getTime())
        ? 'Unknown Date'
        : this.monthYearFormatter.format(dateObj);
      const current = groups[groups.length - 1];
      if (!current || current.label !== label) {
        groups.push({ label, items: [report] });
      } else {
        current.items.push(report);
      }
    }
    return groups;
  }
}
