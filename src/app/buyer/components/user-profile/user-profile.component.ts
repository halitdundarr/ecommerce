import { Component, OnInit } from '@angular/core';
import { Observable, of, Subscription } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { UserSummary, Address, Profile } from '../../../shared/models/user.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service'; // <-- NotificationService import et
import { finalize, take } from 'rxjs/operators'; // finalize operatörünü import et
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone:false
})
export class UserProfileComponent implements OnInit {

  currentUser$: Observable<UserSummary | null>;
  currentUserSubscription: Subscription | null = null; // Mevcut kullanıcıyı almak için
  addresses$: Observable<Address[]> = of([]);

  showProfileEditForm = false;
  profileForm!: FormGroup;
  isSavingProfile = false;
  profileError: string | null = null;

  // Adres Yönetimi
  showNewAddressForm = false;
  newAddressForm!: FormGroup;
  isLoadingAddresses = false;
  isSavingAddress = false; // Hem ekleme hem güncelleme için kullanılabilir
  addressError: string | null = null;

  // --- YENİ STATE'ler ---
  editingAddressId: number | null = null; // Düzenlenen adresin ID'si
  actionLoading: { [key: number]: ('delete' | 'default' | null) } = {}; // Adres ID bazlı aksiyon yüklenme durumu
  // ---------------------

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadAddresses();
    this.initializeNewAddressForm();
    this.initializeProfileForm();
  }

  initializeProfileForm(profileData: Partial<Profile> = {}): void {
    // Backend DtoProfile'daki alanlarla eşleşenleri form'a ekle
    // email ve username genellikle güncellenmez.
    this.profileForm = this.fb.group({
        firstName: [profileData.firstName || '', [Validators.required, Validators.minLength(2)]],
        lastName: [profileData.lastName || '', [Validators.required, Validators.minLength(2)]],
        phoneNumber: [profileData.phoneNumber || ''], // Zorunlu olmayabilir, backend'e bağlı
        // dateOfBirth ve sex alanları backend DTO/Entity'sinde varsa eklenebilir
        // dateOfBirth: [profileData.dateOfBirth || null], // Format?
        // sex: [profileData.sex || null]
    });
}

  // Mevcut Adresleri Yükle (Aynı kalabilir)
  loadAddresses(): void {
    this.isLoadingAddresses = true;
    this.addressError = null;
    this.addresses$ = this.userService.getUserAddresses();
    this.addresses$.subscribe({
        next: () => this.isLoadingAddresses = false,
        error: (err) => {
            console.error("Error loading addresses:", err);
            this.addressError = "Adresler yüklenirken bir hata oluştu.";
            this.isLoadingAddresses = false;
        }
    });
  }

  // Yeni Adres Formunu Başlat (Aynı kalabilir)
  initializeNewAddressForm(): void {
    this.newAddressForm = this.fb.group({
        addressTitle: ['', Validators.required],
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        street: ['', Validators.required],
        city: ['', Validators.required],
        postalCode: ['', Validators.required],
        country: ['Türkiye', Validators.required],
        phoneNumber: ['', Validators.required],
        // isDefault, isBilling, isShipping formda şimdilik yok, gerekirse eklenebilir
        // Veya backend varsayılan atamalı
        isDefault: [false], // Varsayılanı false yapalım
        isBilling: [true], // Örnek varsayılan
        isShipping: [true] // Örnek varsayılan
    });
  }

  // Yeni Adres Formunu Göster/Gizle
  toggleNewAddressForm(open: boolean = !this.showNewAddressForm): void {
    this.showNewAddressForm = open;
    this.editingAddressId = null; // Form açılıp kapandığında düzenleme modunu sıfırla
    if (!this.showNewAddressForm) {
        this.newAddressForm.reset({ country: 'Türkiye', isDefault: false, isBilling: true, isShipping: true }); // Kapatırken formu sıfırla
        this.addressError = null; // Hataları temizle
    }
  }


  toggleProfileEditForm(open: boolean = !this.showProfileEditForm): void {
    this.showProfileEditForm = open;
    this.profileError = null; // Hataları temizle

    if (this.showProfileEditForm) {
        // Formu açarken mevcut kullanıcı verisiyle doldur
        this.currentUserSubscription = this.currentUser$.pipe(take(1)).subscribe(user => {
            if (user) {
                // Profile modeline uygun veriyi hazırla
                const currentProfileData: Partial<Profile> = {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    // phoneNumber: user.phoneNumber // UserSummary'de yok, Profile'dan alınmalı
                    // dateOfBirth: user.dateOfBirth
                    // sex: user.sex
                };
                // UserService'ten tam profili çekmek daha doğru olabilir
                // this.userService.getUserProfileById(user.id).subscribe(profile => { ... });
                this.initializeProfileForm(currentProfileData); // Formu doldur
            }
        });
    } else {
        // Formu kapatırken temizle (opsiyonel)
        this.profileForm.reset();
        if (this.currentUserSubscription) {
            this.currentUserSubscription.unsubscribe(); // Abonelikten çık
        }
    }
}

  // --- Adresi Düzenle MODU ---
  editAddress(address: Address): void {
       console.log('Editing address:', address);
       if (!address || address.id === undefined) return;

       this.editingAddressId = address.id; // Düzenleme modunu ve ID'yi ayarla
       // Formu mevcut adres bilgileriyle doldur
       this.newAddressForm.patchValue({
           addressTitle: address.addressTitle,
           firstName: address.firstName,
           lastName: address.lastName,
           street: address.street,
           city: address.city,
           postalCode: address.postalCode,
           country: address.country,
           phoneNumber: address.phoneNumber,
           isDefault: address.isDefault,
           isBilling: address.isBilling,
           isShipping: address.isShipping
       });
       this.showNewAddressForm = true; // Formu göster
       window.scrollTo(0, document.body.scrollHeight); // Sayfanın altına scroll et (formu görmek için)
   }

  // --- YENİ/GÜNCELLEME KAYDETME ---
  saveOrUpdateAddress(): void { // Metod adı değiştirildi
     this.newAddressForm.markAllAsTouched();
     if (this.newAddressForm.invalid || this.isSavingAddress) { return; }

     this.isSavingAddress = true;
     this.addressError = null;
     const formData = this.newAddressForm.value;

     if (this.editingAddressId !== null) {
         // --- GÜNCELLEME ---
         const addressToUpdate: Address = { ...formData, id: this.editingAddressId };
         this.userService.updateAddress(addressToUpdate).pipe(
             finalize(() => this.isSavingAddress = false) // Her durumda loading'i bitir
         ).subscribe({
             next: (updatedAddress) => {
                 console.log("Address updated:", updatedAddress);
                 this.notificationService.showSuccess('Adres başarıyla güncellendi.');
                 this.toggleNewAddressForm(false); // Formu kapat ve sıfırla
                 this.loadAddresses(); // Listeyi yenile
             },
// --- saveOrUpdateAddress metodu içindeki error bloğu (Alternatif) ---
error: (err) => {
  console.error("Error saving/updating address:", err);
  // addressError değişkenini sadece template'te göstermek için kullanabiliriz (opsiyonel)
  this.addressError = err.message || "Adres kaydedilirken/güncellenirken bilinmeyen bir hata oluştu.";

  // NotificationService'e doğrudan hata mesajını veya varsayılanı gönder
  this.notificationService.showError(
      err.message || "Adres kaydedilirken/güncellenirken bilinmeyen bir hata oluştu.", // || ile null kontrolü
      this.editingAddressId ? 'Güncelleme Başarısız' : 'Kayıt Başarısız'
  );
  this.isSavingAddress = false;
}
         });
     } else {
         // --- EKLEME ---
         // UserService'teki addAddress metodunu kullan (öncekiyle aynı)
         this.userService.addAddress(formData).pipe(
             finalize(() => this.isSavingAddress = false) // Her durumda loading'i bitir
         ).subscribe({
             next: (savedAddress) => {
                 console.log("Address saved:", savedAddress);
                 this.notificationService.showSuccess('Adres başarıyla kaydedildi.');
                 this.toggleNewAddressForm(false); // Formu kapat ve sıfırla
                 this.loadAddresses(); // Listeyi yenile
             },
             // --- saveOrUpdateAddress metodu içindeki error bloğu (Alternatif) ---
 error: (err) => {
  console.error("Error saving/updating address:", err);
  // addressError değişkenini sadece template'te göstermek için kullanabiliriz (opsiyonel)
  this.addressError = err.message || "Adres kaydedilirken/güncellenirken bilinmeyen bir hata oluştu.";

  // NotificationService'e doğrudan hata mesajını veya varsayılanı gönder
  this.notificationService.showError(
      err.message || "Adres kaydedilirken/güncellenirken bilinmeyen bir hata oluştu.", // || ile null kontrolü
      this.editingAddressId ? 'Güncelleme Başarısız' : 'Kayıt Başarısız'
  );
  this.isSavingAddress = false;
}

         });
     }
  }

  // --- Adresi Sil ---
  deleteAddress(addressId: number | undefined): void {
      if (addressId === undefined || this.actionLoading[addressId]) return; // ID yoksa veya zaten işlemdeyse çık

      if (confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
          this.actionLoading[addressId] = 'delete'; // Yükleniyor başlat (silme için)
          this.userService.deleteAddress(addressId).pipe(
              finalize(() => delete this.actionLoading[addressId]) // Her durumda loading'i bitir
          ).subscribe({
              next: () => {
                  console.log(`Address ID: ${addressId} deleted.`);
                  this.notificationService.showSuccess('Adres başarıyla silindi.');
                  this.loadAddresses(); // Listeyi yenile
              },
              error: (err) => {
                  console.error(`Error deleting address ${addressId}:`, err);
                  this.notificationService.showError(err.message || `Adres ${addressId} silinirken hata oluştu.`, 'Silme Başarısız');
              }
          });
      }
  }

   // --- Varsayılan Adres Yap ---
   makeDefaultAddress(addressId: number | undefined): void {
        if (addressId === undefined || this.actionLoading[addressId]) return; // ID yoksa veya zaten işlemdeyse çık

        this.actionLoading[addressId] = 'default'; // Yükleniyor başlat (varsayılan yapma için)
        this.userService.setDefaultAddress(addressId).pipe(
            finalize(() => delete this.actionLoading[addressId]) // Her durumda loading'i bitir
        ).subscribe({
            next: (updatedAddresses) => {
                console.log(`Address ID: ${addressId} set as default.`);
                this.notificationService.showSuccess('Adres varsayılan olarak ayarlandı.');
                // Servis güncel listeyi döndürse de, listeyi yeniden yüklemek daha basit
                this.loadAddresses();
            },
            error: (err) => {
                console.error(`Error setting default address ${addressId}:`, err);
                this.notificationService.showError(err.message || `Adres ${addressId} varsayılan yapılırken hata oluştu.`, 'İşlem Başarısız');
            }
        });
   }



     editProfileInfo(): void {
      console.log("Profil düzenleme formu açılıyor.");
      this.toggleProfileEditForm(true); // Formu göster
      // Sayfayı formun olduğu yere scroll ettirebiliriz (opsiyonel)
      // window.scrollTo({ top: 0, behavior: 'smooth' });
    }


saveProfile(): void {
  this.profileForm.markAllAsTouched();
  if (this.profileForm.invalid || this.isSavingProfile) {
      return;
  }

  this.isSavingProfile = true;
  this.profileError = null;

  const userId = this.authService.currentUserValue?.id;
  if (!userId) {
      this.profileError = "Kullanıcı ID bulunamadı.";
      this.isSavingProfile = false;
      return;
  }

  const formValue = this.profileForm.value;
  // Profile modeline uygun payload oluştur
  const profilePayload: Partial<Profile> = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      phoneNumber: formValue.phoneNumber || undefined // Boşsa undefined gönder
      // dateOfBirth: formValue.dateOfBirth,
      // sex: formValue.sex
  };

  this.userService.updateUserProfile(userId, profilePayload).pipe(
      finalize(() => this.isSavingProfile = false)
  ).subscribe({
      next: (updatedProfile) => {
          this.notificationService.showSuccess('Profil bilgileri başarıyla güncellendi!');
          this.toggleProfileEditForm(false); // Formu kapat
          // ÖNEMLİ: Auth Service'teki currentUser'ı güncellememiz gerekiyor!
          // Yoksa header vb. eski bilgiyi gösterir.
          this.authService.refreshCurrentUserState(updatedProfile); // AuthService'e böyle bir metot ekle
          // this.currentUser$ observable'ı otomatik güncellenecektir.
      },
      error: (err) => {
          console.error("Error updating profile:", err);
          this.profileError = err.message || 'Profil güncellenirken bir hata oluştu.';
      }
  });
}


} // UserProfileComponent sınıfının sonu
