# 1 - imports
from django.db import models
from django.core.validators import RegexValidator
from django.conf import settings

from .abstract import BaseModel
from product_modul.models import Product
from .manager import OrderManager

phone_regex = RegexValidator(
    regex=r'^\+998\d{9}$',
    message="Telefon raqamingizni shu tartibda kiriting: +998901234567"
)


# 2 - payments choices
class PaymentChoices(models.TextChoices):

    UNPAID = 'unpaid',"To'lov qilinmagan"
    PAID = 'paid',"To'lov qilingan"
    PARTIAL = 'partial',"Qisman to'lov qilingan"
    REFUNDED = 'refunded',"Qaytarilgan"

# 3 - status choices
class StatusChoices(models.TextChoices):

    PENDING = 'pending',"Kutilmoqda"
    CONFIRMED = 'confirmed',"Tasdiqlangan"
    PROCESSING = 'processing',"Tayyorlanmoqda"
    SHIPPED = 'shipped',"Jo'natildi"
    DELIVERED = 'delivered',"Topshirildi"
    CANCELLED = 'cancelled',"Bekor qilindi"


# 4 - main (order) class
class Order(BaseModel):

    # 4.1 - fields
    user = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name='orders')
    payment_status = models.CharField(max_length=22,choices=PaymentChoices.choices,default=PaymentChoices.UNPAID)
    status_choices = models.CharField(max_length=14,choices=StatusChoices.choices,default=StatusChoices.PENDING)
    address = models.TextField(null=False, blank=False)
    phone = models.CharField(max_length=13,validators=[phone_regex], blank=False,null=False)


    # 4.2 - manager
    objects = OrderManager()
    all_objects = models.Manager()

    # 4.3 - clean

    # 4.4 - save
    def __str__(self):
        return str(self.user)

    # 5 - OrderItem class (order,product, quantity, amount)
class OrderItem(BaseModel):

    # 5 - fields
    order = models.ForeignKey(Order,on_delete=models.CASCADE,related_name='items')
    product = models.ForeignKey(Product,on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=10,decimal_places=2)
    def __str__(self):
        return f"{self.product.name} x{self.quantity} ({self.order.user})"


# 6 - InstallmentPlan class (order,total_amount,months,monthly_amount,is_approved) (Kredit shartnoma)
class InstallmentPlan(BaseModel):

    order = models.OneToOneField(Order,on_delete=models.CASCADE,related_name='installment')
    total_amount = models.DecimalField(max_digits=10,decimal_places=2)
    months = models.PositiveIntegerField(default=1)
    monthly_amount = models.DecimalField(max_digits=10,decimal_places=2)
    is_approved = models.BooleanField(default=False)

    def __str__(self):
        return f"Installment for {self.order.user}"


# 7 - InstallmentPayment class (installment, month, amount, is_paid, paid_at) (oyma-oy to‘lov)
class InstallmentPayment(BaseModel):

    installment = models.ForeignKey(InstallmentPlan,on_delete=models.CASCADE,related_name='payments')
    month = models.PositiveIntegerField()
    amount = models.DecimalField(max_digits=10,decimal_places=2)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True,blank=True)

    def __str__(self):
        return f"Payment for {self.installment.order.user}, month {self.month}"
