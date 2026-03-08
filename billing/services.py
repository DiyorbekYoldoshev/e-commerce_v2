from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone

from order_modul.models import InstallmentPlan, InstallmentPayment


def create_installments(order, months):

    total = order.payable_amount

    monthly = (total / months).quantize(Decimal("0.01"))

    with transaction.atomic():

        plan = InstallmentPlan.objects.create(

            order=order,

            months=months,

            total_amount=total,

            monthly_amount=monthly,

            is_approved=True
        )

        for month in range(1, months + 1):

            InstallmentPayment.objects.create(

                installment=plan,

                month=month,

                amount=monthly
            )

    return plan

def calculate_installment(total_amount, months):

    total_amount = Decimal(total_amount)
    months = int(months)

    monthly = (total_amount / months).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP
    )

    installments = []

    for i in range(1, months + 1):

        installments.append({
            "month": i,
            "amount": monthly
        })

    return installments