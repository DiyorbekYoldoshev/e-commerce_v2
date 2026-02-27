# models.py
from django.conf import settings
from django.db import models
from django.db.models import Min
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.utils.text import slugify
from django.utils import timezone

from category_modul.models import Category, Attribute
from .manager import ActiveManagerProduct
from .abstract import BaseModel


class Product(BaseModel):
    # choices
    STATUS_ACTIVE = "active"
    STATUS_ARCHIVED = "archived"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Faol"),
        (STATUS_ARCHIVED, "Arxivlangan"),
    ]

    # fields
    name = models.CharField(max_length=200)
    description = models.TextField()

    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    # base_stock = models.PositiveIntegerField(default=0)

    status = models.CharField(
        max_length=11,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )

    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products"
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_products"
    )

    image = models.ImageField(upload_to="products/", null=True, blank=True)
    slug = models.SlugField(unique=True, blank=True)  # null=False (toza)
    expiration_date = models.DateTimeField(null=True, blank=True)

    # managers
    objects = ActiveManagerProduct()   # active-only manager (siznikidek)
    all_objects = models.Manager()     # full manager

    # --------- validations ----------
    def clean(self):
        if self.name and len(self.name.strip()) < 3:
            raise ValidationError({"name": "Mahsulot nomi juda qisqa (kamida 3 ta belgi)."})
        if self.expiration_date and self.expiration_date < timezone.now():
            raise ValidationError(
                {"expiration_date": "Yaroqlilik muddati o'tib ketgan sanani kiritib bo'lmaydi."}
            )

    # --------- price logic ----------
    @property
    def effective_price(self):
        """
        Variant bo‘lsa: eng arzon variant narxi
        Variant bo‘lmasa: base_price
        """
        min_variant_price = self.variants.aggregate(m=Min("price"))["m"]
        return min_variant_price if min_variant_price is not None else self.base_price

    # --------- helpers ----------
    def is_expired(self):
        return bool(self.expiration_date and self.expiration_date < timezone.now())

    # --------- save ----------
    def save(self, *args, **kwargs):
        # clean() ishlashi kafolatli bo‘lsin
        self.full_clean()

        # slug generate (archivedlarni ham hisobga olamiz!)
        if not self.slug:
            base = slugify(self.name) or "product"
            slug = base
            i = 1
            while Product.all_objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug

        super().save(*args, **kwargs)

    class Meta:
        db_table = "product"
        verbose_name = "Mahsulot"
        verbose_name_plural = "Mahsulotlar"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["slug"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        return self.name


class ProductVariant(BaseModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="variants"
    )

    sku = models.CharField(max_length=200)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["product"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["product", "sku"], name="uniq_variant_sku_per_product")
        ]

    def __str__(self):
        return f"{self.product.name} ({self.sku})"


class VariantAttributeValue(BaseModel):
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="attribute_values"
    )
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)
    value = models.CharField(max_length=100)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["variant", "attribute"],
                name="uniq_variant_attribute"
            )
        ]
        indexes = [
            models.Index(fields=["variant"]),
            models.Index(fields=["attribute"]),
        ]

    def __str__(self):
        return f"{self.attribute.name}: {self.value}"
