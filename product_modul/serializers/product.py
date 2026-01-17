from rest_framework import serializers

from . import ProductVariantSerializer, ReviewSerializer
from ..models.product import Product


class ProductListSerializer(serializers.ModelSerializer):

    average_rating = serializers.FloatField(read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'base_price',
            'base_stock',
            'image',
            'average_rating',
            'reviews_count',
        )

class ProductDetailSerializer(serializers.ModelSerializer):

    category_name = serializers.CharField(source='category.name',read_only=True)
    seller_name = serializers.CharField(source='seller.full_name',read_only=True)

    average_rating = serializers.FloatField(read_only=True)
    reviews_count = serializers.IntegerField(read_only=True)

    variant = ProductVariantSerializer(many=True,read_only=True)
    reviews = ReviewSerializer(many=True,read_only=True)

    is_wishlisted = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'slug',
            'description',
            'base_price',
            'base_stock',
            'image',
            'category',
            'category_name',
            'seller',
            'seller_name',
            'average_rating',
            'reviews_count',
            'variants',
            'reviews',
            'is_wishlisted',
            'created_at',
            'updated_at'
        )

    def get_is_wishlisted(self,obj):
        user = self.context['request'].user
        if user.is_anonymous:
            return False
        return obj.wishlisted_by.filter(user=user).filter


class ProductCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = (
            'name',
            'base_price',
            'base_stock',
            'category',
            'description',
            'image',
            'expiration_date',
            'is_active'
        )

    def validate(self, attrs):
        instance = Product(**attrs)
        instance.clean()
        return attrs

    def create(self, validated_data):
        validated_data['seller'] = self.context['request'].user
        return super().create(validated_data)
