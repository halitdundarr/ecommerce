// Bu dosyada kullanıcı, profil, giriş/cevap ve belki adres gibi ilgili arayüzleri tanımlayacağız.

// Backend'deki DtoLoginRequest'e karşılık gelir.
// API'ye /login isteği atarken bu yapıda veri göndereceğiz.
export interface LoginRequest {
  username: string;    // Backend DTO'daki alan ismiyle aynı olmalı
  password: string; // Backend DTO'daki alan ismiyle aynı olmalı
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Backend'deki /login endpoint'inden dönen cevaba karşılık gelir.
// Genellikle JWT token ve bazen temel kullanıcı bilgisi içerir.
export interface LoginResponse {
  token: string;      // Backend'in döndüğü JWT
  // Backend kullanıcı bilgisi de dönüyorsa buraya eklenir:
  // userId?: number;
  // role?: string;
}

// API'ye /register isteği atarken bu yapıda veri göndereceğiz.
export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string; // <<<--- Eklendi (Backend User entity'sinde var)
  password: string;
}

// Backend'den register endpoint'inden dönebilecek basit cevap (opsiyonel)
export interface RegisterResponse {
    success: boolean;
    message?: string;
    userId?: number; // Oluşturulan kullanıcının ID'si dönebilir
}

// Backend'deki DtoUserSummary'e karşılık gelir.
// Liste gibi yerlerde veya login cevabında temel kullanıcı bilgisi için.
export interface UserSummary {
  id: number;       // Genellikle number veya string olur backend'e göre.
  username?: string; // Opsiyonel (?) olabilir backend'e göre.
  firstName: string;
  lastName: string;
  email: string;
  // Roller backend'de nasıl tanımlıysa ona göre (string veya enum)
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' | string; // Veya sadece string
  status?: 'Active' | 'Banned' | string; // <<<--- Opsiyonel status alanı
}

// Backend'deki DtoProfile'a karşılık gelir.
// Kullanıcının profil sayfasında gösterilecek detaylı bilgiler.
export interface Profile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string; // Opsiyonel alanlar için '?' kullanırız.
  // Adresler ayrı bir interface (Address) olarak tanımlanıp burada dizi olarak tutulabilir.
  addresses?: Address[]; // Aşağıda tanımlayacağımız Address interface'i
  // Diğer profil alanları...
}

// Backend'deki DtoAddress'e karşılık gelir.
// Hem Profile içinde hem de Sipariş (Order) içinde kullanılabilir.
// Bu nedenle bunu user.model.ts yerine common.model.ts'e taşımak daha mantıklı olabilir.
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

// Backend'deki DtoSetNewPassword'a karşılık gelir.
export interface SetNewPasswordRequest {
    token: string; // Şifre sıfırlama için backend'in verdiği token
    newPassword: string;
}

// export anahtar kelimesi: Bu interface'in projenin başka yerlerinden import edilip kullanılabilmesini sağlar.
// interface anahtar kelimesi: Yeni bir arayüz tanımlar.
// : dan sonra gelen (string, number, boolean, any, Address[], string | number vb.): Alanın tipini belirtir.
// ? : Alanın opsiyonel olduğunu (zorunlu olmadığını) belirtir. API'den bazen gelmeyebilir veya gönderilmesi gerekmeyebilir.
// | : Union type (Birleşim tipi), alanın birden fazla tipten birini alabileceğini belirtir (örneğin, role).
// [] : Diziyi (array) belirtir (örneğin, Address[]: Address tipinde bir dizi).
