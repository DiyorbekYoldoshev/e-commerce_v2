from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source="order.id", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_id",
            "stripe_payment_intent",
            "amount",
            "currency",
            "status",
            "installment_payment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields