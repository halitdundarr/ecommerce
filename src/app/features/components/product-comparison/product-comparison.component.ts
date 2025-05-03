import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ComparisonService } from '../../../core/services/comparison.service'; // Servisi import et
import { ProductSummary } from '../../../shared/models/product.model'; // Modeli import et
// import { ProductService } from '../../services/product.service'; // Detaylı özellikler için ileride gerekebilir

@Component({
  selector: 'app-product-comparison',
  templateUrl: './product-comparison.component.html',
  styleUrls: ['./product-comparison.component.scss'],
  standalone:false
})
export class ProductComparisonComponent implements OnInit {

  comparisonList$: Observable<ProductSummary[]>;
  // Karşılaştırılacak temel özellikleri burada tanımlayabiliriz
  // Veya daha dinamik bir yapı kurabiliriz
  featuresToCompare: string[] = ['imageUrl', 'name', 'price', 'averageRating', 'category']; // Örnek özellikler

  constructor(
    private comparisonService: ComparisonService
    // private productService: ProductService // İleride detaylı veri için
  ) {
    this.comparisonList$ = this.comparisonService.getComparisonList();
  }

  ngOnInit(): void {
    // Component yüklendiğinde yapılacak ek işlemler (varsa)
  }

  // Ürünü karşılaştırmadan kaldır
  removeFromComparison(productId: number | string): void {
    this.comparisonService.removeFromComparison(productId);
  }

  // Karşılaştırma listesini temizle
  clearComparison(): void {
    if (confirm('Tüm karşılaştırma listesini temizlemek istediğinizden emin misiniz?')) {
      this.comparisonService.clearComparison();
    }
  }

  // Ürünün belirli bir özelliğinin değerini almak için yardımcı metot (HTML'de kullanılacak)
  // Bu metot, gelecekte daha karmaşık özellik erişimi için genişletilebilir.
  getProductFeature(product: ProductSummary, feature: string): any {
      switch (feature) {
          case 'imageUrl': return product.imageUrl;
          case 'name': return product.name;
          case 'price': return product.price;
          case 'averageRating': return product.averageRating;
          case 'category': return product.categoryId; // Şimdilik ID'yi gösterelim, isim için ProductService gerekebilir
          // TODO: Diğer özellikler (attributes) için ProductService'ten detay çekmek gerekebilir
          default: return 'N/A';
      }
  }

  // Kategori ID'sini isme çevirmek için (şimdilik placeholder, ProductService entegrasyonu gerektirir)
  // Bu fonksiyonun çalışması için ProductService'ten kategorileri çekip eşleştirme yapmak lazım.
  getCategoryName(categoryId: number | undefined): string {
      // Gerçek implementasyonda:
      // const category = this.productService.getCategoryById(categoryId); // Serviste böyle bir metot olmalı
      // return category ? category.name : '---';
      return categoryId ? `Kategori ID: ${categoryId}` : '---'; // Geçici gösterim
  }

}
