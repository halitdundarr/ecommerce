import { Component, OnInit } from '@angular/core';
import { delay, Observable, of } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms'; // Formlar için
import { AuthService } from '../../../core/services/auth.service'; // Mevcut kullanıcı bilgisi için
import { UserSummary } from '../../../shared/models/user.model'; // User modeli
// import { SellerService } from '../../services/seller.service'; // Satıcıya özel servis (ileride oluşturulabilir)

@Component({
  selector: 'app-seller-settings',
  templateUrl: './seller-settings.component.html',
  styleUrls: ['./seller-settings.component.scss'],
  standalone:false
})
export class SellerSettingsComponent implements OnInit {

  currentUser$: Observable<UserSummary | null>;
  storeInfoForm!: FormGroup;
  paymentInfoForm!: FormGroup; // Ödeme bilgileri formu (Örnek)

  isSubmittingStoreInfo = false;
  storeInfoError: string | null = null;
  storeInfoSuccess: string | null = null;

  // Örnek diğer formlar için de benzer state'ler
  isSubmittingPaymentInfo = false;
  paymentInfoError: string | null = null;
  paymentInfoSuccess: string | null = null;


  constructor(
    private authService: AuthService,
    private fb: FormBuilder
    // private sellerService: SellerService // İleride
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.initializeForms();
    // TODO: Backend'den mevcut satıcı ayarlarını yükle ve formu doldur
    // this.loadSellerSettings();
  }

  initializeForms(): void {
    // Mağaza Bilgileri Formu (Örnek Alanlar)
    this.storeInfoForm = this.fb.group({
      storeName: ['', Validators.required],
      storeDescription: ['']
      // iban: ['', Validators.required] // Gerçek alanlar backend'e göre belirlenmeli
    });

    // Ödeme Bilgileri Formu (Örnek Alanlar - Hassas Veri Dikkat!)
    this.paymentInfoForm = this.fb.group({
       bankName: ['', Validators.required],
       accountHolder: ['', Validators.required],
       iban: ['', [Validators.required /* , IBAN Validator */]] // Özel IBAN validator gerekebilir
    });
  }

  // Örnek: Mağaza Bilgilerini Kaydetme
  saveStoreInfo(): void {
    this.storeInfoForm.markAllAsTouched();
    if (this.storeInfoForm.invalid || this.isSubmittingStoreInfo) {
      return;
    }
    this.isSubmittingStoreInfo = true;
    this.storeInfoError = null;
    this.storeInfoSuccess = null;

    const payload = this.storeInfoForm.value;
    console.log("Saving Store Info (Mock):", payload);

    // --- Mock Kaydetme ---
    of(true).pipe(delay(1000)).subscribe({ // 1 saniye bekle
        next: () => {
            this.isSubmittingStoreInfo = false;
            this.storeInfoSuccess = "Mağaza bilgileri başarıyla güncellendi (Mock).";
            // Formu tekrar enable etmek veya resetlemek gerekebilir
        },
        error: (err) => {
            this.isSubmittingStoreInfo = false;
            this.storeInfoError = "Mağaza bilgileri güncellenirken hata oluştu (Mock).";
        }
    });
    // ---------------------

    /*
    // --- Backend Entegrasyonu (İleride) ---
    // this.sellerService.updateStoreInfo(payload).subscribe({
    //   next: () => {
    //     this.isSubmittingStoreInfo = false;
    //     this.storeInfoSuccess = "Mağaza bilgileri başarıyla güncellendi.";
    //   },
    //   error: (err) => {
    //     this.isSubmittingStoreInfo = false;
    //     this.storeInfoError = "Mağaza bilgileri güncellenirken bir hata oluştu.";
    //     console.error("Error updating store info:", err);
    //   }
    // });
    // ---------------------------------------
    */
  }

   // Örnek: Ödeme Bilgilerini Kaydetme
   savePaymentInfo(): void {
     this.paymentInfoForm.markAllAsTouched();
     if (this.paymentInfoForm.invalid || this.isSubmittingPaymentInfo) {
       return;
     }
     this.isSubmittingPaymentInfo = true;
     this.paymentInfoError = null;
     this.paymentInfoSuccess = null;

     const payload = this.paymentInfoForm.value;
     console.log("Saving Payment Info (Mock - Sensitive Data!):", payload);

     // Mock veya Backend çağrısı... (Store Info'ya benzer)
     of(true).pipe(delay(1000)).subscribe({
         next: () => {
             this.isSubmittingPaymentInfo = false;
             this.paymentInfoSuccess = "Ödeme bilgileri başarıyla güncellendi (Mock).";
         },
         error: (err) => {
             this.isSubmittingPaymentInfo = false;
             this.paymentInfoError = "Ödeme bilgileri güncellenirken hata oluştu (Mock).";
         }
     });
   }

  // Form kontrollerine kolay erişim (Örnek)
  get storeName() { return this.storeInfoForm.get('storeName'); }
  get iban() { return this.paymentInfoForm.get('iban'); }
}
