import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-pending-users',
  imports: [CommonModule],
  templateUrl: './pending-users.html',
  styleUrl: './pending-users.css',
})
export class PendingUsers implements OnInit {
  users: any[] = [];
  loading = true;
  successMessage = '';

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    await this.fetchPendingUsers();
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

  async handleApprove(userId: string) {
    try {
      await firstValueFrom(this.adminService.approveUser(userId));
      this.successMessage = 'User approved!';
      this.users = this.users.filter((user) => user._id !== userId);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      alert('Error approving user.');
    }
  }

  async handleDeny(userId: string) {
    if (!window.confirm('Are you sure you want to deny this user?')) return;
    try {
      await firstValueFrom(this.adminService.denyUser(userId));
      this.users = this.users.filter((user) => user._id !== userId);
    } catch (err) {
      console.error(err);
      alert('Error denying user.');
    }
  }
}
