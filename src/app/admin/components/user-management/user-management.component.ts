import { Component, OnInit } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { UserSummary } from '../../../shared/models/user.model';
import { NotificationService } from '../../../core/services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  standalone:false,
})
export class UserManagementComponent implements OnInit {

  users$: Observable<UserSummary[]> = of([]);
  isLoading = false;
  error: string | null = null;
  actionLoading: { [key: number]: boolean } = {}; // Aksiyonlar için yüklenme durumu (kullanıcı ID bazlı)
  actionType: 'ban' | 'unban' | 'reset' | 'view' | null = null; // Hangi aksiyonun çalıştığını tutar
  actionError: string | null = null; // Aksiyon hatası

  constructor(private userService: UserService,
    private notificationService: NotificationService,
    private router: Router // <-- Router inject et
  ) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    // ... (Bu metot aynı kalabilir)
    this.isLoading = true; this.error = null;
    this.users$ = this.userService.getAllUsers();
    this.users$.subscribe({ /* ... */ });
  }

  banUser(userId: number): void {
    if (this.actionLoading[userId]) return;

    this.actionLoading[userId] = true;
    this.actionType = 'ban'; // Aksiyon tipini ayarla
    this.actionError = null;

    this.userService.banUser(userId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log(`User ${userId} banned successfully.`);
          this.loadUsers(); // Listeyi yenile
        } else {
           console.error(`Failed to ban user ${userId}. Maybe admin?`);
           this.actionError = `Kullanıcı ${userId} yasaklanamadı (Admin olabilir).`;
        }
      },
      error: (err) => {
        console.error(`Error banning user ${userId}:`, err);
        this.actionError = `Kullanıcı ${userId} yasaklanırken hata oluştu: ${err.message || err}`;
      },
      complete: () => {
        delete this.actionLoading[userId]; // Yükleniyor durumunu kaldır
        this.actionType = null;
      }
    });
  }

  unbanUser(userId: number): void {
     if (this.actionLoading[userId]) return;

     this.actionLoading[userId] = true;
     this.actionType = 'unban'; // Aksiyon tipini ayarla
     this.actionError = null;

     this.userService.unbanUser(userId).subscribe({
       next: (response) => {
         if (response.success) {
           console.log(`User ${userId} unbanned successfully.`);
           this.loadUsers(); // Listeyi yenile
         } else {
            console.error(`Failed to unban user ${userId}.`);
            this.actionError = `Kullanıcı ${userId} yasağı kaldırılamadı.`;
         }
       },
       error: (err) => {
         console.error(`Error unbanning user ${userId}:`, err);
         this.actionError = `Kullanıcı ${userId} yasağı kaldırılırken hata oluştu: ${err.message || err}`;
       },
       complete: () => {
         delete this.actionLoading[userId];
         this.actionType = null;
       }
     });
  }

  resetPassword(userId: number): void {
    if (this.actionLoading[userId]) return;

    // Kullanıcıdan onay al
    if (confirm(`Kullanıcı ${userId} için şifre sıfırlama bağlantısı göndermek istediğinizden emin misiniz?`)) {
      console.log(`Reset password action CONFIRMED for user ID: ${userId} (Calling mock service)`);

      this.actionLoading[userId] = true;
      this.actionType = 'reset';
      this.actionError = null;

      // --- ŞİMDİLİK MOCK / PLACEHOLDER ---
      // Gerçekte burada userService.sendPasswordResetEmail(userId) gibi bir metot çağrılır.
      of(true).pipe(delay(800)).subscribe({ // 0.8 saniye bekleme simülasyonu
        next: () => {
          this.notificationService.showSuccess(`Şifre sıfırlama bağlantısı kullanıcı ${userId}'ye gönderildi (Mock).`);
        },
        error: (err) => {
          this.notificationService.showError(`Şifre sıfırlama gönderilirken hata oluştu (Mock).`);
          this.actionError = `Şifre sıfırlama gönderilirken hata oluştu: ${err.message || err}`;
        },
        complete: () => {
          delete this.actionLoading[userId];
          this.actionType = null;
        }
      });
      // --- ---

    } else {
      console.log(`Reset password action cancelled for user ID: ${userId}`);
    }
  }

  viewTransactions(userId: number): void {
    if (this.actionLoading[userId]) return;
    console.log(`Navigating to transactions for user ID: ${userId}`);
    // Yeni rotaya userId parametresi ile yönlendir
    this.router.navigate(['/admin/users', userId, 'transactions']);
  }
}
