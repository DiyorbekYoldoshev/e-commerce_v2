import re
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models
from order_modul.models import Order
from users.models import User


# ---------- VALIDATORLAR ----------
def validate_card_number(value):
    clean_value = re.sub(r'[\s-]', '', str(value))
    if not clean_value.isdigit():
        raise ValidationError("Karta raqami faqat raqamlardan iborat bo'lishi kerak.")
    if len(clean_value) != 16:
        raise ValidationError("Karta raqami 16 xonali bo'lishi kerak.")


def validate_expiry(value):
    if not re.match(r'^(0[1-9]|1[0-2])\/[0-9]{2}$', str(value)):
        raise ValidationError("Amal qilish muddati MM/YY formatida bo'lishi kerak (masalan: 12/25).")


# ---------- KARTA ----------
class Card(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="cards",
        null=True, blank=True,
    )
    card_number = models.CharField(
        max_length=19,
        validators=[validate_card_number],
        help_text="16 xonali karta raqami",
    )
    expiration_date = models.CharField(
        max_length=5,
        validators=[validate_expiry],
        help_text="Format: MM/YY",
    )
    # Karta balansi (simulyatsiya). Real to'lov tizimi bo'lmagani uchun
    # foydalanuvchi avval kartani "to'ldiradi", keyin shu balansdan to'laydi.
    balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00"),
        help_text="Karta balansi (so'm)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def masked_number(self):
        clean_num = re.sub(r'[\s-]', '', str(self.card_number))
        return f"**** **** **** {clean_num[-4:]}"

    def __str__(self):
        return f"{self.masked_number} ({self.expiration_date})"


# ---------- FOYDALANUVCHI HISOBI (ixtiyoriy umumiy balans) ----------
class Wallet(models.Model):
    """
    Foydalanuvchining umumiy hisob balansi.
    Karta orqali to'ldiriladi va to'lovlar shundan yechiladi.
    """
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="wallet"
    )
    balance = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0.00")
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet({self.user_id}) = {self.balance}"


# ---------- TO'LOV ----------
class Payment(models.Model):
    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("succeeded", "Succeeded"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        ("canceled", "Canceled"),
    )

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="payments"
    )
    card = models.ForeignKey(
        Card, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    installment_payment = models.ForeignKey(
        "order_modul.InstallmentPayment",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="payments",
        help_text="Agar bu nasiyadan oylik to'lov bo'lsa",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.id} - Order {self.order_id} - {self.status}"
