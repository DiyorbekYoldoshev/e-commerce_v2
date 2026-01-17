from rest_framework import serializers
from ..models.order import OrderItem

class OrderItemSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source='product.name',
        read_only=True
    )

    class Meta:
        model = OrderItem
        fields = (
            'id',
            'product',
            'product_name',
            'quantity',
            'price',
            'subtotal'
        )
        read_only_fields = ('price','subtotal')

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