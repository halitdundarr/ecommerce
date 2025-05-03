import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service'; // Kullanıcı bilgisi için
import { UserService } from '../../../core/services/user.service'; // Adresler için
import { UserSummary, Address } from '../../../shared/models/user.model'; // Modeller
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Adres ekleme formu için

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone:false
})
export class UserProfileComponent implements OnInit {

  currentUser$: Observable<UserSummary | null>;
  addresses$: Observable<Address[]> = of([]);

  // Profil Düzenleme (Sonraki adımda eklenecek)
  // editProfileForm!: FormGroup;
  // isEditingProfile = false;

  // Adres Yönetimi
  showNewAddressForm = false;
  newAddressForm!: FormGroup; // Henüz initialize edilmedi
  isLoadingAddresses = false;
  isSavingAddress = false;
  addressError: string | null = null;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder // FormBuilder inject
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadAddresses();
    this.initializeNewAddressForm(); // Adres formunu initialize et
    // this.initializeEditProfileForm(); // Profil düzenleme formu için (ileride)
  }

  // Mevcut Adresleri Yükle
  loadAddresses(): void {
    this.isLoadingAddresses = true;
    this.addressError = null;
    this.addresses$ = this.userService.getUserAddresses();
    this.addresses$.subscribe({
        // next/error handling eklenebilir (CheckoutComponent'teki gibi)
        next: () => this.isLoadingAddresses = false,
        error: (err) => {
            console.error("Error loading addresses:", err);
            this.addressError = "Adresler yüklenirken bir hata oluştu.";
            this.isLoadingAddresses = false;
        }
    });
  }

  // Yeni Adres Formunu Başlat
  initializeNewAddressForm(): void {
    // CheckoutComponent'teki form yapısını kullanabiliriz
    this.newAddressForm = this.fb.group({
        addressTitle: ['', Validators.required],
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        street: ['', Validators.required],
        city: ['', Validators.required],
        postalCode: ['', Validators.required], // DÜZELTME: postalCode olmalı
        country: ['Türkiye', Validators.required], // Varsayılan değer
        phoneNumber: ['', Validators.required]
        // isDefault alanı backend tarafından yönetilebilir veya ayrı bir metotla ayarlanır
    });
  }

  // Yeni Adres Formunu Göster/Gizle
  toggleNewAddressForm(): void {
    this.showNewAddressForm = !this.showNewAddressForm;
    if (!this.showNewAddressForm) {
        this.newAddressForm.reset({ country: 'Türkiye' }); // Kapatırken formu sıfırla
        this.addressError = null; // Hataları temizle
    }
  }

  // Yeni Adresi Kaydet
  saveNewAddress(): void {
     this.newAddressForm.markAllAsTouched();
     if (this.newAddressForm.invalid || this.isSavingAddress) { return; }

     this.isSavingAddress = true;
     this.addressError = null;

     // UserService'teki addAddress metodunu kullan
     this.userService.addAddress(this.newAddressForm.value).subscribe({
         next: (savedAddress) => {
             console.log("Address saved:", savedAddress);
             this.isSavingAddress = false;
             this.showNewAddressForm = false; // Formu gizle
             this.loadAddresses(); // Listeyi yenile
             this.newAddressForm.reset({ country: 'Türkiye' }); // Formu temizle
             alert('Adres başarıyla kaydedildi.');
         },
         error: (err) => {
             console.error("Error saving address:", err);
             this.addressError = "Adres kaydedilirken bir hata oluştu. Lütfen bilgileri kontrol edin.";
             this.isSavingAddress = false;
         }
     });
  }

  // Adresi Sil (Backend implementasyonu gerektirir)
  deleteAddress(addressId: number | undefined): void {
      if (!addressId) return;
      if (confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
          console.log(`Deleting address ID: ${addressId} (Backend integration needed)`);
          alert(`Adres ID ${addressId} silinecek (Backend bağlantısı gerekli).`);
          // this.userService.deleteAddress(addressId).subscribe(...)
      }
  }

   // Adresi Düzenle (Formu doldurma ve update mantığı gerektirir)
   editAddress(address: Address): void {
       console.log('Editing address:', address);
       alert('Adres düzenleme formu açılacak (Uygulanmadı).');
       // Yeni adres formunu bu adresin bilgileriyle doldurabilir ve toggle edebiliriz.
       // this.newAddressForm.patchValue(address);
       // this.showNewAddressForm = true;
       // Kaydetme mantığı updateAddress servisine bağlanmalı.
   }

   // Varsayılan Adres Yap (Backend implementasyonu gerektirir)
   makeDefaultAddress(addressId: number | undefined): void {
        if (!addressId) return;
        console.log(`Making address ID: ${addressId} default (Backend integration needed)`);
        alert(`Adres ID ${addressId} varsayılan yapılacak (Backend bağlantısı gerekli).`);
        // this.userService.setDefaultAddress(addressId).subscribe(...)
   }

  // Profil Düzenleme Formunu Başlat (İleride)
  // initializeEditProfileForm(): void { ... }

  // Profil Bilgilerini Kaydet (İleride)
  // saveProfile(): void { ... }

  // Şifre Değiştirme (İleride)
  // changePassword(): void { ... }

}
