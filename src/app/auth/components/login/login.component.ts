import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Reactive Forms için
import { AuthService } from '../../../core/services/auth.service'; // AuthService'i import et
import { LoginRequest } from '../../../shared/models/user.model'; // LoginRequest modelini import et
import { HttpErrorResponse } from '@angular/common/http'; // Hata yakalama için

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup; // !: Non-null assertion (OnInit'te atanacak)
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder, // FormBuilder'ı inject et
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Component yüklendiğinde formu oluştur
    this.loginForm = this.fb.group({
      // Form kontrolleri: ilk değer null, sonra validator'lar
      email: ['', [Validators.required, Validators.email]], // E-posta formatı ve zorunlu alan kontrolü
      password: ['', [Validators.required]] // Zorunlu alan kontrolü
    });
  }

  // Form gönderildiğinde çalışacak metot
  onSubmit(): void {
    // Form geçerli değilse veya zaten yükleniyorsa bir şey yapma
    if (this.loginForm.invalid || this.isLoading) {
      // Formun geçersiz olduğunu belirtmek için alanları 'touched' yapabiliriz
      this.loginForm.markAllAsTouched();
      return;
    }

    // Hata mesajını temizle ve yükleniyor durumunu başlat
    this.errorMessage = null;
    this.isLoading = true;

    // Form değerlerinden LoginRequest nesnesi oluştur
    const loginRequest: LoginRequest = {
      username: this.loginForm.value.email, // Formdaki email değerini 'username' alanına ata
      password: this.loginForm.value.password
    };

    // AuthService üzerinden login isteği gönder
    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        // Başarılı giriş
        this.isLoading = false;
        console.log('Login successful:', response);
        // Kullanıcıyı ana sayfaya veya hedeflenen başka bir sayfaya yönlendir
        this.router.navigate(['/']); // Ana sayfaya yönlendir (varsayım)
      },
      error: (error: HttpErrorResponse) => {
        // Hatalı giriş veya API hatası
        this.isLoading = false;
        console.error('Login failed:', error);
        // Kullanıcıya gösterilecek hata mesajını ayarla
        if (error.status === 401 || error.status === 400) { // Unauthorized veya Bad Request
          this.errorMessage = 'E-posta veya şifre hatalı.';
        } else {
          this.errorMessage = 'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.';
        }
         // İsterseniz error.error içindeki backend mesajını da gösterebilirsiniz
         // if (error.error && typeof error.error.message === 'string') {
         //    this.errorMessage = error.error.message;
         // }
      }
      // Complete bloğu da eklenebilir ama genellikle next/error yeterli
    });
  }

  // Form kontrollerine kolay erişim için getter'lar (HTML'de kullanmak için)
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }


  mockLoginAdmin(): void {
    this.authService.loginAsAdmin();
  }

  mockLoginSeller(): void {
    this.authService.loginAsSeller();
  }

  mockLoginCustomer(): void {
    this.authService.loginAsCustomer();
  }

  mockLogout(): void {
    this.authService.logout();
  }

}
