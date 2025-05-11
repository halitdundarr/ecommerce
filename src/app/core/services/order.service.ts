// src/app/core/services/order.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'; // isPlatformBrowser import edildiğinden emin olun
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError, EMPTY } from 'rxjs'; // EMPTY eklendi (createPaymentIntent hatası için)
import { map, catchError, tap, switchMap, first, finalize } from 'rxjs/operators';
import { Cart, CartItem } from '../../shared/models/cart.model';
import { Order, OrderStatus, OrderItem, ReturnStatus } from '../../shared/models/order.model';
import { Address, UserSummary } from '../../shared/models/user.model';
import { Payment, PaymentIssue, Shipment, ShipmentStatus } from '../../shared/models/common.model'; // Payment/Shipment modelleri
import { ProductSummary } from '../../shared/models/product.model';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { environment } from '../../../environments/environment'; // <-- environment import et

// --- Backend DTO Arayüzleri ---
// Bu arayüzlerin backend API'nizin döndürdüğü ve kabul ettiği yapılarla eşleştiğinden emin olun.
interface BackendDtoAddress {
    addressId: number;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
    isDefault: boolean;
    isBilling: boolean;
    isShipping: boolean;
    // Not: addressTitle, firstName, lastName DTO'da yoksa map fonksiyonu bunları yönetmeli
}
interface BackendDtoProductSummary {
    productId: number | string;
    name: string;
    price: any; // number veya string olabilir
    primaryImageUrl?: string;
    averageRating?: number;
    brand?: string;
    model?: string;
}
interface BackendDtoOrderItem {
    orderItemId: number;
    quantity: number;
    priceAtPurchase: any; // number veya string olabilir
    product: BackendDtoProductSummary;
    returnStatus?: string; // Backend'den geliyorsa
}
interface BackendDtoPaymentSummary {
    paymentId?: number;
    paymentMethod?: string;
    status?: string;
    amount?: any; // number veya string olabilir
    transactionId?: string;
}
interface BackendDtoShipmentSummary {
    shipmentId?: number;
    trackingNumber?: string;
    carrier?: string;
    status?: string;
    estimatedDeliveryDate?: string | Date;
    shippedDate?: string | Date;
    events?: { timestamp: string | Date; status: string; description: string; location?: string }[];
}
interface BackendDtoUserSummary {
    userId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
}
interface BackendDtoOrderResponse {
    orderId: number;
    orderNumber?: string;
    status: string; // OrderStatus enum string'i
    totalAmount: any; // number veya string olabilir
    createdAt: string | Date; // Backend'den gelen tarih formatı
    updatedAt?: string | Date;
    shippingAddress?: BackendDtoAddress;
    billingAddress?: BackendDtoAddress;
    items: BackendDtoOrderItem[];
    payment?: BackendDtoPaymentSummary;
    shipments?: BackendDtoShipmentSummary[];
    customer?: BackendDtoUserSummary;
}

interface BackendDtoOrderItemRequest {
    productId: number | string;
    quantity: number;
}

// === BackendDtoOrderRequest GÜNCELLENDİ (Backend kabul ediyorsa) ===
interface BackendDtoOrderRequest {
    shippingAddressId: number;
    billingAddressId: number;
    items: BackendDtoOrderItemRequest[];
    paymentConfirmationId?: string; // Ödeme onay ID'si (Stripe vb.)
}
// -----------------------------------------------------------

// === CreateOrderRequest GÜNCELLENDİ ===
export interface CreateOrderRequest {
    shippingAddressId: number;
    billingAddressId: number; // Fatura adresi farklıysa kullanılır
    paymentMethod: string; // Seçilen ödeme yöntemi
    paymentConfirmationId?: string; // Stripe vb. ödeme onay ID'si (opsiyonel)
}
// -----------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class OrderService {

  // --- API URL Sabitleri ---
  private readonly API_BASE_URL = environment.apiUrl;
  private readonly ORDER_API_URL = `${this.API_BASE_URL}/api/v1/orders`;
  private readonly SELLER_API_URL = `${this.API_BASE_URL}/api/v1/seller`;
  private readonly ADMIN_API_URL = `${this.API_BASE_URL}/api/v1/admin`;
  // -----------------------------------------------------

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cartService: CartService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * Yeni bir sipariş oluşturur.
   * Frontend'den gelen CreateOrderRequest'i alır, backend'e uygun DTO'ya çevirir.
   */
  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    const currentCart = this.cartService.getCurrentCartValue();
    if (!currentCart || currentCart.items.length === 0) {
        return throwError(() => new Error('Sipariş vermek için sepetinizde ürün bulunmalıdır.'));
    }
    const currentUser = this.authService.currentUserValue;
    if (!currentUser?.id) {
        return throwError(() => new Error('Sipariş vermek için giriş yapmalısınız.'));
    }

    // === Backend'e gönderilecek DTO GÜNCELLENDİ ===
    const backendRequest: BackendDtoOrderRequest = {
        shippingAddressId: orderData.shippingAddressId,
        billingAddressId: orderData.billingAddressId, // Farklı fatura adresi desteği varsa kullanılır
        items: currentCart.items.map(cartItem => ({
            productId: cartItem.productId,
            quantity: cartItem.quantity
        })),
        paymentConfirmationId: orderData.paymentConfirmationId // <-- Ödeme ID'si eklendi
    };
    // === ===

    const url = this.ORDER_API_URL;
    console.log(`Sending order request to backend: ${url}`, backendRequest);

    // Backend'den BackendDtoOrderResponse bekle
    return this.http.post<BackendDtoOrderResponse>(url, backendRequest).pipe(
        map(dtoResponse => this.mapDtoOrderResponseToOrder(dtoResponse)), // Yanıtı Order modeline map et
        tap(createdOrder => {
            if (createdOrder && isPlatformBrowser(this.platformId)) {
                console.log('Order created successfully, clearing cart.');
                this.cartService.clearCart(); // Başarılı sipariş sonrası sepeti temizle (tarayıcıda)
            }
        }),
        catchError(this.handleError) // Hata yönetimi
    );
  }

  /**
   * Mevcut kullanıcının siparişlerini getirir.
   */
  getOrders(): Observable<Order[]> {
    const url = `${this.ORDER_API_URL}/my-orders`; // Kullanıcıya özel endpoint
    console.log(`Workspaceing user orders from: ${url}`);
    // Backend'den BackendDtoOrderResponse[] bekle
    return this.http.get<BackendDtoOrderResponse[]>(url).pipe(
      map(dtoResponses => dtoResponses.map(dto => this.mapDtoOrderResponseToOrder(dto))),
      catchError(this.handleError)
    );
  }

  /**
   * Belirli bir siparişin detaylarını getirir.
   */
  getOrderById(orderId: number | string): Observable<Order | undefined> {
    const url = `${this.ORDER_API_URL}/${orderId}`;
    console.log(`Workspaceing order detail from: ${url}`);
    // Backend'den BackendDtoOrderResponse bekle
    return this.http.get<BackendDtoOrderResponse>(url).pipe(
      map(dtoResponse => this.mapDtoOrderResponseToOrder(dtoResponse)),
      catchError(err => {
        if (err.status === 404) {
          console.warn(`Order not found on backend: ${orderId}`);
          return of(undefined); // Bulunamadıysa undefined dön
        } else if (err.status === 403) {
           console.error(`Unauthorized access to order ${orderId}`);
           return throwError(() => new Error('Bu siparişi görüntüleme yetkiniz yok.'));
        }
        // Diğer hataları handleError yönetsin
        return this.handleError(err);
      })
    );
  }

  /**
   * Mevcut giriş yapmış satıcının siparişlerini getirir.
   */
  getOrdersForCurrentSeller(): Observable<Order[]> {
      const url = `${this.SELLER_API_URL}/orders/my`; // Satıcıya özel endpoint
      console.log(`Workspaceing orders for current seller from: ${url}`);

       if (!this.authService.currentUserValue?.id || this.authService.currentUserValue?.role !== 'SELLER') {
          console.error('Attempted to fetch seller orders without SELLER role.');
          return throwError(() => new Error('Satıcı siparişlerini getirmek için yetki yok.'));
      }

      return this.http.get<BackendDtoOrderResponse[]>(url).pipe(
          map(dtoResponses => dtoResponses.map(dto => this.mapDtoOrderResponseToOrder(dto))),
          catchError(err => {
              if (err.status === 404) {
                  console.error(`Backend endpoint ${url} not found.`);
                  return throwError(() => new Error('Satıcı siparişleri endpoint\'i bulunamadı.'));
              }
              return this.handleError(err);
          })
      );
  }

  // --- Admin Sipariş Yönetimi Metotları ---

  /**
   * Tüm siparişleri (veya filtrelenmiş) admin için getirir.
   */
  getAllOrdersForAdmin(filters?: any): Observable<Order[]> {
      const url = this.ORDER_API_URL; // Ana order endpoint'i (admin yetkisiyle çağrılır)
      console.log(`Workspaceing all orders for admin from: ${url}`);
      let params = new HttpParams();
      // if (filters?.status) params = params.set('status', filters.status);
      // ...

      return this.http.get<BackendDtoOrderResponse[]>(url, { params }).pipe(
           map(dtoResponses => dtoResponses.map(dto => this.mapDtoOrderResponseToOrder(dto))),
           catchError(this.handleError)
      );
  }



  /**
   * Bir siparişin durumunu günceller (Admin için).
   */
  updateOrderStatus(orderId: number | string, newStatus: OrderStatus): Observable<Order | undefined> {
       const url = `${this.ORDER_API_URL}/${orderId}/status`; // Durum güncelleme endpoint'i
       let params = new HttpParams().set('status', newStatus.toString()); // status query param olarak
       console.log(`Updating order ${orderId} status to ${newStatus} at ${url}`);

       return this.http.put<BackendDtoOrderResponse>(url, null, { params }).pipe( // Body null
            map(dtoResponse => this.mapDtoOrderResponseToOrder(dtoResponse)),
            catchError(this.handleError)
       );
  }

  // === Backend'den Payment Intent client_secret almak için ÖRNEK metot ===
  // Bu metodun backend tarafında implementasyonu gerekir.
  // Sepet tutarını ve para birimini alıp backend'e gönderir.
  createPaymentIntent(): Observable<{ clientSecret: string }> {
      const url = `${this.ORDER_API_URL}/create-payment-intent`; // Örnek endpoint
      const currentCart = this.cartService.getCurrentCartValue();
      const amount = currentCart ? currentCart.totalPrice * 100 : 0; // Stripe cent bekler
      const currency = 'try'; // Para birimi (veya dinamik)

      if (amount <= 0) {
          return throwError(() => new Error("Ödeme başlatılamadı: Sepet tutarı geçersiz."));
      }

      console.log(`Requesting payment intent from ${url} for amount: ${amount} ${currency}`);
      // Backend bu isteği alıp Stripe ile Payment Intent oluşturup clientSecret dönmeli
      return this.http.post<{ clientSecret: string }>(url, { amount, currency }).pipe(
          tap(response => console.log("Received clientSecret from backend.")),
          catchError(err => {
              console.error("Error creating payment intent on backend:", err);
              // handleError'a göndermeden önce daha spesifik bir mesaj verebiliriz
              return throwError(() => new Error(err.error?.message || 'Ödeme işlemi başlatılamadı.'));
          })
      );
  }
  // === --- ===


  // --- DTO -> Model Dönüşüm Yardımcıları ---

  private mapDtoOrderResponseToOrder(dto: BackendDtoOrderResponse): Order {
      return {
          id: dto.orderId,
          orderNumber: dto.orderNumber,
          // Tarih DTO'dan string geliyorsa Date'e çevir
          orderDate: typeof dto.createdAt === 'string' ? new Date(dto.createdAt) : dto.createdAt,
          userId: dto.customer?.userId ?? 0,
          items: dto.items?.map(itemDto => this.mapDtoOrderItemToOrderItem(itemDto)) ?? [],
          // Adres map ederken müşteri DTO'sundan isim/soyisim almaya çalış
          billingAddress: dto.billingAddress ? this.mapDtoAddressToAddress(dto.billingAddress, dto.customer) : this.createEmptyAddress(),
          shippingAddress: dto.shippingAddress ? this.mapDtoAddressToAddress(dto.shippingAddress, dto.customer) : this.createEmptyAddress(),
          status: dto.status as OrderStatus, // Tip dönüşümü
          totalPrice: this.parsePrice(dto.totalAmount), // Fiyatı parse et
          payment: dto.payment ? this.mapDtoPaymentSummaryToPayment(dto.payment) : undefined,
          shipments: dto.shipments?.map(shipDto => this.mapDtoShipmentSummaryToShipment(shipDto)) ?? []
      };
  }

  private mapDtoOrderItemToOrderItem(dto: BackendDtoOrderItem): OrderItem {
      const unitPrice = this.parsePrice(dto.priceAtPurchase);
      return {
          id: dto.orderItemId,
          productId: dto.product.productId,
          quantity: dto.quantity,
          unitPrice: unitPrice,
          totalPrice: unitPrice * dto.quantity, // Frontend'de hesapla
          product: this.mapDtoSummaryToProductSummary(dto.product),
          returnStatus: dto.returnStatus as ReturnStatus | undefined // Tip dönüşümü
      };
  }

  // Adres DTO'sunu map ederken müşteri DTO'sundan ad/soyad alır
  private mapDtoAddressToAddress(dto: BackendDtoAddress, customerDto?: BackendDtoUserSummary): Address {
      return {
          id: dto.addressId,
          street: dto.street,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          phoneNumber: dto.phoneNumber ?? '',
          isDefault: dto.isDefault,
          isBilling: dto.isBilling,
          isShipping: dto.isShipping,
          // Ad/Soyad DTO'da yoksa customer DTO'sundan al
          addressTitle: `Adres ${dto.addressId}`, // Örnek başlık
          firstName: customerDto?.firstName ?? '...', // DTO'da yoksa '...'
          lastName: customerDto?.lastName ?? '...' // DTO'da yoksa '...'
      };
   }

    // Boş adres nesnesi oluşturma
    private createEmptyAddress(): Address {
         return { id: 0, addressTitle: 'Yok', firstName: '', lastName: '', street: '', city: '', country: '', postalCode: '', phoneNumber: '' };
    }

   // Ürün özetini map etme
   private mapDtoSummaryToProductSummary(dto: BackendDtoProductSummary): ProductSummary {
     return {
         id: dto.productId,
         name: dto.name ?? 'İsimsiz Ürün', // null check
         price: this.parsePrice(dto.price),
         imageUrl: dto.primaryImageUrl,
         averageRating: dto.averageRating,
         brand: dto.brand,
         model: dto.model
     };
   }

   // Ödeme özetini map etme
   private mapDtoPaymentSummaryToPayment(dto: BackendDtoPaymentSummary): Payment {
        return {
            id: dto.paymentId,
            method: dto.paymentMethod as any, // Tip dönüşümü
            status: dto.status as any, // Tip dönüşümü
            amount: this.parsePrice(dto.amount),
            transactionId: dto.transactionId
            // paymentDate alanı DTO'da yoksa eklenmez
        }
   }

   // Kargo özetini map etme
   private mapDtoShipmentSummaryToShipment(dto: BackendDtoShipmentSummary): Shipment {
    return {
         id: dto.shipmentId,
         trackingNumber: dto.trackingNumber,
         carrier: dto.carrier,
         status: dto.status as ShipmentStatus, // Tip dönüşümü
         estimatedDelivery: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : undefined,
         shippedDate: dto.shippedDate ? new Date(dto.shippedDate) : undefined,
         // Kargo olaylarını map et
         events: dto.events?.map(eventDto => ({
             timestamp: typeof eventDto.timestamp === 'string' ? new Date(eventDto.timestamp) : eventDto.timestamp,
             status: eventDto.status,
             description: eventDto.description,
             location: eventDto.location
         })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // En yeniden eskiye sırala
         ?? [] // events yoksa boş dizi ata
    }
}
  // Fiyat parse etme (string veya number gelebilir)
  private parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
        // Virgül yerine nokta kullan (lokalizasyon sorunları için)
        const normalizedPrice = price.replace(',', '.');
        const parsed = parseFloat(normalizedPrice);
        return isNaN(parsed) ? 0 : parsed; // Geçersizse 0 dön
    }
    // Backend BigDecimal vb. döndürüyorsa, .toNumber() gibi bir metodu olabilir
    if (price && typeof price.toNumber === 'function') return price.toNumber();
    console.warn("Could not parse price:", price);
    return 0;
  }

   // --- Genel Hata Yönetimi ---
    private handleError(error: HttpErrorResponse): Observable<never> {
      let userMessage = 'Bilinmeyen bir sipariş işlemi hatası oluştu!';

       if (error.status === 0 || !error.error) {
        console.error('Ağ/İstemci hatası (OrderService):', error.message || error);
        userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
      } else {
        // Backend'den structure bir hata mesajı geliyorsa (örn: { message: "...", details: "..." })
        // veya sadece string mesaj geliyorsa ona göre parse et
        const backendError = error.error;
        const backendErrorMessage = backendError?.message || (typeof backendError === 'string' ? backendError : null);

        console.error(`Backend Hatası ${error.status} (OrderService), Gövde:`, backendError);

        if (backendErrorMessage) {
            // Backend'den gelen mesajı kullan
            userMessage = backendErrorMessage;
            // Stok yetersiz gibi özel durumları backend mesajından yakalayabiliriz
            if (userMessage.toLowerCase().includes('stock')) {
                userMessage = 'Sepetinizdeki bazı ürünlerin stoğu yetersiz.'; // Daha kullanıcı dostu mesaj
            }
        } else {
             // Genel HTTP durum kodlarına göre mesaj ata
             switch (error.status) {
                 case 400: userMessage = 'Geçersiz sipariş isteği (örn: stok yetersiz, geçersiz adres).'; break;
                 case 401: userMessage = 'Bu işlem için giriş yapmalısınız.'; break;
                 case 403: userMessage = 'Bu sipariş işlemi için yetkiniz yok.'; break;
                 case 404: userMessage = 'Sipariş veya ilgili kaynak bulunamadı.'; break;
                 case 409: userMessage = 'Sipariş durumu geçersiz veya işlem çakışması.'; break; // Örn: OrderCancellationException
                 case 500: userMessage = 'Sunucu tarafında bir hata oluştu.'; break;
                 default: userMessage = `Sunucu hatası (${error.status}). Lütfen daha sonra tekrar deneyin.`;
             }
        }
      }
      // Frontend'e kullanıcı dostu mesajı içeren Error nesnesi fırlat
      return throwError(() => new Error(userMessage));
    }


    getPaymentIssues(filters?: any): Observable<PaymentIssue[]> {
      const url = `${this.ADMIN_API_URL}/payments/issues`; // Örnek endpoint
      let params = new HttpParams();
      // if (filters?.status) params = params.set('status', filters.status);
      // ...
      console.log(`Workspaceing payment issues from: ${url}`);
      // Backend'den PaymentIssue[] bekliyoruz (Backend DTO'dan map edilmeli)
      return this.http.get<PaymentIssue[]>(url, { params }).pipe(
        map(issues => issues.map(issue => ({ ...issue, createdAt: new Date(issue.createdAt) }))), // Tarihleri Date yap
        catchError(this.handleError) // handleError metodu serviste tanımlı olmalı
      );
    }

    resolvePaymentIssue(issueId: number, notes?: string): Observable<any> { // Geri dönüş tipi backend'e göre değişir
        const url = `${this.ADMIN_API_URL}/payments/issues/${issueId}/resolve`; // Örnek endpoint
        return this.http.post(url, { resolutionNotes: notes }).pipe(
            catchError(this.handleError)
        );
    }
    getOrdersByUserIdForAdmin(userId: number | string): Observable<Order[]> {
      const url = `${this.ORDER_API_URL}/customer/${userId}`;
      console.log(`Workspaceing orders for user ${userId} (Admin View) from: ${url}`);
      // Backend'den BackendDtoOrderResponse[] bekle
      return this.http.get<BackendDtoOrderResponse[]>(url).pipe(
          map(dtoResponses => dtoResponses.map(dto => this.mapDtoOrderResponseToOrder(dto))),
          catchError(this.handleError)
      );
  }
  /**
 * Belirli bir sipariş kalemini satıcı tarafından kargolandı olarak işaretler
 * ve kargo bilgilerini günceller.
 * Backend'de /api/v1/seller/orders/{orderId}/items/{itemId}/ship gibi bir endpoint olmalı.
 */
markOrderItemShippedBySeller(
  orderId: number | string,
  itemId: number,
  shippingInfo: { carrier: string; trackingNumber: string } // Kargo bilgilerini de alalım
): Observable<any> { // Backend'in ne döndüreceğine bağlı (güncellenmiş OrderItem veya Order?)
  const url = `${this.SELLER_API_URL}/orders/${orderId}/items/${itemId}/ship`; // Örnek endpoint
  console.log(`Marking order item ${itemId} in order ${orderId} as shipped by seller with info:`, shippingInfo);
  // Backend'e kargo bilgilerini gönder
  return this.http.put<any>(url, shippingInfo).pipe( // PUT veya POST olabilir
      catchError(this.handleError)
  );
}


} // OrderService sınıfının sonu
