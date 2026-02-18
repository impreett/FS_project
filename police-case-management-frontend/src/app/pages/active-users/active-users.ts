import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-active-users',
  imports: [CommonModule],
  templateUrl: './active-users.html',
  styleUrl: './active-users.css',
})
export class ActiveUsers implements OnInit {
  users: any[] = [];
  loading = true;

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.adminService.getActiveUsers());
      const payload: any = res;
      const normalized = Array.isArray(payload) ? payload : Array.isArray(payload?.users) ? payload.users : [];
      this.users = normalized;
    } catch (err) {
      console.error(err);
      alert('Failed to fetch active users.');
    } finally {
      this.loading = false;
    }
  }

  async handleDisable(userId: string) {
    if (
      !window.confirm(
        'Are you sure you want to disable this user? You can again enable them from the pending users page.'
      )
    ) {
      return;
    }
    try {
      await firstValueFrom(this.adminService.disableUser(userId));
      this.users = this.users.filter((u) => u._id !== userId);
    } catch (err) {
      console.error(err);
      alert('Error disabling user.');
    }
  }
}
