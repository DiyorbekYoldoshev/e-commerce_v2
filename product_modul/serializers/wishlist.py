from rest_framework import serializers

from ..models import Wishlist


class WishlistSerializer(serializers.ModelSerializer):

    product_id = serializers.IntegerField(source="product.id", read_only=True)
    name = serializers.CharField(source="product.name", read_only=True)
    price = serializers.DecimalField(source="product.base_price", max_digits=10, decimal_places=2, read_only=True)
    image = serializers.ImageField(source="product.image", read_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "product_id", "name", "price", "image"]