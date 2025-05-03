// Backend'deki DtoCategory'e karşılık gelir.
export interface Category {
  id: number;
  name: string;
  description?: string;
  parentCategoryId?: number; // Alt kategori ise üst kategori ID'si
  // subCategories?: Category[]; // Alt kategoriler (kendini referans edebilir)
  imageUrl?: string; // Kategori resmi
}
