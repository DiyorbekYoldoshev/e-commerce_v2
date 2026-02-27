from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from product_modul.models import ProductVariant
from ..models.order import Order, OrderItem
from .order_item import OrderItemSerializer, OrderItemCreateSerializer
from ..services import create_order


class OrderListSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source="items.count", read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "status_choices",
            "payment_status",
            "total_amount",
            "discount_amount",
            "payable_amount",
            "total_quantity",
            "items_count",
            "created_at",
        )
class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ("id", "address", "phone", "status_choices", "payment_status",
                  "total_amount", "discount_amount", "payable_amount", "items")
        read_only_fields = ("total_amount", "discount_amount", "payable_amount")

class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = ("id", "address", "phone", "items", "is_installment")
        read_only_fields = ("id",)

    def create(self, validated_data):
        request = self.context["request"]
        items = validated_data.pop("items")

        try:
            order = create_order(
                user=request.user,
                order_data=validated_data,
                items=items
            )
        except ValueError as e:
            raise serializers.ValidationError({"detail": str(e)})

        return order








