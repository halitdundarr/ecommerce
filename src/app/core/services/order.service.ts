// src/app/core/services/order.service.ts

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError, tap, switchMap, first, finalize } from 'rxjs/operators'; // finalize eklendi
import { Cart, CartItem } from '../../shared/models/cart.model';
import { Order, OrderStatus, OrderItem } from '../../shared/models/order.model';
import { Address } from '../../shared/models/user.model'; // Veya common.model
import { Payment, Shipment } from '../../shared/models/common.model'; // Frontend modelleri
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { ProductSummary } from '../../shared/models/product.model';

// --------------------------------------------------
// --- Backend DTO Arayüzleri (API Yanıtları İçin) ---
// --------------------------------------------------
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
}
interface BackendDtoProductSummary {
    productId: number | string;
    name: string;
    price: any; // BigDecimal için 'any'
    primaryImageUrl?: string;
    averageRating?: number;
    brand?: string;
    model?: string;
}
interface BackendDtoOrderItem {
    orderItemId: number;
    quantity: number;
    priceAtPurchase: any; // BigDecimal
    product: BackendDtoProductSummary;
}
interface BackendDtoPaymentSummary {
    paymentId?: number;
    paymentMethod?: string;
    status?: string;
    amount?: any; // BigDecimal
    transactionId?: string;
}
interface BackendDtoShipmentSummary {
    shipmentId?: number;
    trackingNumber?: string;
    carrier?: string;
    status?: string;
    estimatedDeliveryDate?: string | Date;
    shippedDate?: string | Date;
}
interface BackendDtoUserSummary {
    userId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
}
interface BackendDtoOrderResponse { // Backend'den dönen sipariş yanıtı
    orderId: number;
    orderNumber?: string;
    status: string; // OrderStatus enum string'i
    totalAmount: any; // BigDecimal
    createdAt: string | Date;
    updatedAt?: string | Date;
    shippingAddress?: BackendDtoAddress;
    billingAddress?: BackendDtoAddress;
    items: BackendDtoOrderItem[];
    payment?: BackendDtoPaymentSummary;
    shipments?: BackendDtoShipmentSummary[];
    customer?: BackendDtoUserSummary;
}

// Backend'e gönderilecek sipariş isteği DTO'su
interface BackendDtoOrderItemRequest {
    productId: number | string;
    quantity: number;
}
interface BackendDtoOrderRequest {
    shippingAddressId: number;
    billingAddressId: number;
    items: BackendDtoOrderItemRequest[];
}

// --------------------------------------------------
// --- Frontend Service İstek Modeli ---
// --------------------------------------------------
export interface CreateOrderRequest {
    shippingAddressId: number;
    billingAddressId: number;
    paymentMethod: string; // Bu bilgi şimdilik backend DTO'suna direkt gitmiyor
}

// --------------------------------------------------
// --- API URL Sabitleri ---
// --------------------------------------------------
const API_BASE_URL = 'http://localhost:8080/api/v1';
const ORDER_API_URL = `${API_BASE_URL}/orders`;
const SELLER_API_URL = `${API_BASE_URL}/seller`; // Seller endpoint'leri için

@Injectable({ providedIn: 'root' })
export class OrderService {

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
    return this.cartService.cart$.pipe(
        first(),
        switchMap(currentCart => {
            if (!currentCart || currentCart.items.length === 0) {
                return throwError(() => new Error('Sipariş vermek için sepetinizde ürün bulunmalıdır.'));
            }
            if (!this.authService.currentUserValue?.id) {
                return throwError(() => new Error('Sipariş vermek için giriş yapmalısınız.'));
            }

            const backendRequest: BackendDtoOrderRequest = {
                shippingAddressId: orderData.shippingAddressId,
                billingAddressId: orderData.billingAddressId,
                items: currentCart.items.map(cartItem => ({
                    productId: cartItem.productId,
                    quantity: cartItem.quantity
                }))
            };

            console.log('Sending order request to backend:', backendRequest);
            return this.http.post<BackendDtoOrderResponse>(ORDER_API_URL, backendRequest).pipe(
                map(dtoResponse => this.mapDtoOrderResponseToOrder(dtoResponse)),
                tap(createdOrder => {
                    if (createdOrder) {
                        console.log('Order created successfully, clearing cart.');
                        this.cartService.clearCart(); // Başarılı sipariş sonrası sepeti temizle
                    }
                }),
                catchError(this.handleError)
            );
        }),
        catchError(this.handleError)
    );
  }

  /**
   * Mevcut kullanıcının siparişlerini getirir.
   */
  getOrders(): Observable<Order[]> { // Bu metot artık var ve doğru isimde
    const url = `${ORDER_API_URL}/my-orders`;
    console.log(`Workspaceing user orders from: ${url}`);
    return this.http.get<BackendDtoOrderResponse[]>(url).pipe(
      map(dtoResponses => dtoResponses.map(dto => this.mapDtoOrderResponseToOrder(dto))),
      catchError(this.handleError)
    );
  }

  /**
   * Belirli bir siparişin detaylarını getirir.
   */
  getOrderById(orderId: number | string): Observable<Order | undefined> {
    const url = `${ORDER_API_URL}/${orderId}`;
    console.log(`Workspaceing order detail from: ${url}`);
    return this.http.get<BackendDtoOrderResponse>(url).pipe(
      map(dtoResponse => this.mapDtoOrderResponseToOrder(dtoResponse)),
      catchError(err => {
        if (err.status === 404) {
          console.warn(`Order not found on backend: ${orderId}`);
          return of(undefined);
        } else if (err.status === 403) {
           console.error(`Unauthorized access to order ${orderId}`);
           return throwError(() => new Error('Bu siparişi görüntüleme yetkiniz yok.'));
        }
        return this.handleError(err);
      })
    );
  }

  /**
   * Mevcut giriş yapmış satıcının siparişlerini getirir.
   */
  getOrdersForCurrentSeller(): Observable<Order[]> { // Bu metot da eklendi
      // Backend endpoint'ini doğrula (örn: /api/v1/seller/orders/my)
      const url = `${SELLER_API_URL}/orders/my`; // Varsayılan endpoint
      console.log(`Workspaceing orders for current seller from: ${url}`);
       if (!this.authService.currentUserValue?.id || this.authService.currentUserValue?.role !== 'SELLER') {
          return throwError(() => new Error('Satıcı girişi yapılmamış veya yetki yok.'));
      }
      return this.http.get<BackendDtoOrderResponse[]>(url).pipe(
          map(dtoResponses => dtoResponses.map(dto => this.mapDtoOrderResponseToOrder(dto))),
          catchError(this.handleError)
      );
  }

  // --- Admin Sipariş Yönetimi Metotları ---

  /**
   * Tüm siparişleri (veya filtrelenmiş) admin için getirir.
   */
  getAllOrdersForAdmin(filters?: any): Observable<Order[]> {
      console.log('Fetching all orders for admin...');
      let params = new HttpParams();
      // if (filters?.status) params = params.set('status', filters.status);
      // if (filters?.userId) params = params.set('userId', filters.userId);
      return this.http.get<BackendDtoOrderResponse[]>(ORDER_API_URL, { params }).pipe(
           map(dtoResponses => dtoResponses.map(dto => this.mapDtoOrderResponseToOrder(dto))),
           catchError(this.handleError)
      );
  }

  /**
   * Bir siparişin durumunu günceller (Admin için).
   */
  updateOrderStatus(orderId: number | string, newStatus: OrderStatus): Observable<Order | undefined> {
       const url = `${ORDER_API_URL}/${orderId}/status`;
       let params = new HttpParams().set('status', newStatus.toString());
       console.log(`Updating order ${orderId} status to ${newStatus}`);
       return this.http.put<BackendDtoOrderResponse>(url, null, { params }).pipe(
            map(dtoResponse => this.mapDtoOrderResponseToOrder(dtoResponse)),
            catchError(this.handleError)
       );
  }


  // --- DTO -> Model Dönüşüm Yardımcıları ---

  private mapDtoOrderResponseToOrder(dto: BackendDtoOrderResponse): Order {
      return {
          id: dto.orderId,
          orderNumber: dto.orderNumber,
          orderDate: dto.createdAt,
          userId: dto.customer?.userId ?? 0,
          items: dto.items?.map(itemDto => this.mapDtoOrderItemToOrderItem(itemDto)) || [],
          billingAddress: dto.billingAddress ? this.mapDtoAddressToAddress(dto.billingAddress) : this.createEmptyAddress(),
          shippingAddress: dto.shippingAddress ? this.mapDtoAddressToAddress(dto.shippingAddress) : this.createEmptyAddress(),
          status: dto.status as OrderStatus,
          totalPrice: this.parsePrice(dto.totalAmount),
          payment: dto.payment ? this.mapDtoPaymentSummaryToPayment(dto.payment) : undefined,
          shipments: dto.shipments?.map(shipDto => this.mapDtoShipmentSummaryToShipment(shipDto)) || []
      };
  }

  private mapDtoOrderItemToOrderItem(dto: BackendDtoOrderItem): OrderItem {
      return {
          id: dto.orderItemId,
          productId: dto.product.productId,
          quantity: dto.quantity,
          unitPrice: this.parsePrice(dto.priceAtPurchase),
          totalPrice: this.parsePrice(dto.priceAtPurchase) * dto.quantity,
          product: this.mapDtoSummaryToProductSummary(dto.product)
      };
  }

  private mapDtoAddressToAddress(dto: BackendDtoAddress): Address {
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
          addressTitle: 'Adres', // TODO: Decide how to handle addressTitle
          firstName: '...', // TODO: Get from User or separate field
          lastName: '...'   // TODO: Get from User or separate field
      };
   }
    private createEmptyAddress(): Address {
         return { addressTitle: 'Yok', firstName: '', lastName: '', street: '', city: '', country: '', postalCode: '', phoneNumber: '' };
    }

   private mapDtoSummaryToProductSummary(dto: BackendDtoProductSummary): ProductSummary {
     return {
         id: dto.productId,
         name: dto.name,
         price: this.parsePrice(dto.price),
         imageUrl: dto.primaryImageUrl,
         averageRating: dto.averageRating,
     };
   }

   private mapDtoPaymentSummaryToPayment(dto: BackendDtoPaymentSummary): Payment {
        return {
            id: dto.paymentId,
            method: dto.paymentMethod as any,
            status: dto.status as any,
            amount: this.parsePrice(dto.amount),
            transactionId: dto.transactionId
        }
   }

   private mapDtoShipmentSummaryToShipment(dto: BackendDtoShipmentSummary): Shipment {
        return {
             id: dto.shipmentId,
             trackingNumber: dto.trackingNumber,
             carrier: dto.carrier,
             status: dto.status as any,
             estimatedDelivery: dto.estimatedDeliveryDate,
             shippedDate: dto.shippedDate
        }
   }

  private parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
        const parsed = parseFloat(price);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (price && typeof price.toNumber === 'function') return price.toNumber();
    return 0;
  }

   // --- Genel Hata Yönetimi ---
// Bu fonksiyonu ilgili tüm servis dosyalarındaki mevcut handleError ile değiştirin
private handleError(error: HttpErrorResponse): Observable<never> {
  let userMessage = 'Bilinmeyen bir hata oluştu!'; // Varsayılan mesaj

  // Hatanın istemci/ağ kaynaklı mı yoksa backend kaynaklı mı olduğunu kontrol et
  if (error.status === 0 || !error.error) {
      // status === 0 genellikle ağ hatası veya CORS sorunudur.
      // error.error'ın null olması da istemci tarafı bir sorun olabilir.
      console.error('Bir ağ/istemci hatası oluştu:', error.message || error);
      userMessage = 'Bağlantı hatası veya istemci tarafında bir sorun oluştu. Lütfen bağlantınızı kontrol edin veya daha sonra tekrar deneyin.';

  } else {
      // Backend başarısız bir yanıt kodu döndürdü (4xx veya 5xx).
      console.error(
          `Backend Hata Kodu ${error.status}, ` +
          `Gövde: ${JSON.stringify(error.error)}`); // Hata gövdesini logla

      // Kullanıcıya gösterilecek mesajı belirle
      // Backend'den gelen `message` alanını kullanmayı dene (ErrorResponse DTO'sundan)
      const backendErrorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : null);

      if (backendErrorMessage) {
          userMessage = backendErrorMessage; // Backend'in mesajını kullan
      } else {
           // Genel durum kodlarına göre mesaj ata
           switch (error.status) {
               case 400:
                   userMessage = 'Geçersiz istek. Lütfen gönderdiğiniz bilgileri kontrol edin.';
                   break;
               case 401:
                   userMessage = 'Giriş yapmanız gerekiyor.';
                   break;
               case 403:
                   userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
                   break;
               case 404:
                   userMessage = 'İstenen kaynak bulunamadı.';
                   break;
               case 409:
                   userMessage = 'İşlem çakışması (örneğin, kayıt zaten var veya stok yetersiz).';
                   break;
               case 500:
                   userMessage = 'Sunucu tarafında beklenmedik bir hata oluştu.';
                   break;
               default:
                   userMessage = `Sunucu hatası (${error.status}). Lütfen daha sonra tekrar deneyin.`;
           }
      }
  }

  // Kullanıcıya yönelik hatayı içeren bir observable fırlat.
  return throwError(() => new Error(userMessage));
}

} // OrderService sınıfının sonu
