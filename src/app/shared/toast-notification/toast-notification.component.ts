import { Component, OnInit } from '@angular/core';
import {
  ToastNotificationService,
  ToastNotification,
} from './toast-notification.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';

@Component({
  selector: 'app-toast-notification',
  templateUrl: './toast-notification.component.html',
  styleUrl: './toast-notification.component.scss',
})
export class ToastNotificationComponent implements OnInit {
  notifications: ToastNotification[] = [];

  constructor(
    private toastService: ToastNotificationService,
    private modalService: NgbModal,
    private router: Router
  ) {}

  ngOnInit() {
    this.toastService.notifications$.subscribe((data) => {
      this.notifications = data;
    });
  }

  dismiss(id: string) {
    this.toastService.removeNotification(id);
  }
}
