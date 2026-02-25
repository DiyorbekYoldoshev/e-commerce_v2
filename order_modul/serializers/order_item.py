from rest_framework import serializers
from ..models.order import OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='variant.product.name',
        read_only=True
    )

    variant_sku = serializers.CharField(
        source='variant.sku',
        read_only=True
    )

    class Meta:
        model = OrderItem
        fields = (
            'id',
            'variant',
            'variant_sku',
            'product_name',
            'quantity',
            'unit_price',
            'subtotal',
        )
class OrderItemCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderItem
        fields = (
            'product',
            'quantity'
        )

    def create(self, validated_data):
        order = self.context['order']
        return OrderItem.objects.create(
            order=order,
            **validated_data
        )