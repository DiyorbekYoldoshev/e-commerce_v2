from decimal import Decimal,ROUND_HALF_UP
from django.db import models,transaction
from django.conf import settings

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator,MinValueValidator,MaxValueValidator
from django.db.models import Sum, Manager
from django.utils import timezone

from ..models.manager import OrderManager
from ..models.abstract import BaseModel
from product_modul.models import ProductVariant

phone_regex = RegexValidator(
    regex=r"^\+998\d{9}$",
    message="Telefon raqamingizni shu tartibda kiriting: +998901234567",
)

# -----------------------------
# Choices
# -----------------------------
class PaymentChoices(models.TextChoices):
    UNPAID = "unpaid", "To'lov qilinmagan"
    PAID = "paid", "To'lov qilingan"
    PARTIAL = "partial", "Qisman to'lov qilingan"
    REFUNDED = "refunded", "Qaytarilgan"


class StatusChoices(models.TextChoices):
    PENDING = "pending", "Kutilmoqda"
    CONFIRMED = "confirmed", "Tasdiqlangan"
    PROCESSING = "processing", "Tayyorlanmoqda"
    SHIPPED = "shipped", "Jo'natildi"
    DELIVERED = "delivered", "Topshirildi"
    CANCELLED = "cancelled", "Bekor qilindi"

# # -----------------------------
# # Coupon fields(code,discount_percent,is_active,expires_at
# # -----------------------------
# class Coupon(BaseModel):
#
#     code = models.CharField(max_length=40,null=True,blank=True)
#     discount_percent = models.SmallIntegerField(
#         validators=[MinValueValidator(1),MaxValueValidator(100)]
#     )
#     is_active = models.BooleanField(default=True)
#     expires_at = models.DateTimeField(null=True,blank=True)
#
#     def is_valid(self) -> bool:
#         if not self.is_active:
#             return False
#         if self.expires_at and self.expires_at < timezone.now():
#             return False
#         return True


# -----------------------------
    # Order fields(user,paymentstatus,statuschoics,
    # address,phone,total_amount,discount_amount,
    # payable_amount,coupon,is_installment)
# -----------------------------
class Order(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    status_choices = models.CharField(
        max_length=14,choices=StatusChoices.choices,
        default=StatusChoices.PENDING,db_index=True
    )
    payment_status = models.CharField(
        max_length=22,choices=PaymentChoices.choices,
        default=PaymentChoices.UNPAID,db_index=True
    )
    address = models.TextField()
    phone = models.CharField(
        max_length=13,validators=[phone_regex])

    total_amount = models.DecimalField(
        max_digits=12,decimal_places=2,default=Decimal("0.00")
    )
    discount_amount = models.DecimalField(
        max_digits=12,decimal_places=2,default=Decimal("0.00")
    )
    payable_amount = models.DecimalField(
        max_digits=12,decimal_places=2,default=Decimal("0.00")
    )
    # coupon = models.ForeignKey(
    #     Coupon,on_delete=models.SET_NULL,
    #     null=True,blank=True,
    #     related_name='Orders'
    # )
    is_installment = models.BooleanField(default=False)

    objects = OrderManager()
    all_objects = Manager()

    # def clean(self):
    #     if self.coupon and not self.coupon.is_valid():
    #         raise ValidationError(
    #             {
    #                 'coupon':"Kupon hali aktiv emas yoki muddati tugagan"
    #             }
    #         )

    def calculate_totals(self,save=True):
        """
            total_amount = items subtotal yig'indisi
            discount_amount = coupon bo'lsa hisoblanadi
            payable_amount = total - discount
        """
        total = self.items.aggregate(total=Sum('subtotal'))['total'] or Decimal("0.00")

        discount = Decimal("0.00")
        # if self.coupon and self.coupon.is_valid():
        #     discount = (total*Decimal(self.coupon.discount_percent))/Decimal("100")

        payable = total - discount
        payable = payable.quantize(Decimal("0.01"),rounding=ROUND_HALF_UP)
        discount = discount.quantize(Decimal("0.01"),rounding=ROUND_HALF_UP)
        total = total.quantize(Decimal("0.01"),rounding=ROUND_HALF_UP)

        self.total_amount = total
        self.discount_amount = discount
        self.payable_amount = payable

        if save:
            self.save(update_fields=['total_amount','discount_amount','payable_amount'])

        return total,discount,payable

    def update_payment_status_from_installments(self,save=True):

        if not self.is_installment:
            return

        if not hasattr(self, "installment") or self.installment is None:
            return

        total = self.installment.count()
        paid = self.installment.payments.filter(is_paid=True).count()

        if paid == 0:
            self.payment_status = PaymentChoices.UNPAID

        elif paid < total:
            self.payment_status = PaymentChoices.PARTIAL

        else:
            self.payment_status = PaymentChoices.PAID

        if save:
            self.save(update_fields=['payment_status'])

    def __str__(self):
        return f"Order #{self.pk} - {self.user}"


# -----------------------------
# OrderItem fields(order,variant,quantity,unit_price,subtotal)
# -----------------------------
class OrderItem(BaseModel):

    order = models.ForeignKey(
        Order,on_delete=models.CASCADE,related_name='items'
    )

    variant = models.ForeignKey(
        ProductVariant,on_delete=models.PROTECT,related_name='order_items'
    )

    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    unit_price = models.DecimalField(
        max_digits=10,decimal_places=2,validators=[MinValueValidator(0)]
    )

    subtotal = models.DecimalField(
        max_digits=12,decimal_places=2,validators=[MinValueValidator(0)]
    )

    class Meta:
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['variant'])
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(quantity__gte=1),name='orderitem_quantity_gte_1'),
            models.CheckConstraint(check=models.Q(unit_price__gte=0),name='orderitem_unit_price_gte_0'),
            models.CheckConstraint(check=models.Q(subtotal__gte=0),name='orderitem_subtotal_gte_0')
        ]

    def clean(self):
        # subtotal = unit_price * qty bo‘lishi kerak
        if self.quantity and self.unit_price is not None:
            expected = (self.unit_price * Decimal(self.quantity)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if self.subtotal is not None and self.subtotal != expected:
                raise ValidationError({"subtotal": "Subtotal noto‘g‘ri hisoblangan."})

    def save(self, *args, **kwargs):
        if self.unit_price is not None and self.quantity:
            self.subtotal = (self.unit_price * Decimal(self.quantity)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.variant} x{self.quantity} (Order #{self.order_id})"


# -----------------------------
# InstallmentPlan fields(order,months,total_amount,monthly_amount,is_approved)
# -----------------------------
class InstallmentPlan(BaseModel):

    order = models.OneToOneField(Order,on_delete=models.CASCADE,null=True,blank=True,related_name='installment')
    months = models.PositiveIntegerField(validators=[MinValueValidator(1)],default=1)
    total_amount = models.DecimalField(max_digits=12,decimal_places=2,validators=[MinValueValidator(0)],default=0)
    monthly_amount = models.DecimalField(max_digits=12,decimal_places=2,validators=[MinValueValidator(0)],default=0)
    is_approved = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=['months']),
            models.Index(fields=['is_approved'])
        ]

    def __str__(self):
        return f"Installment #{self.pk} for Order #{self.order_id}"


# -----------------------------
# InstallmentPayment fields(installment,month,amount,is_paid,paid_at)
# -----------------------------
class InstallmentPayment(BaseModel):
    installment = models.ForeignKey(InstallmentPlan, on_delete=models.CASCADE, related_name="payments")
    month = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])

    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["installment", "month"], name="uniq_installment_month"),
        ]
        indexes = [
            models.Index(fields=["installment"]),
            models.Index(fields=["is_paid"]),
        ]

    def mark_paid(self, save=True):
        self.is_paid = True
        self.paid_at = timezone.now()
        if save:
            self.save(update_fields=["is_paid", "paid_at"])
        self.installment.order.update_payment_status_from_installments(save=True)

    def __str__(self):
        return f"Payment month {self.month} for Order #{self.installment.order_id}"