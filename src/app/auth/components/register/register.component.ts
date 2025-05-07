// src/app/auth/components/register/register.component.ts
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service'; // AuthService import
import { RegisterRequest } from '../../../shared/models/user.model'; // RegisterRequest modelini import et

// Şifre eşleşme validator'ı (Aynı kalabilir)
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword || !password.value || !confirmPassword.value) { return null; }
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
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['', Validators.required] // <-- Rol alanı eklendi ve zorunlu yapıldı
    }, { validators: passwordMatchValidator });
  }

  // Form kontrollerine kolay erişim
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }
  get role() { return this.registerForm.get('role'); } // <-- Rol getter'ı eklendi

  onSubmit(): void {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.successMessage = null;

    const formValue = this.registerForm.value; // Formdaki tüm değerleri al

    const payload: RegisterRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      username: formValue.email, // username alanına da email değerini ata
      password: formValue.password
      // Rol payload'a eklenmedi, çünkü AuthService'e ayrı parametre olarak gönderilecek
    };

    const selectedRole: string = formValue.role; // Seçilen rolü al

    // AuthService'teki register metodunu seçilen rol ile çağır
    this.authService.register(payload, selectedRole).subscribe({ // <-- Rol parametresi eklendi
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...';
        this.registerForm.reset();
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Kayıt sırasında bilinmeyen bir hata oluştu.';
        console.error('Registration failed:', error);
      }
    });
  }
}
