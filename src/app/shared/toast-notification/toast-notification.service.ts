// toast-notification.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

export interface ToastNotification {
  uuid: string;
  title: string;
  message: string;
  className: string;
  cameraId: any;
  categoryLabel: any;
  categoryRemark: any;
  detectionCategory: any;
  robotId: any;
}

@Injectable({
  providedIn: 'root',
})
export class ToastNotificationService {
  private notifications: ToastNotification[] = [];
  public notifications$ = new BehaviorSubject<ToastNotification[]>([]);

  addNotification(data: any) {
    const notification: ToastNotification = data;
    this.notifications.push(notification);
    if (this.notifications.length > 3) {
      this.notifications.shift();
    }
    this.notifications$.next([...this.notifications]);

    // Auto-remove after 5s
    setTimeout(() => this.removeNotification(notification.uuid), 5000);
  }

  removeNotification(uuid: string) {
    this.notifications = this.notifications.filter((n) => n.uuid !== uuid);
    this.notifications$.next([...this.notifications]);
  }
}
