import stripe
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db import transaction

from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from billing.models import Payment
from billing.serializers import PaymentSerializer
from order_modul.models import Order, InstallmentPayment

stripe.api_key = settings.STRIPE_SECRET_KEY


def _convert_to_stripe_amount(amount_uzs):
    """UZS summani Stripe uchun cents (USD) ga aylantiradi."""
    requested_currency = "uzs"
    stripe_currency = getattr(settings, "STRIPE_CURRENCY", "usd").lower()

    if stripe_currency == "uzs":
        # Stripe to'g'ridan-to'g'ri UZS (so'mda)
        return int(Decimal(amount_uzs) * Decimal(100)), stripe_currency

    rate = getattr(settings, "STRIPE_UZS_TO_USD_RATE", None)
    if not rate:
        # Default: 1 USD = 12500 UZS
        rate_uzs_per_usd = Decimal("12500")
    else:
        rate_uzs_per_usd = Decimal(str(rate))

    usd = (Decimal(amount_uzs) / rate_uzs_per_usd).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    cents = int((usd * Decimal(100)).to_integral_value(rounding=ROUND_HALF_UP))
    return cents, stripe_currency


class CreatePaymentIntent(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        installment_id = request.data.get("installment_id")

        if not order_id:
            return Response({"error": "order_id majburiy"}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, id=order_id)

        if order.user != request.user:
            return Response({"error": "Bu buyurtma sizga tegishli emas"}, status=status.HTTP_403_FORBIDDEN)

        is_installment_order = hasattr(order, "installment_plan") and order.installment_plan is not None
        payment_method = getattr(order, "payment_method", None)
        if not installment_id:
            if payment_method == "cash":
                return Response(
                    {"error": "Bu buyurtma naqd to'lov uchun. Online to'lov mumkin emas."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if is_installment_order:
                return Response(
                    {"error": "Bo'lib to'lash buyurtmasi. Har oy alohida to'lang."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if order.payment_status == "paid":
                return Response({"error": "Bu buyurtma allaqachon to'langan"}, status=status.HTTP_400_BAD_REQUEST)

        installment = None
        if installment_id:
            installment = get_object_or_404(
                InstallmentPayment, id=installment_id, installment__order=order
            )
            if installment.is_paid:
                return Response(
                    {"error": "Bu oylik to'lov allaqachon amalga oshirilgan"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        existing_qs = Payment.objects.filter(order=order, status="pending")
        if installment:
            existing_qs = existing_qs.filter(installment_payment=installment)
        else:
            existing_qs = existing_qs.filter(installment_payment__isnull=True)

        succeeded_qs = Payment.objects.filter(order=order, status="succeeded")
        if installment:
            succeeded_qs = succeeded_qs.filter(installment_payment=installment)
        else:
            succeeded_qs = succeeded_qs.filter(installment_payment__isnull=True)
        if succeeded_qs.exists():
            return Response({"error": "To'lov allaqachon amalga oshirilgan"}, status=status.HTTP_400_BAD_REQUEST)

        amount_uzs = installment.amount if installment else order.payable_amount

        existing_pending = existing_qs.first()
        if existing_pending:
            try:
                intent = stripe.PaymentIntent.retrieve(existing_pending.stripe_payment_intent)
                if intent.status in ("requires_payment_method", "requires_confirmation", "requires_action", "processing"):
                    return Response({
                        "client_secret": intent.client_secret,
                        "payment_intent_id": intent.id,
                        "amount": str(amount_uzs),
                        "reused": True,
                    })
                existing_pending.status = "canceled"
                existing_pending.save(update_fields=["status"])
            except stripe.error.StripeError:
                existing_pending.status = "canceled"
                existing_pending.save(update_fields=["status"])

        stripe_amount_cents, stripe_currency = _convert_to_stripe_amount(amount_uzs)

        metadata = {"order_id": str(order.id)}
        if installment_id:
            metadata["installment_id"] = str(installment_id)

        try:
            intent = stripe.PaymentIntent.create(
                amount=stripe_amount_cents,
                currency=stripe_currency,
                metadata=metadata,
                description=f"Order #{order.id}" + (
                    f" - Installment #{installment_id}" if installment_id else ""
                ),
                automatic_payment_methods={"enabled": True},
            )
            with transaction.atomic():
                Payment.objects.create(
                    order=order,
                    stripe_payment_intent=intent.id,
                    amount=amount_uzs,
                    currency="uzs",
                    stripe_currency=stripe_currency,
                    stripe_amount_cents=stripe_amount_cents,
                    status="pending",
                    installment_payment=installment,
                )
        except stripe.error.StripeError as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": str(amount_uzs),
            "reused": False,
        })


class PaymentListView(ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            order__user=self.request.user
        ).select_related("order", "installment_payment").order_by("-created_at")
