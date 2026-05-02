from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.conf import settings
from order_modul.models import InstallmentPlan, InstallmentPayment

import stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# UZS → USD kursi (1 USD ≈ 12,500 UZS)
UZS_TO_USD_RATE = Decimal("12500")


def create_payment_intent(order_id, installment_id=None):
    """Stripe PaymentIntent yaratish (USD da)."""
    from order_modul.models import Order, InstallmentPayment as IP

    order = Order.objects.get(id=order_id)

    if installment_id:
        payment = IP.objects.get(id=installment_id)
        amount_uzs = payment.amount
        description = f"Nasiya to'lov — Oy {payment.month}"
    else:
        amount_uzs = order.payable_amount
        description = f"Buyurtma #{order.id}"

    amount_usd = Decimal(str(amount_uzs)) / UZS_TO_USD_RATE
    amount_cents = int((amount_usd * Decimal(100)).to_integral_value(rounding=ROUND_HALF_UP))

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        description=description,
        metadata={
            "order_id": order.id,
            "installment_id": installment_id or "",
        },
        automatic_payment_methods={"enabled": True},
    )

    return {
        "client_secret": intent.client_secret,
        "amount_uzs": str(amount_uzs),
        "amount_usd": str(amount_usd),
    }


def create_installments(order, months):
    """Buyurtma uchun bo'lib to'lash rejasi yaratish."""
    from dateutil.relativedelta import relativedelta
    from django.utils import timezone

    total = Decimal(str(order.payable_amount))
    months = int(months)
    if months < 1:
        raise ValueError("Oylar soni kamida 1 bo'lishi kerak")

    monthly = (total / months).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    last_month_amount = total - (monthly * (months - 1))

    with transaction.atomic():
        plan = InstallmentPlan.objects.create(
            order=order,
            months=months,
            total_amount=total,
            monthly_amount=monthly,
            is_approved=False,
        )
        now = timezone.now()
        for month in range(1, months + 1):
            amount = last_month_amount if month == months else monthly
            due_date = now + relativedelta(months=month)
            InstallmentPayment.objects.create(
                installment=plan,
                month=month,
                amount=amount,
                due_date=due_date,
            )
    return plan


def calculate_installment(total_amount, months):
    total_amount = Decimal(str(total_amount))
    months = int(months)
    if months < 1:
        raise ValueError("Oylar soni kamida 1 bo'lishi kerak")

    monthly = (total_amount / months).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    installments = []
    for i in range(1, months + 1):
        amount = total_amount - (monthly * (months - 1)) if i == months else monthly
        installments.append({"month": i, "amount": str(amount)})
    return {
        "months": months,
        "monthly_amount": str(monthly),
        "total_amount": str(total_amount),
        "installments": installments,
    }
