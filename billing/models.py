from django.db import models
from order_modul.models import Order


class Payment(models.Model):

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("succeeded", "Succeeded"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        ("canceled", "Canceled"),
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payments"
    )

    stripe_payment_intent = models.CharField(
        max_length=200,
        unique=True,
        db_index=True,
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)

    currency = models.CharField(max_length=10, default="usd")

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    installment_payment = models.ForeignKey(
        "order_modul.InstallmentPayment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stripe_payments",
        help_text="Agar bo'lib to'lash bo'lsa, qaysi oylik to'lovga tegishli"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.id} - Order {self.order.id} - {self.status}"
