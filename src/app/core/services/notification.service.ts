import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private toastr: ToastrService) { }

  showSuccess(message: string, title?: string): void {
    this.toastr.success(message, title || 'Başarılı');
  }

  showError(message: string, title?: string): void {
    // Hata mesajları biraz daha uzun süre kalabilir
    this.toastr.error(message, title || 'Hata', { timeOut: 5000 });
  }

  showInfo(message: string, title?: string): void {
    this.toastr.info(message, title || 'Bilgi');
  }

  showWarning(message: string, title?: string): void {
    this.toastr.warning(message, title || 'Uyarı');
  }
}
