from rest_framework import serializers

from ..models import Coupon

class CouponSerializer(serializers.ModelSerializer):

    is_valid = serializers.SerializerMethodField()
    class Meta:
        model = Coupon
        fields = (
            'id',
            'code',
            'discount_percent',
            'is_valid'
        )

    def get_is_valid(self,obj):
        return obj.is_valid()
