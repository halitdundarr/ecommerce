import { UserSummary } from './user.model'; // UserSummary'yi import et

// Destek talebi durumları (Backend ile uyumlu olmalı)
export type TicketStatus = 'NEW' | 'OPEN' | 'PENDING_CUSTOMER' | 'RESOLVED' | 'CLOSED' | string;

// Destek talebi modeli
export interface SupportTicket {
  id: number;
  userId: number;
  user?: UserSummary; // Backend'den geliyorsa kullanıcı bilgisi
  subject: string;
  message: string; // İlk mesaj veya son mesaj (backend'e göre)
  relatedOrderId?: number;
  relatedProductId?: number;
  status: TicketStatus;
  createdAt: string | Date; // Backend Date veya ISO String döndürebilir
  lastUpdatedAt?: string | Date;
  adminNotes?: string;
  // replies?: TicketReply[]; // Yanıtlar için ayrı model/API olabilir
}

// İsteğe bağlı: Yanıt modeli
// export interface TicketReply { ... }
