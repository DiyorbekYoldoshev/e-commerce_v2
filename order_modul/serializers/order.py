from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from product_modul.models import ProductVariant
from ..models.order import Order, OrderItem
from .order_item import OrderItemSerializer, OrderItemCreateSerializer
from .installment import InstallmentPlanSerializer, InstallmentPaymentSerializer
from ..services import create_order


class OrderItemInputSerializer(serializers.Serializer):
    variant = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class OrderListSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source="items.count", read_only=True)
    total_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "status_choices",
            "payment_status",
            "is_cash",
            "is_installment",
            "total_amount",
            "discount_amount",
            "payable_amount",
            "total_quantity",
            "items_count",
            "created_at",
        )


class InstallmentPlanDetailSerializer(serializers.ModelSerializer):
    payments = InstallmentPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = __import__(
            'order_modul.models', fromlist=['InstallmentPlan']
        ).InstallmentPlan
        fields = ('id', 'months', 'total_amount', 'monthly_amount', 'is_approved', 'payments')


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    installment_plan = InstallmentPlanDetailSerializer(source="installment", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "address", "phone",
            "status_choices", "payment_status",
            "is_cash", "is_installment",
            "total_amount", "discount_amount", "payable_amount",
            "items", "installment_plan", "user_email", "created_at",
        )
        read_only_fields = ("total_amount", "discount_amount", "payable_amount")


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemInputSerializer(many=True, write_only=True)
    installment_months = serializers.IntegerField(
        write_only=True, required=False, min_value=1, max_value=60
    )

    class Meta:
        model = Order
        fields = ("id", "address", "phone", "items", "is_installment", "is_cash", "installment_months")
        extra_kwargs = {
            "is_cash": {"required": False, "default": False},
        }

    def create(self, validated_data):
        request = self.context["request"]
        items = validated_data.pop("items")
        installment_months = validated_data.pop("installment_months", 3)

        try:
            order = create_order(
                user=request.user,
                order_data=validated_data,
                items=items,
                installment_months=installment_months,
            )
        except ValueError as e:
            raise serializers.ValidationError({"detail": str(e)})

        return order
