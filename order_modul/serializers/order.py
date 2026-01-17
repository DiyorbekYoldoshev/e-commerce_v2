from rest_framework import serializers

from ..models.order import Order
from .order_item import OrderItemSerializer

class OrderListSerializer(serializers.ModelSerializer):

    items_count = serializers.IntegerField(
        source='items.count',
        read_only=True
    )

    class Meta:
        model = Order
        fields = (
            'id',
            'status',
            'payment_status',
            'total_amount',
            'items_count',
            'created_at'
        )

class OrderDetailSerializer(serializers.ModelSerializer):

    items = OrderItemSerializer(many=True,read_only=True)
    payable_amount = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            'id',
            'status',
            'payment_status',
            'address',
            'phone',
            'total_amount',
            'payable_amount',
            'coupon',
            'is_installment',
            'items',
            'created_at',
        )

    def get_payable_amount(self,obj):
        return obj.get_payable_amount()


class OrderCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Order
        fields = (
            'address',
            'phone',
            'coupon'
        )

    def create(self, validated_data):

        request = self.context['request']
        return Order.objects.create(
            user = request.user,
            **validated_data
        )





