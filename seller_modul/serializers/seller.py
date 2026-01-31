from django.core.validators import MaxValueValidator, MinValueValidator
from rest_framework import serializers
from rest_framework.serializers import (
    ModelSerializer,Serializer,SerializerMethodField,ListSerializer)


from ..models.seller import Seller

class SellerStatsSerializer(Serializer):

    product_count = serializers.IntegerField()
    orders_count = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    avg_rating = serializers.FloatField()

class SellerListSerializer(ModelSerializer):

    user_email = serializers.CharField(source='user.email',read_only=True)

    class Meta:

        model = Seller
        fields = (
            'id',
            'user_email',
            'shop_name',
            'phone_number',
            'rating',
            'created_at',
        )
        read_only_fields = fields

class SellerDetailSerializer(ModelSerializer):

    user_email = serializers.CharField(source='user.email',read_only=True)
    status = serializers.CharField(read_only=True)
    class Meta:
        model = Seller
        fields = (
            'id',
            'user',
            'shop_name',
            'description',
            'phone_number',
            'address',
            'status',
            'created_at'
        )




class SellerUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        fields = (
            "shop_name",
            "description",
            "phone_number",
            "address",
        )
