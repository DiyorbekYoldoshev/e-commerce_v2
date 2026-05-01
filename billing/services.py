from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction

from order_modul.models import InstallmentPlan, InstallmentPayment

import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

# UZS → USD kursi (1 USD ≈ 12,500 UZS)
UZS_TO_USD_RATE = Decimal("12500")


def create_payment_intent(order_id, installment_id=None):
    """
    Stripe PaymentIntent yaratish (USD da).
    """
    from order_modul.models import Order, InstallmentPayment

    order = Order.objects.get(id=order_id)

    if installment_id:
        # Bo'lib to'lash — bitta oylik to'lov
        payment = InstallmentPayment.objects.get(id=installment_id)
        amount_uzs = payment.amount
        description = f"Nasiya to'lov — Oy {payment.month}"
    else:
        # To'liq to'lov
        amount_uzs = order.payable_amount
        description = f"Buyurtma #{order.id}"

    # UZS → USD konvertatsiya
    amount_usd = Decimal(str(amount_uzs)) / UZS_TO_USD_RATE
    # Stripe cents da ishlaydi (1 USD = 100 cents)
    amount_cents = int(amount_usd * 100)

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        description=description,
        metadata={
            "order_id": order.id,
            "installment_id": installment_id or "",
        },
    )

    return {
        "client_secret": intent.client_secret,
        "amount_uzs": str(amount_uzs),
        "amount_usd": str(amount_usd),
    }

def create_installments(order, months):
    """
    Buyurtma uchun bo'lib to'lash rejasi yaratish.
    FIX #4: Oxirgi oyga qoldiq qo'shiladi (yig'indi = total).
    FIX #8: is_approved=False — admin tasdiqlashi kerak.
    FIX #13: Har bir oylik to'lovga due_date qo'shiladi.
    """
    from dateutil.relativedelta import relativedelta
    from django.utils import timezone

    total = Decimal(str(order.payable_amount))
    months = int(months)

    if months < 1:
        raise ValueError("Oylar soni kamida 1 bo'lishi kerak")

    # FIX #4: Yig'indisi to'g'ri bo'lishi uchun
    monthly = (total / months).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    last_month_amount = total - (monthly * (months - 1))

    with transaction.atomic():
        plan = InstallmentPlan.objects.create(
            order=order,
            months=months,
            total_amount=total,
            monthly_amount=monthly,
            is_approved=False,  # FIX #8: Admin tasdiqlashi kerak
        )

        now = timezone.now()

        for month in range(1, months + 1):
            amount = last_month_amount if month == months else monthly
            due_date = now + relativedelta(months=month)  # FIX #13

            InstallmentPayment.objects.create(
                installment=plan,
                month=month,
                amount=amount,
                due_date=due_date,
            )

    return plan


def calculate_installment(total_amount, months):
    """
    Nasiya hisob-kitobini oldindan ko'rsatish (preview).
    FIX #4: Oxirgi oy uchun qoldiq hisoblanadi.
    """
    total_amount = Decimal(str(total_amount))
    months = int(months)

    if months < 1:
        raise ValueError("Oylar soni kamida 1 bo'lishi kerak")

    monthly = (total_amount / months).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )

    installments = []
    for i in range(1, months + 1):
        amount = total_amount - (monthly * (months - 1)) if i == months else monthly
        installments.append({
            "month": i,
            "amount": str(amount),
        })

    return {
        "months": months,
        "monthly_amount": str(monthly),
        "total_amount": str(total_amount),
        "installments": installments,
    }
