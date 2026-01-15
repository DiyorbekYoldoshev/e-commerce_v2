# 1 - imports
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.utils.text import slugify
from django.utils import timezone
from category_modul.models import Category, Attribute
from .manager import ActiveManagerProduct
from .abstract import BaseModel


# 2 - main class
class Product(BaseModel):

    # 3 - choices
    STATUS_ACTIVE = 'active'
    STATUS_ARCHIVED = 'archived'

    STATUS_CHOICES = [
        (STATUS_ACTIVE,'Faol'),
        (STATUS_ARCHIVED,'Arxivlangan')
    ]

    # 4 - fields, name, base_price, base_stock, status
    name = models.CharField(max_length=200)
    base_price = models.DecimalField(max_digits=10,decimal_places=2,validators=[MinValueValidator(0)])
    base_stock = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=11,choices=STATUS_CHOICES,default=STATUS_ACTIVE)

    # 5 - Relations, category, seller
    category = models.ForeignKey(Category,on_delete=models.CASCADE,related_name='products')
    seller = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='products')


    # 6 - Optional fields, description, image,slug,expiration_date,is_active
    description = models.TextField()
    image = models.ImageField(upload_to='profile/',null=True,blank=True)
    slug = models.SlugField(unique=True,null=True,blank=True)
    expiration_date = models.DateTimeField(null=True,blank=True)
    is_active = models.BooleanField(default=True)

    # 5 - manager
    objects = ActiveManagerProduct()
    all_objects = models.Manager()


    # 6 - clean
    def clean(self):
        if self.name and len(self.name) < 3:
            raise ValidationError("Mahsulot nomi juda qisqa")

        if self.base_stock < 0:
            raise ValidationError("Musbat qiymatda kiriting")

        if self.base_price < 0:
            raise ValidationError("Musbat qiymatda kiriting")

        if self.expiration_date:
            # timezone-aware "today"
            now = timezone.now()
            if self.expiration_date < now:
                raise ValidationError(
                    {
                        'expiration_date': "Yaroqlilik muddati o'tib ketgan sanani kiritib bo'lmaydi"
                    }
                )


    # 7 - is_expired
    def is_expired(self):
        if not self.expiration_date:
            return False
        return self.expiration_date < timezone.now()


    # 8 - save
    def save(self, *args, **kwargs):

        if not self.slug:
            base = slugify(self.name) or 'product'
            slug = base
            i = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug
        super().save(*args, **kwargs)


    # 9 - class meta
    class Meta:

        db_table = "product"
        verbose_name = "Mahsulot"
        verbose_name_plural = "Mahsulotlar"

        ordering = ['-created_at']

        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['slug']),
            models.Index(fields=['description']),
            models.Index(fields=['category'])
        ]


    # 10 - str
    def __str__(self):
        return self.name


# 1.1 - subclass ProductVariant
class ProductVariant(BaseModel):

    # fields product,sku,price,stock
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='variants')
    sku = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10,decimal_places=2)
    stock = models.PositiveIntegerField(default=0)

    # str
    def __str__(self):
        return f"{self.product.name} ({self.sku})"


# 1.2 - sub class VariantAttributeValue
class VariantAttributeValue(BaseModel):

    # variant,attribute,value
    variant = models.ForeignKey(ProductVariant,on_delete=models.CASCADE, related_name='attributes')
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)
    value = models.CharField(max_length=100)

    # class meta
    class Meta:

        unique_together = ('variant','attribute')

    # str
    def __str__(self):
        return f"{self.attribute.name}: {self.value}"



