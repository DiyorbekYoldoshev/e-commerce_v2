import stripe
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.shortcuts import get_object_or_404

from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from billing.models import Payment
from billing.serializers import PaymentSerializer
from order_modul.models import Order, InstallmentPayment

stripe.api_key = settings.STRIPE_SECRET_KEY


class CreatePaymentIntent(APIView):
    """
    Stripe PaymentIntent yaratish.
    - To'liq to'lov: faqat order_id yuborish
    - Bo'lib to'lash (oylik): order_id + installment_id yuborish
    """
    permission_classes = [IsAuthenticated]  # FIX #2: Authentication majburiy

    def post(self, request):
        order_id = request.data.get("order_id")
        installment_id = request.data.get("installment_id")

        if not order_id:
            return Response(
                {"error": "order_id majburiy"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # FIX #3: 404 qaytaradi, 500 emas
        order = get_object_or_404(Order, id=order_id)

        # FIX #2: Faqat o'z buyurtmasiga to'lov yarata oladi
        if order.user != request.user:
            return Response(
                {"error": "Bu buyurtma sizga tegishli emas"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Buyurtma allaqachon to'langan bo'lsa rad etish
        if order.payment_status == "paid":
            return Response(
                {"error": "Bu buyurtma allaqachon to'langan"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if installment_id:
            installment = get_object_or_404(
                InstallmentPayment,
                id=installment_id,
                installment__order=order  # Buyurtmaga tegishli ekanini tekshirish
            )

            if installment.is_paid:
                return Response(
                    {"error": "Bu oylik to'lov allaqachon amalga oshirilgan"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            amount = installment.amount
        else:
            amount = order.payable_amount

        # FIX #5: installment_id None bo'lsa metadata'ga qo'shmaslik
        metadata = {"order_id": str(order.id)}
        if installment_id:
            metadata["installment_id"] = str(installment_id)

        # Currency handling: support charging in settings.STRIPE_CURRENCY (default usd).
        # If users pay in UZS (so'm) and Stripe doesn't support UZS, convert using
        # STRIPE_UZS_TO_USD_RATE from settings (set in .env). Frontend may send
        # a `currency` field indicating the user's local currency.
        requested_currency = (request.data.get("currency") or "uzs").lower()
        stripe_currency = getattr(settings, "STRIPE_CURRENCY", "usd").lower()

        # Determine amount to send to Stripe (in smallest unit).
        if requested_currency == stripe_currency:
            # same currency: multiply to minor units
            stripe_amount = int(Decimal(amount) * Decimal(100))
        elif requested_currency == "uzs" and stripe_currency == "usd":
            rate = getattr(settings, "STRIPE_UZS_TO_USD_RATE", None)
            if not rate:
                return Response(
                    {"error": "STRIPE_UZS_TO_USD_RATE not configured on server"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            # Convert UZS -> USD then to cents. Use Decimal for safe rounding.
            usd = (Decimal(amount) * Decimal(str(rate))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            stripe_amount = int((usd * Decimal(100)).to_integral_value(rounding=ROUND_HALF_UP))
        else:
            # Fallback: attempt to charge using stripe_currency assuming provided amount
            # is in that currency (risky). Prefer converting on client or supplying rate.
            stripe_amount = int(Decimal(amount) * Decimal(100))

        try:
            intent = stripe.PaymentIntent.create(
                amount=stripe_amount,
                currency=stripe_currency,
                metadata=metadata,
                description=f"Order #{order.id}" + (
                    f" - Installment #{installment_id}" if installment_id else ""
                ),
            )
        except stripe.error.StripeError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY
            )

        return Response({
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id,
            "amount": str(amount),
        })


class PaymentListView(ListAPIView):
    """Foydalanuvchining barcha to'lovlari (pagination bilan)"""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            order__user=self.request.user
        ).select_related("order", "installment_payment")
