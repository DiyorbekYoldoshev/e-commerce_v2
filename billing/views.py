from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from order_modul.models import InstallmentPayment, Order

from .models import Card, Payment, Wallet
from .serializers import (
    CardSerializer,
    PaymentSerializer,
    ProcessPaymentSerializer,
    TopUpSerializer,
    WalletSerializer,
)


# --------- Yordamchi ---------
def get_or_create_wallet(user) -> Wallet:
    wallet, _ = Wallet.objects.get_or_create(user=user)
    return wallet


# --------- KARTA ---------
class CardListCreateView(generics.ListCreateAPIView):
    serializer_class = CardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Card.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CardDeleteView(generics.DestroyAPIView):
    serializer_class = CardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Card.objects.filter(user=self.request.user)


# --------- BALANS ---------
class BalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet = get_or_create_wallet(request.user)
        return Response(WalletSerializer(wallet).data)


class TopUpBalanceView(APIView):
    """Karta orqali wallet'ni to'ldirish (simulyatsiya)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = TopUpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        amount = Decimal(str(ser.validated_data["amount"]))
        card = get_object_or_404(
            Card, id=ser.validated_data["card_id"], user=request.user
        )

        with transaction.atomic():
            wallet = Wallet.objects.select_for_update().get_or_create(
                user=request.user
            )[0]
            wallet.balance = (wallet.balance or Decimal("0")) + amount
            wallet.save()

        return Response({
            "status": "success",
            "message": f"{amount} so'm balansga qo'shildi",
            "balance": str(wallet.balance),
            "card": card.masked_number,
        })


# --------- TO'LOV ---------
class ProcessPaymentView(APIView):
    """
    Buyurtma yoki nasiya oyligi uchun to'lov.
    Mantiq:
      - Naqd buyurtmaga online to'lov mumkin emas (xatolik).
      - Nasiya bo'lsa, faqat ma'lum oylik (installment_id) to'lanadi.
      - Naqd-bo'lmagan to'liq to'lovlar uchun 1 marta to'lash mumkin.
      - Karta yoki Wallet balansidan yechiladi.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = ProcessPaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        order = get_object_or_404(Order, id=data["order_id"], user=request.user)
        card = get_object_or_404(Card, id=data["card_id"], user=request.user)
        installment_id = data.get("installment_id")

        installment = None
        if installment_id:
            installment = get_object_or_404(
                InstallmentPayment,
                id=installment_id,
                installment__order=order,
            )
            if installment.is_paid:
                return Response(
                    {"error": "Bu oylik to'lov allaqachon to'langan"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # To'liq to'lov — agar nasiya rejasi mavjud bo'lsa, uni rad qilamiz
            if hasattr(order, "installment_plan") and order.installment_plan:
                return Response(
                    {"error": "Bu nasiya buyurtma — har oylikni alohida to'lang"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Naqd buyurtmaga online to'lov yo'q
            if getattr(order, "is_cash", False):
                return Response(
                    {"error": "Naqd buyurtma uchun online to'lov mavjud emas"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if order.payment_status == "paid":
                return Response(
                    {"error": "Buyurtma to'liq to'langan"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        amount = Decimal(str(installment.amount if installment else order.payable_amount))

        try:
            with transaction.atomic():
                # 1) Mablag'ni tekshirish va yechish (avval karta, keyin wallet)
                source = None
                card_locked = Card.objects.select_for_update().get(pk=card.id)
                if card_locked.balance >= amount:
                    card_locked.balance -= amount
                    card_locked.save()
                    source = "card"
                else:
                    wallet = Wallet.objects.select_for_update().get_or_create(
                        user=request.user
                    )[0]
                    if wallet.balance < amount:
                        return Response(
                            {"error": "Mablag' yetarli emas. Kartani yoki balansni to'ldiring."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    wallet.balance -= amount
                    wallet.save()
                    source = "wallet"

                # 2) Payment yozuvi
                payment = Payment.objects.create(
                    order=order,
                    card=card_locked,
                    amount=amount,
                    status="succeeded",
                    installment_payment=installment,
                )

                # 3) Statuslarni yangilash
                if installment:
                    installment.is_paid = True
                    if hasattr(installment, "paid_at"):
                        from django.utils import timezone
                        installment.paid_at = timezone.now()
                    installment.save()

                    plan = installment.installment
                    if not plan.payments.filter(is_paid=False).exists():
                        order.payment_status = "paid"
                        order.save()
                    else:
                        order.payment_status = "partial"
                        order.save()
                else:
                    order.payment_status = "paid"
                    order.save()

            return Response({
                "status": "success",
                "message": "To'lov muvaffaqiyatli bajarildi",
                "payment_id": payment.id,
                "source": source,
                "amount": str(amount),
            })
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# --------- TARIX ---------
class PaymentHistoryView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            order__user=self.request.user
        ).order_by("-created_at")
