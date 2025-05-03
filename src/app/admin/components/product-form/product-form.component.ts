import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ProductService } from '../../../features/services/product.service';
import { Category } from '../../../shared/models/category.model';
import { Product } from '../../../shared/models/product.model';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  standalone:false
})
export class ProductFormComponent implements OnInit {

  productForm!: FormGroup;
  categories$: Observable<Category[]> = of([]);
  isEditMode = false; // Artık dinamik olarak ayarlanacak
  productIdToEdit: string | number | null = null; // Düzenlenen ürünün ID'si
  isLoading = false; // Genel yükleme durumu
  isProductLoading = false; // Ürün verisi yükleniyor durumu
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute // ActivatedRoute inject edildi
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategories();
    this.checkEditMode(); // Düzenleme modunu kontrol et
  }

  initializeForm(product?: Product): void { // Opsiyonel product parametresi eklendi
    this.productForm = this.fb.group({
      name: [product?.name || '', [Validators.required, Validators.minLength(3)]],
      description: [product?.description || '', Validators.required],
      price: [product?.price || null, [Validators.required, Validators.min(0)]],
      stockQuantity: [product?.stockQuantity ?? 0, [Validators.required, Validators.min(0)]],
      // Kategori ID'sini product nesnesinden al, yoksa null
      categoryId: [product?.category?.id || null, Validators.required]
      // Diğer alanlar (isActive vb.) eklenebilir
    });
  }

  loadCategories(): void {
    this.categories$ = this.productService.getCategories();
  }

  checkEditMode(): void {
     // Route parametrelerini dinle (snapshot yerine observable kullanmak daha iyi olabilir ama şimdilik snapshot)
    this.productIdToEdit = this.route.snapshot.paramMap.get('id'); // URL'den :id parametresini al
    if (this.productIdToEdit) {
      this.isEditMode = true;
      console.log('Edit mode activated for product ID:', this.productIdToEdit);
      this.loadProductData(this.productIdToEdit); // Ürün verisini yükle
    } else {
      this.isEditMode = false;
      console.log('Add mode activated.');
    }
  }

  // Düzenlenecek ürünün verisini yükleyip formu dolduran metot
  loadProductData(id: string | number): void {
      this.isProductLoading = true;
      this.error = null;
      this.productService.getProductById(id).subscribe({
          next: (product) => {
              if (product) {
                  console.log('Product data loaded for edit:', product);
                  this.initializeForm(product); // Formu yüklenen veriyle başlat/doldur
                  // VEYA this.productForm.patchValue({ name: product.name, ... });
              } else {
                  this.error = "Düzenlenecek ürün bulunamadı.";
              }
              this.isProductLoading = false;
          },
          error: (err) => {
              console.error("Error loading product data:", err);
              this.error = "Ürün verisi yüklenirken hata oluştu.";
              this.isProductLoading = false;
          }
      });
  }


  // Form gönderildiğinde
  onSubmit(): void {
    if (this.productForm.invalid || this.isLoading) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.error = null;
    const formData = this.productForm.value;

    if (this.isEditMode && this.productIdToEdit !== null) {
      // === DÜZENLEME MODU ===
      this.productService.updateProduct(this.productIdToEdit, formData).subscribe({
         next: (updatedProduct) => {
           this.isLoading = false;
           if (updatedProduct) {
               console.log('Product updated successfully:', updatedProduct);
               alert('Ürün başarıyla güncellendi!');
               this.router.navigate(['/admin/products']); // Listeye geri dön
           } else {
                this.error = "Ürün güncellenemedi (servis hatası veya bulunamadı).";
           }
         },
         error: (err) => {
           this.isLoading = false;
           this.error = "Ürün güncellenirken bir hata oluştu.";
           console.error("Error updating product:", err);
         }
       });

    } else {
      // === EKLEME MODU ===
      this.productService.addProduct(formData).subscribe({
        next: (newProduct) => {
          this.isLoading = false;
          console.log('Product added successfully:', newProduct);
          alert('Ürün başarıyla eklendi!');
          this.router.navigate(['/admin/products']); // Listeye geri dön
        },
        error: (err) => {
          this.isLoading = false;
          this.error = "Ürün eklenirken bir hata oluştu.";
          console.error("Error adding product:", err);
        }
      });
    }
  }


  // Kolay erişim için getter'lar (opsiyonel)
  get name() { return this.productForm.get('name'); }
  get description() { return this.productForm.get('description'); }
  get price() { return this.productForm.get('price'); }
  get stockQuantity() { return this.productForm.get('stockQuantity'); }
  get categoryId() { return this.productForm.get('categoryId'); }

}
