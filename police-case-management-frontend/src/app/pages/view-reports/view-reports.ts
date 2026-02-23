import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ReportService } from '../../services/report';
import { AppFeedbackService } from '../../services/app-feedback.service';

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
  readConfirm: { id: string; from: string } | null = null;
  isMarkingRead = false;
  private readonly monthYearFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  });

  constructor(
    private reportService: ReportService,
    private feedback: AppFeedbackService
  ) {}

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

  handleMarkAsRead(reportId: string, from: string, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.readConfirm = { id: reportId, from: from || 'this sender' };
  }

  closeReadConfirm() {
    if (this.isMarkingRead) return;
    this.readConfirm = null;
  }

  async confirmMarkAsRead() {
    if (!this.readConfirm || this.isMarkingRead) return;
    this.isMarkingRead = true;
    const sender = this.readConfirm.from;
    try {
      await firstValueFrom(this.reportService.deleteReport(this.readConfirm.id));
      this.reports = this.reports.filter((report) => report._id !== this.readConfirm?.id);
      this.feedback.showMessage(`Report from ${sender} marked as read!`, 'success');
    } catch (err) {
      console.error(err);
      this.feedback.showError('Error removing report.');
    } finally {
      this.isMarkingRead = false;
      this.readConfirm = null;
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

  trackByGroup(index: number, group: { label: string }): string {
    return `${group?.label ?? 'unknown'}-${index}`;
  }

  trackByReport(index: number, report: any): string {
    const id = report?._id;
    return typeof id === 'string' && id.trim() ? id : `report-${index}`;
  }

}
