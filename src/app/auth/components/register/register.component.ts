import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service'; // AuthService import
import { RegisterRequest } from '../../../shared/models/user.model'; // RegisterRequest modelini import et

// Şifrelerin eşleşip eşleşmediğini kontrol eden özel validator fonksiyonu
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  // Eğer kontrollerden biri henüz oluşturulmadıysa veya boşsa hata yok
  if (!password || !confirmPassword || !password.value || !confirmPassword.value) {
    return null;
  }

  // Şifreler eşleşmiyorsa 'passwordMismatch' hatası döndür
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
};


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone:false
})
export class RegisterComponent implements OnInit {

  registerForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]], // Min 6 karakter
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator }); // Gruba özel validator ekle
  }

  // Form kontrollerine kolay erişim
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  onSubmit(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const payload: RegisterRequest = {
      firstName: this.registerForm.value.firstName,
      lastName: this.registerForm.value.lastName,
      email: this.registerForm.value.email,
      username: this.registerForm.value.email, // username alanına da email değerini ata
      password: this.registerForm.value.password
      // Role genellikle backend tarafında otomatik atanır (örn: CUSTOMER)
    };

    this.authService.register(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...';
        this.registerForm.reset(); // Formu temizle
        // Başarılı kayıt sonrası login sayfasına yönlendir
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000); // 2 saniye bekle
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Kayıt sırasında bilinmeyen bir hata oluştu.';
        console.error('Registration failed:', error);
      }
    });
  }
}
