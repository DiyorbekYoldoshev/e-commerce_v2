from rest_framework import serializers

from ..models import Wishlist


class WishlistSerializer(serializers.ModelSerializer):

    product_name = serializers.CharField(source='product.name',read_only=True)
    product_price = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = (
            'id',
            'product_name',
            'product_price',
            'created_at'
        )