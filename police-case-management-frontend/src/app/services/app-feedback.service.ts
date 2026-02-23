import { Injectable, signal } from '@angular/core';

export type AppFeedbackTone = 'success' | 'danger' | 'info' | 'warning';
export type AppConfirmTone = 'approve' | 'reject' | 'check';

export type AppConfirmOptions = {
  title?: string;
  message: string;
  subject?: string;
  messageSuffix?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: AppConfirmTone;
  cancelTone?: AppConfirmTone;
  closeOnBackdrop?: boolean;
};

type AppMessageState = {
  title: string;
  text: string;
  tone: AppFeedbackTone;
  autoCloseMs: number;
};

type AppConfirmState = {
  title: string;
  message: string;
  subject: string;
  messageSuffix: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone: AppConfirmTone;
  cancelTone: AppConfirmTone;
  closeOnBackdrop: boolean;
  resolve: (result: boolean) => void;
};

@Injectable({ providedIn: 'root' })
export class AppFeedbackService {
  readonly message = signal<AppMessageState | null>(null);
  readonly confirmDialog = signal<AppConfirmState | null>(null);

  private messageTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly defaultMessageDurationMs = 7000;

  showMessage(
    text: string,
    tone: AppFeedbackTone = 'info',
    options?: { title?: string; autoCloseMs?: number }
  ) {
    const safeText = String(text || '').trim();
    if (!safeText) return;

    this.clearMessage();

    const nextMessage: AppMessageState = {
      title: String(options?.title || '').trim(),
      text: safeText,
      tone,
      autoCloseMs: Number.isFinite(options?.autoCloseMs)
        ? Math.max(0, Number(options?.autoCloseMs))
        : this.defaultMessageDurationMs,
    };

    this.message.set(nextMessage);

    if (nextMessage.autoCloseMs > 0) {
      this.messageTimer = setTimeout(() => {
        this.message.set(null);
        this.messageTimer = null;
      }, nextMessage.autoCloseMs);
    }
  }

  showError(text: string, options?: { title?: string; autoCloseMs?: number }) {
    this.showMessage(text, 'danger', options);
  }

  clearMessage() {
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }
    this.message.set(null);
  }

  confirm(options: AppConfirmOptions): Promise<boolean> {
    const existing = this.confirmDialog();
    if (existing) {
      existing.resolve(false);
      this.confirmDialog.set(null);
    }

    const message = String(options?.message || '').trim() || 'Are you sure?';
    const subject = String(options?.subject || '').trim();
    const messageSuffix = String(options?.messageSuffix || '').trim();
    const title = String(options?.title || '').trim() || 'Please confirm';
    const confirmLabel = String(options?.confirmLabel || '').trim() || 'Yes';
    const cancelLabel = String(options?.cancelLabel || '').trim() || 'No';
    const confirmTone = options?.confirmTone || 'approve';
    const cancelTone = options?.cancelTone || 'check';
    const closeOnBackdrop = options?.closeOnBackdrop !== false;

    return new Promise<boolean>((resolve) => {
      this.confirmDialog.set({
        title,
        message,
        subject,
        messageSuffix,
        confirmLabel,
        cancelLabel,
        confirmTone,
        cancelTone,
        closeOnBackdrop,
        resolve,
      });
    });
  }

  respondToConfirm(result: boolean) {
    const current = this.confirmDialog();
    if (!current) return;
    this.confirmDialog.set(null);
    current.resolve(result);
  }
}
