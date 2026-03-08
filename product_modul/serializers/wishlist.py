from rest_framework import serializers

from ..models import Wishlist


class WishlistSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(source='product.name',read_only=True)
    product_price = serializers.CharField(source='product.base_price',read_only=True)

    class Meta:
        model = Wishlist
        fields = (
            'id',
            'product_name',
            'product_price',
            'created_at'
        )