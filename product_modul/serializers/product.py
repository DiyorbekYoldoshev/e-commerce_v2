from django.db.models import Sum
from rest_framework import serializers

from product_modul.serializers.variant import ProductVariantSerializer
from product_modul.serializers.review import ReviewSerializer
from ..models.product import Product


class ProductListSerializer(serializers.ModelSerializer):

    average_rating = serializers.FloatField(read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)

    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'base_price',
            'total_stock',
            'image',
            'average_rating',
            'reviews_count',
        )
    def get_total_stock(self,obj):
        return obj.variants.aggregate(total=Sum('stock'))['total'] or 0

class ProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    seller_name = serializers.CharField(source="seller.email", read_only=True)

    average_rating = serializers.FloatField(read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)

    variants = ProductVariantSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)

    is_wishlisted = serializers.SerializerMethodField()

    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "base_price",
            "total_stock",
            "image",
            "category",
            "category_name",
            "seller",
            "seller_name",
            "average_rating",
            "reviews_count",
            "variants",
            "reviews",
            "is_wishlisted",
            "created_at",
            "updated_at",
        )
    def get_total_stock(self,obj):
        total = 0
        for v in obj.variants.all():
            total += v.stock
        return total

    def get_is_wishlisted(self, obj):
        request = self.context.get("request")
        if not request or request.user.is_anonymous:
            return False
        return obj.wishlisted_by.filter(user=request.user).exists()


class ProductCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = (
            'name',
            'base_price',
            'category',
            'description',
            'image',
            'expiration_date',
            'status'
        )

    def validate(self, attrs):
        instance = Product(**attrs)
        instance.clean()
        return attrs

