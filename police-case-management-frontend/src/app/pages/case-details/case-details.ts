import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { AdminService } from '../../services/admin';
import { CaseService } from '../../services/case';

@Component({
  selector: 'app-case-details',
  imports: [CommonModule],
  templateUrl: './case-details.html',
  styleUrl: './case-details.css',
})
export class CaseDetails implements OnInit {
  caseItem: any = null;
  loading = true;
  error: string | null = null;
  user: any = null;
  successMessage = '';
  id = '';

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private adminService: AdminService,
    private caseService: CaseService
  ) {}

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.user = this.auth.getUser();

    try {
      let res;
      try {
        res = await firstValueFrom(this.adminService.getCaseById(this.id));
      } catch {
        res = await firstValueFrom(this.caseService.getCaseById(this.id));
      }
      this.caseItem = res;
    } catch {
      this.error = 'Could not fetch case details.';
    } finally {
      this.loading = false;
    }
  }

  async handleApprove() {
    try {
      await firstValueFrom(this.adminService.approveCase(this.id));
      this.successMessage = 'Case approved!';
      if (this.caseItem) {
        this.caseItem = { ...this.caseItem, isApproved: true };
      }
      window.scrollTo(0, 0);
    } catch {
      alert('Error approving case.');
    }
  }

  async handleDeny() {
    if (!window.confirm('Are you sure you want to deny this case?')) return;
    try {
      await firstValueFrom(this.adminService.denyCase(this.id));
      window.history.back();
    } catch {
      alert('Error denying case.');
    }
  }
}
