// src/app/core/services/order.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap, switchMap, first, finalize } from 'rxjs/operators';
import { Cart, CartItem } from '../../shared/models/cart.model';
import { Order, OrderStatus, OrderItem, ReturnStatus } from '../../shared/models/order.model'; // ReturnStatus eklendi (OrderItem'da kullanılıyor)
import { Address, UserSummary } from '../../shared/models/user.model';
import { Payment, Shipment } from '../../shared/models/common.model';
import { ProductSummary } from '../../shared/models/product.model';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { environment } from '../../../environments/environment'; // <-- environment import et

// --- Backend DTO Arayüzleri (Mevcutlar iyi görünüyor) ---
interface BackendDtoAddress { addressId: number; street: string; city: string; state?: string; postalCode: string; country: string; phoneNumber?: string; isDefault: boolean; isBilling: boolean; isShipping: boolean; }
interface BackendDtoProductSummary { productId: number | string; name: string; price: any; primaryImageUrl?: string; averageRating?: number; brand?: string; model?: string; }
interface BackendDtoOrderItem { orderItemId: number; quantity: number; priceAtPurchase: any; product: BackendDtoProductSummary; returnStatus?: string; } // returnStatus eklendi (varsa)
interface BackendDtoPaymentSummary { paymentId?: number; paymentMethod?: string; status?: string; amount?: any; transactionId?: string; }
interface BackendDtoShipmentSummary { shipmentId?: number; trackingNumber?: string; carrier?: string; status?: string; estimatedDeliveryDate?: string | Date; shippedDate?: string | Date; }
interface BackendDtoUserSummary { userId: number; username?: string; firstName?: string; lastName?: string; }
interface BackendDtoOrderResponse { orderId: number; orderNumber?: string; status: string; totalAmount: any; createdAt: string | Date; updatedAt?: string | Date; shippingAddress?: BackendDtoAddress; billingAddress?: BackendDtoAddress; items: BackendDtoOrderItem[]; payment?: BackendDtoPaymentSummary; shipments?: BackendDtoShipmentSummary[]; customer?: BackendDtoUserSummary; }
interface BackendDtoOrderItemRequest { productId: number | string; quantity: number; }
interface BackendDtoOrderRequest { shippingAddressId: number; billingAddressId: number; items: BackendDtoOrderItemRequest[]; }
// -----------------------------------------------------------

// Frontend Service İstek Modeli (Aynı kalabilir)
export interface CreateOrderRequest {
    shippingAddressId: number;
    billingAddressId: number;
    paymentMethod: string; // Bu bilgi backend DTO'suna direkt gitmiyor ama payment initiation için kullanılabilir
}

@Injectable({ providedIn: 'root' })
export class OrderService {

  // --- API URL Sabitleri (environment'dan alınacak) ---
  private readonly API_BASE_URL = environment.apiUrl; // <-- environment kullan
  private readonly ORDER_API_URL = `${this.API_BASE_URL}/api/v1/orders`;
  private readonly SELLER_API_URL = `${this.API_BASE_URL}/api/v1/seller`;
  private readonly ADMIN_API_URL = `${this.API_BASE_URL}/api/v1/admin`; // Gerekirse
  // -----------------------------------------------------


  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cartService: CartService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * Yeni bir sipariş oluşturur.
   */
  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    // Mevcut sepeti al (asenkron veya senkron)
    // Asenkron (daha güvenli):
    // return this.cartService.getCart().pipe(
    //     first(), // Sadece ilk değeri al
    //     switchMap(currentCart => { ... }) );

    // Senkron (mevcut kod gibi):
    const currentCart = this.cartService.getCurrentCartValue();
    if (!currentCart || currentCart.items.length === 0) {
        return throwError(() => new Error('Sipariş vermek için sepetinizde ürün bulunmalıdır.'));
    }
    const currentUser = this.authService.currentUserValue;
    if (!currentUser?.id) {
        return throwError(() => new Error('Sipariş vermek için giriş yapmalısınız.'));
    }

    // Backend'e gönderilecek DTO'yu oluştur
    const backendRequest: BackendDtoOrderRequest = {
        shippingAddressId: orderData.shippingAddressId,
        billingAddressId: orderData.billingAddressId,
        items: currentCart.items.map(cartItem => ({
            productId: cartItem.productId,
            quantity: cartItem.quantity
        }))
    };

    const url = this.ORDER_API_URL; // Ana order endpoint'i
    console.log(`Sending order request to backend: ${url}`, backendRequest);

    // Backend'den BackendDtoOrderResponse bekle
    return this.http.post<BackendDtoOrderResponse>(url, backendRequest).pipe(
        map(dtoResponse => this.mapDtoOrderResponseToOrder(dtoResponse)), // Yanıtı Order modeline map et
        tap(createdOrder => {
            if (createdOrder) {
                console.log('Order created successfully, clearing cart.');
                this.cartService.clearCart(); // Başarılı sipariş sonrası sepeti temizle
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
    const url = `${this.ORDER_API_URL}/${orderId}`; // Order ID ile endpoint
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
           // 403 hatasını handleError'a bırakmak yerine burada özel mesaj verebiliriz
           return throwError(() => new Error('Bu siparişi görüntüleme yetkiniz yok.'));
        }
        // Diğer hataları handleError yönetsin
        return this.handleError(err);
      })
    );
  }

  /**
   * Mevcut giriş yapmış satıcının siparişlerini getirir.
   * DİKKAT: Backend'de `/api/v1/seller/orders/my` endpoint'inin oluşturulması gerekir.
   */
  getOrdersForCurrentSeller(): Observable<Order[]> {
      const url = `${this.SELLER_API_URL}/orders/my`; // Satıcıya özel endpoint
      console.log(`Workspaceing orders for current seller from: ${url}`);

       // Giriş yapmış kullanıcı satıcı mı kontrolü (ekstra güvenlik katmanı)
       if (!this.authService.currentUserValue?.id || this.authService.currentUserValue?.role !== 'SELLER') {
          console.error('Attempted to fetch seller orders without SELLER role.');
          return throwError(() => new Error('Satıcı siparişlerini getirmek için yetki yok.'));
      }

      // Backend'den BackendDtoOrderResponse[] bekle (varsayım)
      return this.http.get<BackendDtoOrderResponse[]>(url).pipe(
          map(dtoResponses => dtoResponses.map(dto => this.mapDtoOrderResponseToOrder(dto))),
          catchError(err => {
              if (err.status === 404) { // Backend endpoint yoksa 404 dönebilir
                  console.error(`Backend endpoint ${url} not found.`);
                  return throwError(() => new Error('Satıcı siparişleri endpoint\'i bulunamadı. Lütfen backend\'i kontrol edin.'));
              }
              return this.handleError(err); // Diğer hatalar
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
      // İleride filtreleme eklenirse:
      // if (filters?.status) params = params.set('status', filters.status);
      // if (filters?.userId) params = params.set('userId', filters.userId);

      // Backend'den BackendDtoOrderResponse[] bekle
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

       // Backend'den BackendDtoOrderResponse bekle
       return this.http.put<BackendDtoOrderResponse>(url, null, { params }).pipe( // Body null
            map(dtoResponse => this.mapDtoOrderResponseToOrder(dtoResponse)),
            catchError(this.handleError)
       );
  }


  // --- DTO -> Model Dönüşüm Yardımcıları (İyileştirmelerle) ---

  private mapDtoOrderResponseToOrder(dto: BackendDtoOrderResponse): Order {
      return {
          id: dto.orderId,
          orderNumber: dto.orderNumber,
          // Backend DTO'sundaki createdAt ve updatedAt alanları Date mi String mi? Ona göre parse gerekebilir.
          orderDate: new Date(dto.createdAt), // String ise Date'e çevir
          userId: dto.customer?.userId ?? 0, // Müşteri bilgisi null ise 0 ata
          items: dto.items?.map(itemDto => this.mapDtoOrderItemToOrderItem(itemDto)) ?? [], // items null ise boş dizi ata
          // Adres map ederken dikkatli olalım (firstName/lastName sorunu)
          billingAddress: dto.billingAddress ? this.mapDtoAddressToAddress(dto.billingAddress, dto.customer) : this.createEmptyAddress(),
          shippingAddress: dto.shippingAddress ? this.mapDtoAddressToAddress(dto.shippingAddress, dto.customer) : this.createEmptyAddress(),
          status: dto.status as OrderStatus, // Tip dönüşümü
          totalPrice: this.parsePrice(dto.totalAmount), // Fiyatı parse et
          payment: dto.payment ? this.mapDtoPaymentSummaryToPayment(dto.payment) : undefined, // payment null ise undefined
          shipments: dto.shipments?.map(shipDto => this.mapDtoShipmentSummaryToShipment(shipDto)) ?? [] // shipments null ise boş dizi
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

  // DİKKAT: Bu map fonksiyonu ad/soyad için DtoUserSummary kullanıyor.
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
          // Ad/Soyad DTO'da yok, customer DTO'sundan almayı dene
          addressTitle: `Adres ${dto.addressId}`, // Örnek
          firstName: customerDto?.firstName ?? '...',
          lastName: customerDto?.lastName ?? '...'
      };
   }

    // Boş adres nesnesi oluşturma
    private createEmptyAddress(): Address {
         return { addressTitle: 'Yok', firstName: '', lastName: '', street: '', city: '', country: '', postalCode: '', phoneNumber: '' };
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
            // paymentDate alanı DTO'da yok
        }
   }

   // Kargo özetini map etme
   private mapDtoShipmentSummaryToShipment(dto: BackendDtoShipmentSummary): Shipment {
        return {
             id: dto.shipmentId,
             trackingNumber: dto.trackingNumber,
             carrier: dto.carrier,
             status: dto.status as any, // Tip dönüşümü
             // DTO'daki estimatedDeliveryDate ve shippedDate alanları Date mi String mi?
             estimatedDelivery: dto.estimatedDeliveryDate ? new Date(dto.estimatedDeliveryDate) : undefined,
             shippedDate: dto.shippedDate ? new Date(dto.shippedDate) : undefined
             // actualDeliveryDate ve cost alanları DTO'da yok
        }
   }

  // Fiyat parse etme (ProductService'teki ile aynı)
  private parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
        const normalizedPrice = price.replace(',', '.');
        const parsed = parseFloat(normalizedPrice);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (price && typeof price.toNumber === 'function') return price.toNumber();
    return 0;
  }

   // --- Genel Hata Yönetimi (Diğer servislerdeki gibi) ---
    private handleError(error: HttpErrorResponse): Observable<never> {
      let userMessage = 'Bilinmeyen bir sipariş işlemi hatası oluştu!';
      // ... (handleError içeriği önceki servislerden kopyalanabilir) ...
       if (error.status === 0 || !error.error) {
        console.error('Ağ/İstemci hatası (OrderService):', error.message || error);
        userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu.';
      } else {
        console.error(`Backend Hatası ${error.status} (OrderService), Gövde:`, error.error);
        const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);
        if (backendErrorMessage) {
            userMessage = backendErrorMessage;
        } else {
             switch (error.status) {
                 case 400: userMessage = 'Geçersiz sipariş isteği (örn: stok yetersiz, geçersiz adres).'; break; // InsufficientStock veya AddressNotFound buraya map olabilir
                 case 401: userMessage = 'Bu işlem için giriş yapmalısınız.'; break;
                 case 403: userMessage = 'Bu sipariş işlemi için yetkiniz yok.'; break;
                 case 404: userMessage = 'Sipariş veya ilgili kaynak bulunamadı.'; break;
                 case 409: userMessage = 'Sipariş durumu geçersiz veya işlem çakışması.'; break; // OrderCancellationException buraya map olabilir
                 case 500: userMessage = 'Sunucu tarafında hata oluştu.'; break;
                 default: userMessage = `Sunucu hatası (${error.status}).`;
             }
        }
      }
      return throwError(() => new Error(userMessage));
    }

} // OrderService sınıfının sonu
