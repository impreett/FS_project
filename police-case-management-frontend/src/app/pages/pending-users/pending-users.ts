import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-pending-users',
  imports: [CommonModule],
  templateUrl: './pending-users.html',
  styleUrl: './pending-users.css',
})
export class PendingUsers implements OnInit, OnDestroy {
  users: any[] = [];
  loading = true;
  successMessage = '';
  private successMessageTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly successMessageDurationMs = 7000;
  userConfirm:
    | {
        id: string;
        name: string;
        action: 'approve' | 'deny';
      }
    | null = null;
  isSubmittingAction = false;

  constructor(private adminService: AdminService) {}

  get cityCount(): number {
    return new Set(this.users.map((user) => user.city).filter(Boolean)).size;
  }

  async ngOnInit() {
    await this.fetchPendingUsers();
  }

  ngOnDestroy() {
    this.clearSuccessMessageTimer();
  }

  closeSuccessMessage() {
    this.clearSuccessMessageTimer();
    this.successMessage = '';
  }

  async fetchPendingUsers() {
    try {
      const res = await firstValueFrom(this.adminService.getPendingUsers());
      this.users = res || [];
    } catch (err) {
      console.error(err);
      alert('Failed to fetch pending users. You may not be an admin.');
    } finally {
      this.loading = false;
    }
  }

  handleApprove(user: any) {
    this.openUserConfirm(user, 'approve');
  }

  handleDeny(user: any) {
    this.openUserConfirm(user, 'deny');
  }

  private openUserConfirm(user: any, action: 'approve' | 'deny') {
    const id = String(user?._id ?? '');
    if (!id) return;
    this.userConfirm = {
      id,
      name: String(user?.fullname ?? 'this user'),
      action,
    };
  }

  closeUserConfirm() {
    if (this.isSubmittingAction) return;
    this.userConfirm = null;
  }

  async confirmUserAction() {
    if (!this.userConfirm || this.isSubmittingAction) return;
    this.isSubmittingAction = true;
    const { id, action } = this.userConfirm;
    try {
      if (action === 'approve') {
        await firstValueFrom(this.adminService.approveUser(id));
        this.showSuccessMessage('User approved!');
        this.users = this.users.filter((user) => user._id !== id);
        window.scrollTo(0, 0);
      } else {
        await firstValueFrom(this.adminService.denyUser(id));
        this.users = this.users.filter((user) => user._id !== id);
      }
    } catch (err) {
      console.error(err);
      alert(action === 'approve' ? 'Error approving user.' : 'Error denying user.');
    } finally {
      this.isSubmittingAction = false;
      this.userConfirm = null;
    }
  }

  private showSuccessMessage(message: string) {
    this.clearSuccessMessageTimer();
    this.successMessage = message;
    this.successMessageTimer = setTimeout(() => {
      this.successMessage = '';
      this.successMessageTimer = null;
    }, this.successMessageDurationMs);
  }

  private clearSuccessMessageTimer() {
    if (this.successMessageTimer) {
      clearTimeout(this.successMessageTimer);
      this.successMessageTimer = null;
    }
  }
}
