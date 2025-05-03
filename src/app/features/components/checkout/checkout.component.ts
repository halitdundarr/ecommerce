import { Component, OnInit, ViewChild } from '@angular/core'; // ViewChild ekleyin
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of, switchMap, catchError, throwError } from 'rxjs'; // throwError ekleyin
import { UserService } from '../../../core/services/user.service';
import { Address, UserSummary } from '../../../shared/models/user.model'; // UserSummary ekleyin (kullanıcı adı için)
import { CartService } from '../../../core/services/cart.service';
import { Cart } from '../../../shared/models/cart.model';
import { OrderService, CreateOrderRequest } from '../../../core/services/order.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service'; // AuthService ekleyin (kullanıcı adı için)
import { NotificationService } from '../../../core/services/notification.service'; // Import et

// --- Stripe için importlar ---
import { StripeCardElementOptions, StripeElementsOptions, PaymentIntent } from '@stripe/stripe-js';
import { StripeCardComponent, StripeFactoryService, StripeService } from 'ngx-stripe';
// --- ---

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  standalone: false
})
export class CheckoutComponent implements OnInit {

  // --- Stripe için ViewChild ---
  @ViewChild('stripeCard') stripeCard?: StripeCardComponent;
  // --- ---

  addresses$: Observable<Address[]> = of([]);
  cart$: Observable<Cart | null>;
  selectedAddressId: number | null = null;
  showNewAddressForm: boolean = false;
  newAddressForm!: FormGroup;
  isLoadingAddresses = false;
  isSavingAddress = false;
  addressError: string | null = null;

  paymentMethods: string[] = ['CREDIT_CARD', 'BANK_TRANSFER', 'PAYPAL'];
  selectedPaymentMethod: string | null = null;
  isPlacingOrder = false;
  orderError: string | null = null;
  stripeError: string | null = null; // Stripe'a özel hata mesajı

  // --- Stripe için Options ---
  cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        iconColor: '#666EE8',
        color: '#31325F',
        fontWeight: '300',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: '18px',
        '::placeholder': {
          color: '#CFD7E0'
        }
      }
    }
  };

  elementsOptions: StripeElementsOptions = {
    locale: 'tr' // veya 'auto'
  };
  // --- ---

  currentUser: UserSummary | null = null; // Kullanıcı bilgisini tutmak için

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router,
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService, // AuthService inject et
    private stripeService: StripeService, // StripeService inject et
    private notificationService: NotificationService
  ) {
       this.cart$ = this.cartService.getCart();
       this.currentUser = this.authService.currentUserValue; // Kullanıcıyı al
     }

  ngOnInit(): void {
    this.loadAddresses();
    this.initializeNewAddressForm();
  }

  // loadAddresses, initializeNewAddressForm, selectAddress, toggleNewAddressForm, saveNewAddress metotları aynı kalabilir...
  loadAddresses(): void {
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
  // addressTitle, firstName, lastName user profile component'ten kopyalanabilir
  this.newAddressForm = this.fb.group({
    addressTitle: ['', Validators.required],
    firstName: [this.currentUser?.firstName || '', Validators.required],
    lastName: [this.currentUser?.lastName || '', Validators.required],
    street: ['', Validators.required],
    city: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['Türkiye', Validators.required],
    phoneNumber: ['', Validators.required],
    isDefault: [false],
    isBilling: [true],
    isShipping: [true]
  });
}

selectAddress(addressId: number | undefined | null): void {
    if(addressId !== undefined && addressId !== null) {
         this.selectedAddressId = addressId;
         console.log("Selected Address ID:", this.selectedAddressId);
    }
}

toggleNewAddressForm(): void {
  this.showNewAddressForm = !this.showNewAddressForm;
  if (this.showNewAddressForm) { this.selectedAddressId = null; }
  this.newAddressForm.reset({
      country: 'Türkiye',
      firstName: this.currentUser?.firstName || '', // Formu sıfırlarken de kullanıcı adını ekle
      lastName: this.currentUser?.lastName || ''
  });
  this.addressError = null;
}

saveNewAddress(): void {
   this.newAddressForm.markAllAsTouched();
   if (this.newAddressForm.invalid || this.isSavingAddress) { return; }
   this.isSavingAddress = true; this.addressError = null;

   // Servise göndermeden önce isim/soyisim formdan mı user'dan mı alınacak netleştirilmeli.
   // Şu anki userService.addAddress DTO'su isim/soyisim beklemiyor gibi.
   const payload = this.newAddressForm.value;
   delete payload.firstName; // DTO'da yoksa sil
   delete payload.lastName; // DTO'da yoksa sil

   this.userService.addAddress(payload).subscribe({ // payload'ı gönder
       next: (savedAddress) => {
            this.isSavingAddress = false;
            this.showNewAddressForm = false;
            this.notificationService.showSuccess('Yeni adres başarıyla kaydedildi!'); // <-- Başarı bildirimi
            this.loadAddresses(); // Adres listesini yenile
            this.selectedAddressId = savedAddress.id ?? null; // Yeni adresi seçili yap
       },
       error: (err) => {
           this.addressError = err.message || "Adres kaydedilirken hata oluştu.";
           this.isSavingAddress = false;
       }
   });
}


  // Ödeme Yöntemi Seçme
  selectPaymentMethod(method: string): void {
      this.selectedPaymentMethod = method;
      this.stripeError = null; // Yöntem değişince Stripe hatasını temizle
      console.log('Selected Payment Method:', this.selectedPaymentMethod);
  }

  // handlePlaceOrder butona bağlanan yeni metot
  handlePlaceOrder(): void {
    this.orderError = null;
    this.stripeError = null;

    // Adres ve ödeme yöntemi seçimi kontrolü
    if (!this.selectedAddressId || !this.selectedPaymentMethod) {
      this.orderError = "Lütfen teslimat adresi ve ödeme yöntemi seçin.";
      window.scrollTo(0,0);
      return;
    }

    // Sepet kontrolü
    const currentCart = this.cartService.getCurrentCartValue();
    if (!currentCart || currentCart.items.length === 0) {
         this.orderError = "Sipariş vermek için sepetinizde ürün bulunmalıdır.";
         window.scrollTo(0,0);
         return;
    }

    this.isPlacingOrder = true;

    // Ödeme yöntemine göre işlem yap
    if (this.selectedPaymentMethod === 'CREDIT_CARD') {
      this.processStripePayment();
    } else {
      // Diğer ödeme yöntemleri için (Havale, PayPal vb.)
      // Direkt backend'e istek gönderilebilir (ödeme onayı beklemeden)
      // Backend bu siparişleri 'PENDING_PAYMENT' gibi bir statü ile oluşturabilir.
      console.log(`Proceeding with ${this.selectedPaymentMethod}`);
      this.createOrderOnBackend(); // Ödeme ID olmadan sipariş oluşturmayı dene
    }
  }

  // Stripe Ödeme İşlemi
  private processStripePayment(): void {
    if (!this.stripeCard) {
      this.stripeError = "Kart bilgileri alanı yüklenemedi.";
      this.isPlacingOrder = false;
      return;
    }

    // Backend'den Payment Intent'in client_secret'ını almamız gerekiyor.
    // Bu genellikle sepet tutarı ve para birimi ile backend'e bir istek atarak yapılır.
    // Şimdilik bunu simüle edeceğiz veya OrderService'te ayrı bir metot varsayacağız.

    // Örnek: Backend'den client_secret alma (OrderService'e eklenmeli)
    // this.orderService.createPaymentIntent().pipe(
    //   switchMap(response => {
    //     const clientSecret = response.clientSecret; // Backend'den gelen secret
    //     if (!clientSecret) {
    //         throw new Error("Ödeme başlatılamadı (client_secret alınamadı).");
    //     }

    //     // Fatura adresi bilgilerini Stripe'a göndermek için hazırla
    //     const billingDetails: any = { // Tip any veya Stripe'ın BillingDetails tipi olabilir
    //         name: `${this.currentUser?.firstName || ''} ${this.currentUser?.lastName || ''}`.trim(),
    //         email: this.currentUser?.email,
    //         // Adres bilgisi seçili adresten alınabilir
    //         // address: { ... }
    //     };

    //     console.log("Confirming card payment with Stripe...");
    //     return this.stripeService.confirmCardPayment(clientSecret, {
    //       payment_method: {
    //         card: this.stripeCard.element,
    //         billing_details: billingDetails
    //       }
    //     });
    //   }),
    //   catchError(err => {
    //       console.error("Error creating payment intent:", err);
    //       this.orderError = "Ödeme işlemi başlatılırken bir hata oluştu.";
    //       this.isPlacingOrder = false;
    //       return EMPTY; // Observable'ı bitir
    //   })
    // ).subscribe(result => {
    //      this.handleStripeResult(result);
    // });

    // --- ŞİMDİLİK PLACEHOLDER: client_secret olmadan paymentMethod oluşturma ---
    // Bu yöntemle ödeme backend'de ayrıca onaylanmalı!
    console.warn("Stripe Payment Method creation is used (requires backend confirmation)");
    this.stripeService.createPaymentMethod({
        type: 'card',
        card: this.stripeCard.element,
        billing_details: {
            name: `${this.currentUser?.firstName || ''} ${this.currentUser?.lastName || ''}`.trim(),
            email: this.currentUser?.email ?? undefined, // email null ise undefined gönder
            // phone: ..., // Gerekirse UserService'ten veya Address'ten alınabilir
            // address: { ... } // Seçilen adresten map edilebilir
        }
    }).subscribe(result => {
        if (result.paymentMethod) {
            console.log("Stripe Payment Method created:", result.paymentMethod.id);
            // Ödeme başarılıysa backend'e siparişi oluşturma isteği gönder
            this.createOrderOnBackend(result.paymentMethod.id);
        } else if (result.error) {
            // Hata varsa göster
            console.error("Stripe error:", result.error);
            this.stripeError = result.error.message || "Kart bilgileri işlenirken bir hata oluştu.";
            this.isPlacingOrder = false;
        }
    });
    // --- PLACEHOLDER SONU ---
  }

  // // Stripe confirmCardPayment sonucu işleme (Payment Intent kullanılırsa)
  // private handleStripeResult(result: any): void { // Tip Stripe.PaymentIntentResult olabilir
  //   if (result.error) {
  //     console.error('Stripe Payment Error:', result.error.message);
  //     this.stripeError = result.error.message || "Ödeme sırasında bir hata oluştu.";
  //     this.isPlacingOrder = false;
  //   } else {
  //     // Ödeme başarılıysa (veya additional action gerektirmiyorsa)
  //     if (result.paymentIntent.status === 'succeeded') {
  //       console.log('Stripe Payment Succeeded. Payment Intent ID:', result.paymentIntent.id);
  //       // Backend'e siparişi oluşturma isteği gönder
  //       this.createOrderOnBackend(result.paymentIntent.id);
  //     } else {
  //       console.warn('Stripe Payment requires action or has different status:', result.paymentIntent.status);
  //       this.orderError = `Ödeme durumu: ${result.paymentIntent.status}. Lütfen tekrar deneyin veya farklı bir yöntem seçin.`;
  //       this.isPlacingOrder = false;
  //     }
  //   }
  // }

  // Backend'e Sipariş Oluşturma İsteği Gönderme
  private createOrderOnBackend(paymentConfirmationId?: string): void {
    // OrderService'teki CreateOrderRequest güncellenmeli (Adım 5)
    const orderRequest: CreateOrderRequest = {
      shippingAddressId: this.selectedAddressId!, // Null kontrolü yapıldı
      billingAddressId: this.selectedAddressId!, // Şimdilik aynı
      paymentMethod: this.selectedPaymentMethod!, // Null kontrolü yapıldı
      paymentConfirmationId: paymentConfirmationId // Stripe'dan gelen ID (varsa)
    };

    console.log("Sending order creation request to backend:", orderRequest);

    this.orderService.createOrder(orderRequest).subscribe({
      next: (createdOrder) => {
          this.isPlacingOrder = false;
          console.log('Order placed successfully on backend:', createdOrder);
          this.router.navigate(['/order-confirmed', createdOrder.id]); // Onay sayfasına yönlendir
          // Sepeti temizleme OrderService içinde yapılıyor olmalı
      },
      error: (err: Error) => {
          this.isPlacingOrder = false;
          console.error('Error creating order on backend:', err);
          // Hata mesajını ayrıştır (Stok yetersiz vb. özel durumlar için)
          if (err.message.includes("Insufficient stock")) {
             this.orderError = "Üzgünüz, sepetteki bazı ürünlerin stoğu tükendi. Lütfen sepetinizi güncelleyin.";
          } else {
             this.orderError = err.message || "Sipariş oluşturulurken sunucu tarafında bir hata oluştu.";
          }
          window.scrollTo(0,0); // Hata mesajını görmek için yukarı kaydır
      }
    });
  }

   // placeOrder metodunu handlePlaceOrder olarak değiştirdik.
   // Eski placeOrder metodu artık kullanılmıyor.
}
