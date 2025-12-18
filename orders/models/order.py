# 1 - imports
from django.core.validators import RegexValidator
from django.db import models
from django.conf import settings



from .abstract import BaseModel
from products.models import Product

phone_regex = RegexValidator(
    regex=r'^\+998\d{9}$',
    message="Telefon raqamingizni shu tartibda kiriting: +998901234567"
)

# 2 - choices
class PaymentStatus(models.TextChoices):
    UNPAID = "unpaid", "To'lov qilinmagan"
    PAID = "paid", "To'langan"
    PARTIAL = "partial", "Qisman to'langan"
    REFUNDED = "refunded", "Qaytarilgan"


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Kutilmoqda"
    CONFIRMED = "confirmed", "Tasdiqlandi"
    PROCESSING = "processing", "Tayyorlanmoqda"
    SHIPPED = "shipped", "Jo'natildi"
    DELIVERED = "delivered", "Topshirildi"
    CANCELED = "canceled", "Bekor qilindi"


# 3 - main class
class Order(BaseModel):

    user = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='orders')
    payment_status = models.CharField(max_length=17,choices=PaymentStatus.choices,default=PaymentStatus.UNPAID)
    order_status = models.CharField(max_length=14,choices=OrderStatus.choices,default=OrderStatus.PENDING)
    phone = models.CharField(max_length=13,validators=[phone_regex],null=False,blank=False)
    address = models.TextField(null=False,blank=False)

# 4 - OrderItem class
class OrderItem(BaseModel):
    order = models.ForeignKey(Order,on_delete=models.CASCADE,related_name='items')
    product = models.ForeignKey(Product,on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10,decimal_places=2)

# 5 - InstallmentPlan (Kredit shartnoma)
class InstallmentPlan(BaseModel):

    order = models.OneToOneField(Order,on_delete=models.CASCADE, related_name='installment')
    total_amount = models.DecimalField(max_digits=10,decimal_places=2)
    months = models.PositiveIntegerField()
    monthly_amount = models.DecimalField(max_digits=10,decimal_places=2)
    is_approved = models.BooleanField(default=False)

# 6 - InstallmentPayment (oyma-oy to‘lov)

class InstallmentPayment(BaseModel):

    installment = models.ForeignKey(InstallmentPlan,on_delete=models.CASCADE,related_name='payments')
    month = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=10,decimal_places=2)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True,blank=True)

