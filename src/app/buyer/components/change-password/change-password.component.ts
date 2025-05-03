import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
// Gerekli servisleri import et
import { UserService } from '../../../core/services/user.service'; // Şifre değiştirme servisi burada olacak varsayalım
import { NotificationService } from '../../../core/services/notification.service';
import { ChangePasswordRequest } from '../../../shared/models/user.model';
// Gerekli modeli import et

// Şifre eşleşme validator'ı (Register component'ten kopyalanabilir veya import edilebilir)
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmNewPassword = control.get('confirmNewPassword');
  if (!newPassword || !confirmNewPassword || !newPassword.value || !confirmNewPassword.value) {
    return null;
  }
  return newPassword.value === confirmNewPassword.value ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  standalone:false
})
export class ChangePasswordComponent implements OnInit {

  changePasswordForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService, // Veya AuthService
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator }); // Grup seviyesi validator
  }

  // Form kontrollerine kolay erişim
  get currentPassword() { return this.changePasswordForm.get('currentPassword'); }
  get newPassword() { return this.changePasswordForm.get('newPassword'); }
  get confirmNewPassword() { return this.changePasswordForm.get('confirmNewPassword'); }

  onSubmit(): void {
    this.changePasswordForm.markAllAsTouched();
    if (this.changePasswordForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const payload: ChangePasswordRequest = {
      currentPassword: this.changePasswordForm.value.currentPassword,
      newPassword: this.changePasswordForm.value.newPassword
      // confirmNewPassword backend'e gönderilmez, sadece frontend doğrulaması içindir
    };

    // Servis çağrısı (UserService'e changePassword metodu eklenmeli - Adım 7)
    this.userService.changePassword(payload).pipe(
        finalize(() => this.isLoading = false) // Her durumda loading'i bitir
    ).subscribe({
        next: () => {
            this.notificationService.showSuccess('Şifreniz başarıyla güncellendi!');
            this.changePasswordForm.reset(); // Formu sıfırla
            this.router.navigate(['/buyer/profile']); // Profil sayfasına geri dön
        },
        error: (err: Error) => {
            console.error("Password change failed:", err);
            this.errorMessage = err.message || 'Şifre güncellenirken bir hata oluştu.';
            // Mevcut şifre yanlışsa farklı bir mesaj gösterilebilir (backend'den gelen hataya göre)
            if (err.message.toLowerCase().includes('incorrect password') || err.message.toLowerCase().includes('mevcut şifre')) {
                 this.changePasswordForm.get('currentPassword')?.setErrors({'incorrect': true});
                 this.errorMessage = 'Girdiğiniz mevcut şifre hatalı.';
            }
        }
    });
  }
}
