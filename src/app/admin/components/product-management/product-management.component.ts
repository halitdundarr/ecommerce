import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product } from '../../../shared/models/product.model'; // Product modelini import et
import { ProductService } from '../../../features/services/product.service';

@Component({
  selector: 'app-product-management',
  templateUrl: './product-management.component.html',
  styleUrls: ['./product-management.component.scss'],
  standalone:false
})
export class ProductManagementComponent implements OnInit {

  products$: Observable<Product[]> = of([]);
  isLoading = false;
  error: string | null = null;
  actionLoading: { [key: string]: boolean } = {}; // ID string olabileceği için key string olabilir

  constructor(private productService: ProductService) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.error = null;
    // Admin için tüm ürünleri getiren servisi çağır
    this.products$ = this.productService.getAllProductsForAdmin();

    // Yükleme ve hata durumunu ele al
    this.products$.subscribe({
      next: () => this.isLoading = false,
      error: (err) => {
        console.error("Error loading products for admin:", err);
        this.error = "Ürünler yüklenirken bir hata oluştu.";
        this.isLoading = false;
      }
    });
  }

  // Placeholder Aksiyon Metotları
  editProduct(productId: number | string): void {
    alert(`Product ID ${productId} için DÜZENLEME işlemi tetiklendi (henüz uygulanmadı).`);
    // Router ile düzenleme sayfasına yönlendirme yapılabilir
    // this.router.navigate(['/admin/products/edit', productId]);
  }

  // deleteProduct Metodunu Güncelle:
  deleteProduct(productId: number | string, productName: string): void {
    const productIdStr = productId.toString(); // actionLoading için string key kullanalım
    if (this.actionLoading[productIdStr]) return; // Zaten işlemde ise tekrar tetikleme

   // Kullanıcıdan onay al
   if (confirm(`'${productName}' ürününü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
     this.actionLoading[productIdStr] = true; // Yükleniyor başlat
     this.error = null; // Eski hatayı temizle

     this.productService.deleteProduct(productId).subscribe({
       next: (response) => {
         if (response.success) {
           console.log(`Product ${productId} deleted successfully.`);
           alert('Ürün başarıyla silindi.');
           this.loadProducts(); // Listeyi yenile
         } else {
           console.error(`Failed to delete product ${productId}.`);
           this.error = `Ürün ${productId} silinemedi.`;
         }
          delete this.actionLoading[productIdStr]; // Yükleniyor bitir
       },
       error: (err) => {
         console.error(`Error deleting product ${productId}:`, err);
         this.error = `Ürün ${productId} silinirken hata oluştu.`;
          delete this.actionLoading[productIdStr]; // Yükleniyor bitir
       }
     });
   }
 }

  addNewProduct(): void {
     alert('Yeni ürün ekleme formu açılacak (henüz uygulanmadı).');
      // Router ile yeni ürün ekleme sayfasına yönlendirme yapılabilir
     // this.router.navigate(['/admin/products/new']);
  }

}
