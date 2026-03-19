from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction

from order_modul.models import InstallmentPlan, InstallmentPayment


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