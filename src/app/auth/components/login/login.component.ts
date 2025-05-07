import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router'; // ActivatedRoute eklendi
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest, UserSummary } from '../../../shared/models/user.model'; // UserSummary import edildi
import { HttpErrorResponse } from '@angular/common/http';
import { first } from 'rxjs/operators'; // first operatörü eklendi

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false
})
export class LoginComponent implements OnInit {

  loginForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  returnUrl: string = '/'; // Varsayılan yönlendirme adresi

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute // ActivatedRoute inject edildi
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    // Giriş sayfasına gelinirken query params'tan returnUrl'i al
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage = null;
    this.isLoading = true;

    const loginRequest: LoginRequest = {
      username: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Login successful:', response);

        // --- ROL BAZLI YÖNLENDİRME ---
        // Giriş başarılı olduktan sonra KULLANICI ROLÜNÜ KONTROL ET
        this.authService.currentUser$.pipe(
            // currentUser$ BehaviorSubject olduğu için ilk değeri hemen almak için first() kullanabiliriz.
            first()
        ).subscribe((user: UserSummary | null) => {
            if (user) {
                console.log('Redirecting based on role:', user.role);
                switch (user.role) {
                    case 'ADMIN':
                        this.router.navigate(['/admin/dashboard']); // Admin paneline yönlendir
                        break;
                    case 'SELLER':
                        this.router.navigate(['/seller/dashboard']); // Satıcı paneline yönlendir
                        break;
                    case 'CUSTOMER':
                    default:
                         // Eğer returnUrl varsa oraya, yoksa ana sayfaya (veya /buyer/profile gibi) yönlendir
                         this.router.navigateByUrl(this.returnUrl === '/' ? '/products' : this.returnUrl);
                         break;
                 }
            } else {
                 // Kullanıcı bilgisi alınamadıysa (beklenmedik durum), ana sayfaya yönlendir
                 console.error("Login successful but user data is null, redirecting to home.");
                 this.router.navigate(['/']);
            }
        });
        // --- YÖNLENDİRME SONU ---

      },
      error: (error: Error) => {
        this.isLoading = false;
        console.error('Login failed:', error);
        this.errorMessage = error.message; // handleError'dan gelen mesajı kullan
      }
    });
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

}
