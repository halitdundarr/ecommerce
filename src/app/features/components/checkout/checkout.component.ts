import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { Address } from '../../../shared/models/user.model';
import { CartService } from '../../../core/services/cart.service'; // CartService import et
import { Cart } from '../../../shared/models/cart.model'; // Cart modelini import et
import { OrderService, CreateOrderRequest } from '../../../core/services/order.service'; // OrderService ve tipleri import et
import { Router } from '@angular/router';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  standalone: false
})
export class CheckoutComponent implements OnInit {

  addresses$: Observable<Address[]> = of([]);
  cart$: Observable<Cart | null>; // Cart observable'ı
  selectedAddressId: number | null = null;
  showNewAddressForm: boolean = false;
  newAddressForm!: FormGroup;
  isLoadingAddresses = false;
  isSavingAddress = false;
  addressError: string | null = null;

  // Yeni eklenenler
  paymentMethods: string[] = ['CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL']; // Örnek ödeme yöntemleri
  selectedPaymentMethod: string | null = null;
  isPlacingOrder = false; // Sipariş veriliyor durumu
  orderError: string | null = null; // Sipariş hatası mesajı

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router,
    private cartService: CartService, // CartService inject et
    private orderService: OrderService // OrderService inject et
    ) {
       // Cart observable'ını constructor'da al
       this.cart$ = this.cartService.getCart();
     }

  ngOnInit(): void {
    this.loadAddresses();
    this.initializeNewAddressForm();
  }

  loadAddresses(): void {
    // ... (Bu metot aynı kalabilir)
     this.isLoadingAddresses = true;
     this.addressError = null;
     this.addresses$ = this.userService.getUserAddresses();
      this.addresses$.subscribe({
           next: (addresses) => {
               const defaultAddress = addresses.find(a => a.isDefault);
               if (defaultAddress && !this.selectedAddressId) {
                   this.selectedAddressId = defaultAddress.id ?? null;
               }
               this.isLoadingAddresses = false;
           },
           error: (err) => {
               console.error("Error loading addresses:", err);
               this.addressError = "Adresler yüklenirken bir hata oluştu.";
               this.isLoadingAddresses = false;
           }
      });
  }

  initializeNewAddressForm(): void {
      // ... (Bu metot aynı kalabilir)
       this.newAddressForm = this.fb.group({ /* ... */ });
  }

  selectAddress(addressId: number | undefined | null): void {
      // ... (Bu metot aynı kalabilir)
      if(addressId) { this.selectedAddressId = addressId; }
  }

  toggleNewAddressForm(): void {
    // ... (Bu metot aynı kalabilir)
     this.showNewAddressForm = !this.showNewAddressForm;
     if (this.showNewAddressForm) { this.selectedAddressId = null; }
      this.newAddressForm.reset({country: 'Türkiye'});
  }

  saveNewAddress(): void {
     // ... (Bu metot aynı kalabilir)
      if (this.newAddressForm.invalid || this.isSavingAddress) { return; }
      this.isSavingAddress = true; this.addressError = null;
      this.userService.addAddress(this.newAddressForm.value).subscribe({
          next: (savedAddress) => { /* ... */ this.isSavingAddress = false; this.showNewAddressForm = false; this.loadAddresses(); this.selectedAddressId = savedAddress.id ?? null; },
          error: (err) => { /* ... */ this.addressError = "Adres kaydedilirken hata."; this.isSavingAddress = false; }
      });
  }

  // Ödeme Yöntemi Seçme
  selectPaymentMethod(method: string): void {
      this.selectedPaymentMethod = method;
      console.log('Selected Payment Method:', this.selectedPaymentMethod);
  }

  // Sipariş Verme Metodu
  placeOrder(): void {
    this.orderError = null; // Hata mesajını sıfırla

    // Gerekli seçimler yapılmış mı kontrol et
    if (!this.selectedAddressId) {
      this.orderError = "Lütfen bir teslimat adresi seçin.";
      window.scrollTo(0,0); // Sayfanın başına git
      return;
    }
    if (!this.selectedPaymentMethod) {
      this.orderError = "Lütfen bir ödeme yöntemi seçin.";
       window.scrollTo(0,0);
      return;
    }

    // Sepet boş mu kontrol et (CartService üzerinden)
    const currentCart = this.cartService.getCurrentCartValue();
    if (!currentCart || currentCart.items.length === 0) {
         this.orderError = "Sipariş vermek için sepetinizde ürün bulunmalıdır.";
          window.scrollTo(0,0);
         return;
    }


    this.isPlacingOrder = true; // Yükleniyor durumunu başlat

    // Sipariş verisini hazırla (backend'in beklediği formata göre)
    const orderRequest: CreateOrderRequest = {
      shippingAddressId: this.selectedAddressId,
      billingAddressId: this.selectedAddressId, // Şimdilik aynı varsayalım
      paymentMethod: this.selectedPaymentMethod,
    };

    // OrderService üzerinden siparişi oluştur
    this.orderService.createOrder(orderRequest).subscribe({
      next: (response) => { // response artık frontend 'Order' tipinde
          this.isPlacingOrder = false;
          console.log('Order placed successfully:', response);
          // --- YÖNLENDİRMEYİ GÜNCELLE ---
          // Alert yerine onay sayfasına yönlendir
          // alert(`Mock siparişiniz başarıyla alındı! Sipariş ID: ${response.id}`);
          this.router.navigate(['/features/order-confirmed', response.id]); // response.id veya response.orderId (backend DTO'ya göre)
          // --- ---
      },
      error: (err: Error) => { // Error tipini Error yapalım
          this.isPlacingOrder = false;
          console.error('Error placing order:', err);
          this.orderError = err.message || "Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.";
          window.scrollTo(0,0);
      }
  });
  }

   // proceedToPayment metodunu silebilir veya placeOrder olarak değiştirebiliriz.
   // Şimdilik placeOrder kullanıyoruz.
}
