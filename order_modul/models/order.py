# 1 - imports
from decimal import Decimal

from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.conf import settings
from django.db.models import Sum

from .abstract import BaseModel
from product_modul.models import Product
from .manager import OrderManager
from django.utils import timezone
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

class Coupon(BaseModel):

    code = models.CharField(max_length=30,unique=True)
    discount_percent = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1),MaxValueValidator(100)]
    )
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True,blank=True)

    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True

    def __str__(self):
        return self.code


# 4 - main (order) class
class Order(BaseModel):

    # 4.1 - fields
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )

    status_choices = models.CharField(
        max_length=15,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING
    )

    payment_status = models.CharField(
        max_length=15,
        choices=PaymentChoices.choices,
        default=PaymentChoices.UNPAID
    )

    address = models.TextField()
    phone = models.CharField(max_length=13, validators=[phone_regex])

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00')
    )

    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    is_installment = models.BooleanField(default=False)

    # 4.2 - manager
    objects = OrderManager()
    all_objects = models.Manager()

    # core (business logic)
    """Order umumiy summasi"""
    def calculate_total(self):
        total = self.items.aggregate(
            total = Sum('subtotal')
        )['total'] or Decimal('0.00')

        self.total_amount = total
        self.save(update_fields=['total_amount'])
        return total
    """Chegirmadan keyingi summa"""
    def get_payable_amount(self):
        total = self.total_amount
        if self.coupon and self.coupon.is_valid():
            discount = (total*self.coupon.discount_percent)/100
            return total - discount
        return total

    """Bo'lib to'lsh holatini yangilash"""
    def update_payment_status(self):
        if not self.is_installment or not hasattr(self,'installment'):
            return

        total = self.installment.payments.count()
        paid = self.installment.payments.filter(is_paid=True).count()

        if paid == 0:
            self.payment_status = PaymentChoices.UNPAID

        elif paid < total:
            self.payment_status = PaymentChoices.PARTIAL

        else:
            self.payment_status = PaymentChoices.PAID

        self.save(update_fields=['payment_status'])

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

