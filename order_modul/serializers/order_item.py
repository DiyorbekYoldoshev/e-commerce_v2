from rest_framework import serializers
from ..models.order import OrderItem


class OrderItemSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(
        source="variant.product.name",
        read_only=True
    )

    variant_sku = serializers.CharField(
        source="variant.sku",
        read_only=True
    )

    variant_color = serializers.SerializerMethodField()
    variant_size = serializers.SerializerMethodField()


    class Meta:
        model = OrderItem
        fields = (
            "id",
            "variant",
            "variant_sku",
            "variant_color",
            "variant_size",
            "product_name",
            "quantity",
            "unit_price",
            "subtotal",
        )


    def get_variant_color(self, obj):

        attr = obj.variant.attribute_values.filter(
            attribute__name__iexact="color"
        ).first()

        return attr.value if attr else None


    def get_variant_size(self, obj):

        attr = obj.variant.attribute_values.filter(
            attribute__name__iexact="size"
        ).first()

        return attr.value if attr else None
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