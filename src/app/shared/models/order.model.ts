// src/app/shared/models/order.model.ts
import { Payment, Shipment } from "./common.model"; // Veya DtoPaymentSummary/DtoShipmentSummary kullanılabilir
import { Address } from "./user.model"; // Veya common.model
import { ProductSummary } from "./product.model"; // ProductSummary kullanacağız

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED' | string; // string ekleyerek esneklik
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | string;

export interface OrderItem {
  id: number; // orderItemId
  productId: number | string; // product.productId'den alınabilir
  quantity: number;
  unitPrice: number; // priceAtPurchase
  totalPrice: number; // Frontend'de hesaplanabilir (quantity * unitPrice)
  product: ProductSummary; // <<<--- Gömülü ProductSummary
  // Eski alanlar kaldırıldı (productName, productImage)
  returnStatus?: ReturnStatus; // İade durumu (varsa)
}

export interface Order {
  id: number; // orderId
  orderNumber?: string; // Backend'den gelen orderNumber
  orderDate: string | Date; // createdAt
  userId: number; // customer.userId'den alınabilir
  items: OrderItem[];
  billingAddress: Address;
  shippingAddress: Address;
  status: OrderStatus;
  totalPrice: number; // totalAmount
  // Ödeme ve Kargo özetleri (Backend DTO'larına göre ayarlanmalı)
  payment?: any; // DtoPaymentSummary veya Payment
  shipments?: any[]; // DtoShipmentSummary[] veya Shipment[]
  // subTotal, shippingCost, discount alanları backend DTO'da yok, kaldırılabilir veya frontend'de hesaplanabilir
}
