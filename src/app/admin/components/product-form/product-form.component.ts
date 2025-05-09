import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { finalize, Observable, of } from 'rxjs';
import { ProductService } from '../../../features/services/product.service';
import { Category } from '../../../shared/models/category.model';
import { Product } from '../../../shared/models/product.model';
import { NotificationService } from '../../../core/services/notification.service';

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



  apiError: string | null = null; // API hatası için değişken ismi düzeltildi
  selectedFile: File | null = null; // Seçilen dosyayı tutmak için
  imagePreviewUrl: string | ArrayBuffer | null = null; // Önizleme URL'si
  isUploadingImage = false; // Görsel yükleniyor durumu
  imageUploadError: string | null = null; // Görsel yükleme hatası


  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategories();
    this.checkEditMode();
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

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      this.selectedFile = fileList[0];
      this.imageUploadError = null; // Önceki hatayı temizle

      // Önizleme için FileReader kullan
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreviewUrl = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
      console.log('File selected:', this.selectedFile.name);
    } else {
      this.selectedFile = null;
      this.imagePreviewUrl = null;
    }
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


  onSubmit(): void {
    if (this.productForm.invalid || this.isLoading || this.isUploadingImage) { // isUploadingImage kontrolü eklendi
      this.productForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.apiError = null; // API hatasını temizle
    this.imageUploadError = null; // Görsel hatasını temizle
    const formData = this.productForm.value;

    const operation$ = this.isEditMode && this.productIdToEdit !== null
      ? this.productService.updateProduct(this.productIdToEdit, formData)
      : this.productService.addProduct(formData);

    operation$.subscribe({
      next: (savedProduct) => {
        // Ürün başarıyla kaydedildi/güncellendi
        this.isLoading = false;
        const productId = savedProduct?.id ?? this.productIdToEdit; // ID'yi al
        const successMessage = this.isEditMode ? 'Ürün başarıyla güncellendi!' : 'Ürün başarıyla eklendi!';
        this.notificationService.showSuccess(successMessage); // Bildirim göster

        // --- Görsel Yükleme Mantığı ---
        if (this.selectedFile && productId) {
          this.uploadImage(productId, this.selectedFile); // Görseli yükle
        } else {
          // Görsel yoksa veya ürün ID alınamadıysa listeye dön
           this.router.navigate(['/admin/products']);
        }
        // --- ---
      },
      error: (err) => {
        this.isLoading = false;
        this.apiError = `Ürün ${this.isEditMode ? 'güncellenirken' : 'eklenirken'} bir hata oluştu: ${err.message || err}`;
        console.error(`Error ${this.isEditMode ? 'updating' : 'adding'} product:`, err);
        this.notificationService.showError(this.apiError); // Hata bildirimi
      }
    });
  }


    // --- YENİ: Görsel Yükleme Metodu ---
    uploadImage(productId: string | number, file: File): void {
      this.isUploadingImage = true;
      this.imageUploadError = null;

      // ProductService'e görsel yükleme metodu eklenmeli
      this.productService.uploadProductImage(productId, file).pipe(
          finalize(() => this.isUploadingImage = false)
      ).subscribe({
          next: (response) => {
               console.log('Image uploaded successfully:', response);
               this.notificationService.showSuccess('Görsel başarıyla yüklendi.');
               // Yükleme başarılı olunca listeye dön
               this.router.navigate(['/admin/products']);
          },
          error: (err) => {
               console.error('Image upload failed:', err);
               // Hata mesajını kullanıcıya göster (API'den gelmiyorsa genel mesaj)
               this.imageUploadError = `Görsel yüklenemedi: ${err.message || 'Bilinmeyen bir hata oluştu.'}`;
               this.notificationService.showError(this.imageUploadError);
               // Kullanıcıya görseli tekrar deneme veya ürünü görselsiz kaydetme seçeneği sunulabilir
               // Şimdilik sadece hata gösterip formda kalıyoruz. İsterse kullanıcı listeye dönebilir.
               // Opsiyonel: Başarısız yükleme sonrası da listeye yönlendirebilirsiniz:
               // this.router.navigate(['/admin/products']);
          }
      });
    }


  // Kolay erişim için getter'lar (opsiyonel)
  get name() { return this.productForm.get('name'); }
  get description() { return this.productForm.get('description'); }
  get price() { return this.productForm.get('price'); }
  get stockQuantity() { return this.productForm.get('stockQuantity'); }
  get categoryId() { return this.productForm.get('categoryId'); }

}
