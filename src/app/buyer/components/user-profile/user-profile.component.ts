import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { UserSummary, Address } from '../../../shared/models/user.model';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service'; // <-- NotificationService import et
import { finalize } from 'rxjs/operators'; // finalize operatörünü import et

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone:false
})
export class UserProfileComponent implements OnInit {

  currentUser$: Observable<UserSummary | null>;
  addresses$: Observable<Address[]> = of([]);

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
    private notificationService: NotificationService // <-- Inject et
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadAddresses();
    this.initializeNewAddressForm();
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

} // UserProfileComponent sınıfının sonu
