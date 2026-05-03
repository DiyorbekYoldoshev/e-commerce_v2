from rest_framework import serializers
from .models import Payment, Card, Wallet


class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)
    card_masked = serializers.CharField(source="card.masked_number", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "order_id",
            "card",
            "card_masked",
            "amount",
            "status",
            "installment_payment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CardSerializer(serializers.ModelSerializer):
    masked_number = serializers.CharField(read_only=True)

    class Meta:
        model = Card
        fields = [
            "id",
            "card_number",
            "masked_number",
            "expiration_date",
            "balance",
            "created_at",
        ]
        extra_kwargs = {
            "card_number": {"write_only": True},
            "balance": {"read_only": True},
        }


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ["balance", "updated_at"]
        read_only_fields = fields


class TopUpSerializer(serializers.Serializer):
    card_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=1)


class ProcessPaymentSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    card_id = serializers.IntegerField()
    installment_id = serializers.IntegerField(required=False, allow_null=True)
