from django.db import transaction
from rest_framework import serializers

from product_modul.models import ProductVariant
from ..models.order import Order, OrderItem
from .order_item import OrderItemSerializer

class OrderItemCreateSerializer(serializers.Serializer):
    variant = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class OrderListSerializer(serializers.ModelSerializer):

    items_count = serializers.IntegerField(
        source='items.count',
        read_only=True
    )

    class Meta:
        model = Order
        fields = (
            'id',
            'status_choices',
            'payment_status',
            'total_amount',
            'items_count',
            'created_at'
        )

class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ("id", "address", "phone", "status_choices", "payment_status",
                  "total_amount", "discount_amount", "payable_amount", "items")
        read_only_fields = ("total_amount", "discount_amount", "payable_amount")

class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemCreateSerializer(many=True, write_only=True)
    id = serializers.IntegerField(read_only=True)
    class Meta:
        model = Order
        fields = (
            'id',
            "address",
            "phone",
            "items",
            "is_installment",
        )


    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        items = validated_data.pop("items")

        order = Order.objects.create(user=request.user, **validated_data)

        variant_ids = [i["variant"] for i in items]
        variants = ProductVariant.objects.select_for_update().filter(id__in=variant_ids)
        vmap = {v.id: v for v in variants}

        if len(vmap) != len(set(variant_ids)):
            raise serializers.ValidationError({"items": "Variantlardan biri topilmadi."})

        for i in items:
            v = vmap[i["variant"]]
            qty = int(i["quantity"])

            if v.stock < qty:
                raise serializers.ValidationError({"items": f"Stock yetarli emas: {v.sku} (bor: {v.stock})"})

            OrderItem.objects.create(
                order=order,
                variant=v,
                quantity=qty,
                unit_price=v.price,
                subtotal=v.price * qty,
            )

            v.stock -= qty
            v.save(update_fields=["stock"])

        order.calculate_total()
        return order





