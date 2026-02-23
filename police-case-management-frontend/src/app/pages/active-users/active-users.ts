import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';
import { AppFeedbackService } from '../../services/app-feedback.service';

@Component({
  selector: 'app-active-users',
  imports: [CommonModule],
  templateUrl: './active-users.html',
  styleUrl: './active-users.css',
})
export class ActiveUsers implements OnInit {
  users: any[] = [];
  loading = true;
  disableConfirm: { id: string; name: string } | null = null;
  isDisabling = false;

  constructor(
    private adminService: AdminService,
    private feedback: AppFeedbackService
  ) {}

  get cityCount(): number {
    return new Set(this.users.map((u) => (u?.city || '').trim()).filter(Boolean)).size;
  }

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.adminService.getActiveUsers());
      const payload: any = res;
      const normalized = Array.isArray(payload) ? payload : Array.isArray(payload?.users) ? payload.users : [];
      this.users = normalized;
    } catch (err) {
      console.error(err);
      this.feedback.showError('Failed to fetch active users.');
    } finally {
      this.loading = false;
    }
  }

  handleDisable(userId: string, fullname: string) {
    this.disableConfirm = { id: userId, name: fullname || 'this user' };
  }

  closeDisableConfirm() {
    if (this.isDisabling) return;
    this.disableConfirm = null;
  }

  async confirmDisable() {
    if (!this.disableConfirm || this.isDisabling) return;
    this.isDisabling = true;
    try {
      await firstValueFrom(this.adminService.disableUser(this.disableConfirm.id));
      this.users = this.users.filter((u) => u._id !== this.disableConfirm?.id);
      this.feedback.showMessage('User disabled successfully!', 'success');
    } catch (err) {
      console.error(err);
      this.feedback.showError('Error disabling user.');
    } finally {
      this.isDisabling = false;
      this.disableConfirm = null;
    }
  }
}
