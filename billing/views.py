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
    """
    Karta orqali ham karta balansini, ham wallet'ni to'ldirish (simulyatsiya).
    Karta balansiga qo'shiladi — to'lov karta balansidan yechiladi.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = TopUpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        amount = Decimal(str(ser.validated_data["amount"]))
        card = get_object_or_404(
            Card, id=ser.validated_data["card_id"], user=request.user
        )

        with transaction.atomic():
            # Karta balansini to'ldirish
            card_locked = Card.objects.select_for_update().get(pk=card.id)
            card_locked.balance = (card_locked.balance or Decimal("0")) + amount
            card_locked.save(update_fields=["balance"])

            # Wallet balansini ham sinxron ushlab turish (ixtiyoriy)
            wallet = Wallet.objects.select_for_update().get_or_create(
                user=request.user
            )[0]
            wallet.balance = (wallet.balance or Decimal("0")) + amount
            wallet.save()

        return Response({
            "status": "success",
            "message": f"{amount} so'm balansga qo'shildi",
            "card_balance": str(card_locked.balance),
            "wallet_balance": str(wallet.balance),
            "card": card_locked.masked_number,
        })


# --------- TO'LOV ---------
class ProcessPaymentView(APIView):
    """
    Buyurtma yoki nasiya oyligi uchun to'lov.
    Mantiq:
      - is_cash=True buyurtmaga online to'lov mumkin emas.
      - Nasiya bo'lsa, faqat ma'lum oylik (installment_id) to'lanadi.
      - To'liq to'lovlar uchun 1 marta to'lash mumkin.
      - Avval karta balansidan, yetmasa wallet balansidan yechiladi.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = ProcessPaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        order = get_object_or_404(Order, id=data["order_id"], user=request.user)
        card = get_object_or_404(Card, id=data["card_id"], user=request.user)
        installment_id = data.get("installment_id")

        # Naqd buyurtmaga online to'lov yo'q
        if order.is_cash:
            return Response(
                {"error": "Naqd buyurtma uchun online to'lov mavjud emas. Admin tasdiqlaydi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
            # To'liq to'lov — nasiya bo'lsa rad qilamiz
            if hasattr(order, "installment") and order.installment:
                return Response(
                    {"error": "Bu nasiya buyurtma — har oylikni alohida to'lang"},
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
                source = None
                card_locked = Card.objects.select_for_update().get(pk=card.id)
                wallet = Wallet.objects.select_for_update().get_or_create(
                    user=request.user
                )[0]

                # Avval karta balansidan, yetmasa wallet'dan
                if card_locked.balance >= amount:
                    card_locked.balance -= amount
                    card_locked.save(update_fields=["balance"])
                    # Wallet ham sinxronlash
                    if wallet.balance >= amount:
                        wallet.balance -= amount
                        wallet.save()
                    source = "card"
                elif wallet.balance >= amount:
                    wallet.balance -= amount
                    wallet.save()
                    source = "wallet"
                else:
                    total_available = card_locked.balance + wallet.balance
                    return Response(
                        {
                            "error": f"Mablag' yetarli emas. "
                                     f"Karta: {card_locked.balance} so'm, "
                                     f"Wallet: {wallet.balance} so'm, "
                                     f"Kerak: {amount} so'm. "
                                     f"Kartani to'ldiring."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Payment yozuvi
                payment = Payment.objects.create(
                    order=order,
                    card=card_locked,
                    amount=amount,
                    status="succeeded",
                    installment_payment=installment,
                )

                # Statuslarni yangilash
                if installment:
                    installment.is_paid = True
                    from django.utils import timezone
                    installment.paid_at = timezone.now()
                    installment.save(update_fields=["is_paid", "paid_at"])

                    plan = installment.installment
                    all_paid = not plan.payments.filter(is_paid=False).exists()
                    order.payment_status = "paid" if all_paid else "partial"
                    order.save(update_fields=["payment_status"])
                else:
                    order.payment_status = "paid"
                    order.save(update_fields=["payment_status"])

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
