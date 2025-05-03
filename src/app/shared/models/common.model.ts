// adres ödeme kargo

// Bu dosyada birden fazla modelde kullanılabilecek genel arayüzler bulunur.
// Adres'i buraya taşımak daha mantıklı olabilir:
export interface Address {
  id?: number;
  addressTitle: string; // Backend'de yok, frontend'e özel olabilir veya backend'e eklenmeli
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state?: string; // Backend DtoAddress'te var
  postalCode: string; // Backend DtoAddress'te var
  country: string;
  phoneNumber: string;
  isDefault?: boolean;
  isBilling?: boolean; // Backend DtoAddress'te var
  isShipping?: boolean; // Backend DtoAddress'te var
}


// Backend'deki DtoPayment'a karşılık gelir.
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CREDIT_CARD' | 'BANK_TRANSFER' | 'PAYPAL' | 'STRIPE' | string; // Backend'e göre

export interface Payment {
  id?: number;
  orderId?: number; // Hangi siparişe ait olduğu
  amount: number; // Ödenen tutar
  paymentDate?: string | Date; // Ödeme tarihi
  status: PaymentStatus; // Ödeme durumu
  method: PaymentMethod; // Ödeme yöntemi
  transactionId?: string; // Ödeme sağlayıcısının işlem ID'si
  // Kart bilgileri gibi hassas veriler frontend'e genellikle dönmez.
}

export interface ShipmentEvent {
  timestamp: string | Date;
  status: string;
  description: string;
  location?: string;
}

// Backend'deki DtoShipment'a karşılık gelir.
export type ShipmentStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';
export interface Shipment {
  id?: number;
  orderId?: number;
  trackingNumber?: string; // Kargo takip numarası
  carrier?: string; // Kargo firması (örn: MNG, Aras)
  shippedDate?: string | Date; // Kargoya veriliş tarihi
  estimatedDelivery?: string | Date; // Tahmini teslim tarihi
  actualDeliveryDate?: string | Date; // Gerçek teslim tarihi
  status: ShipmentStatus; // Kargo durumu
  cost?: number; // Kargo ücreti (Order içinde de olabilir)
  address?: Address; // Teslimat adresi (Order içinde de olabilir)
  events?: ShipmentEvent[]; // Kargo olayları dizisi (opsiyonel)
}

// Backend'deki DtoComparison için (tam amacı net değil ama genel bir yapı):
// Ürün karşılaştırma özelliği varsa kullanılabilir.
import { Product } from './product.model';
import { UserSummary } from './user.model';
export interface Comparison {
    id?: number; // Karşılaştırma oturumu ID'si
    userId?: number; // Hangi kullanıcıya ait
    products: Product[]; // Karşılaştırılan ürünler
    // Belki karşılaştırılan özellikler de belirtilir
    // comparedFeatures?: string[];
}

export interface PaymentIssue {
  id: number; // Sorunun veya ilgili ödemenin ID'si
  orderId?: number;
  userId?: number;
  user?: UserSummary; // Kullanıcı bilgisi de gelirse
  paymentMethod?: PaymentMethod;
  amount?: number;
  currency?: string;
  status: PaymentStatus | string; // 'FAILED', 'PENDING_ACTION', 'DISPUTED' vb.
  errorMessage?: string; // Ödeme sağlayıcısından veya sistemden gelen hata
  createdAt: string | Date;
  resolvedAt?: string | Date;
  resolutionNotes?: string;
}



export type TicketStatus = 'NEW' | 'OPEN' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | string;

export interface SupportTicket {
  id: number;
  userId: number;
  user?: UserSummary; // Kullanıcı bilgisi
  subject: string;
  message: string; // İlk mesaj
  relatedOrderId?: number; // İlgili sipariş ID'si (varsa)
  relatedProductId?: number; // İlgili ürün ID'si (varsa)
  status: TicketStatus;
  createdAt: string | Date;
  lastUpdatedAt?: string | Date;
  adminNotes?: string; // Adminin iç notları
  // replies?: TicketReply[]; // Yanıtlar ayrı bir model olabilir
}

// Opsiyonel: Yanıtlar için ayrı model
// export interface TicketReply {
//   id: number;
//   ticketId: number;
//   userId: number; // Yanıtlayan kullanıcı (müşteri veya admin)
//   isAdminReply: boolean;
//   message: string;
//   createdAt: string | Date;
// }

