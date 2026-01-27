from rest_framework import serializers

from ..models.seller import SellerRequest


class SellerRequestAdminSerializer(serializers.ModelSerializer):

    user = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email')
    class Meta:
        model = SellerRequest
        fields = (
            'id',
            'user',
            'user_email',
            'shop_name',
            'description',
            'phone_number',
            'address',
            'status',
            'created_at'
        )
        read_only_fields = (
            'shop_name',
            'description',
            'phone_number',
            'address',
        )

    def get_user(self,obj):
        return {
            'id':obj.user_id,
            'email':obj.user.email
        }

class SellerApproveSerializer(serializers.Serializer):
    """
    Body talab qilinmasa ham bo'ladi, lekin swagger uchun qulay.
    """
    # ixtiyoriy: admin comment qo'shmoqchi bo'lsa keyin field qo'shasan
    pass


class SellerRejectSerializer(serializers.Serializer):
    """
    Reject qilish uchun ixtiyoriy reason field.
    """
    reason = serializers.CharField(required=False, allow_blank=True)