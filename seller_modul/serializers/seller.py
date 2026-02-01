from rest_framework import serializers
from rest_framework.serializers import ModelSerializer, Serializer, SerializerMethodField

from ..models.seller import Seller


class SellerStatsSerializer(Serializer):
    product_count = serializers.IntegerField()
    orders_count = serializers.IntegerField(required=False)
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    avg_rating = serializers.FloatField()


class SellerListSerializer(ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)

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
    user_email = serializers.CharField(source='user.email', read_only=True)
    status = SerializerMethodField()

    class Meta:
        model = Seller
        fields = (
            'id',
            'user_email',
            'shop_name',
            'description',
            'phone_number',
            'address',
            'status',
            'rating',
            'is_active',
            'is_blocked',
            'is_verified',
            'created_at',
        )
        read_only_fields = fields

    def get_status(self, obj: Seller):
        """Return a simple status dictionary so clients can inspect flags."""
        return {
            'is_active': bool(obj.is_active),
            'is_blocked': bool(obj.is_blocked),
            'is_verified': bool(obj.is_verified),
        }


class SellerUpdateSerializer(ModelSerializer):
    class Meta:
        model = Seller
        fields = (
            "shop_name",
            "description",
            "phone_number",
            "address",
        )
