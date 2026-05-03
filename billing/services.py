from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from order_modul.models import InstallmentPayment, InstallmentPlan, Order


def create_installments(order: Order, months: int) -> InstallmentPlan:
    total = Decimal(str(order.payable_amount))
    months = int(months)
    if months < 1:
        raise ValueError("months >= 1 bo'lishi kerak")

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
