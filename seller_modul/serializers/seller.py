from rest_framework import serializers

from ..models.seller import Seller,SellerRequest


class SellerCreateSerializer(serializers.Serializer):

    request_id = serializers.IntegerField()

    def validate_request_id(self,value):
        try:
            req = SellerRequest.objects.get(
                id=value,
                status = SellerRequest.STATUS_PENDING
            )
        except SellerRequest.DoesNotExist:
            raise serializers.ValidationError("Yaroqsiz yoki oldin ko'rilgan ariza")

        return value

    def create(self, validated_data):

        request_obj = SellerRequest.objects.get(id=validated_data['request_id'])

        seller = Seller.objects.create_seller(
            user=request_obj.user,
            shop_name=request_obj.shop_name,
            description=request_obj.description,
            phone_number=request_obj.phone_number,
            address=request_obj.address,
            is_verified=True,
            is_active=True
        )
        request_obj.status = SellerRequest.STATUS_APPROVED
        request_obj.reviewed_at = seller.created_at
        request_obj.save(update_fields=['status','reviewed_at'])

        return seller



class SellerDetailSerializer(serializers.ModelSerializer):

    user = serializers.SerializerMethodField()
    status = serializers.CharField(source='sellerrequest.status', read_only=True)
    user_email = serializers.SerializerMethodField()
    class Meta:
        model = Seller
        fields = (
            'id',
            'user',
            'user_email',
            'shop_name',
            'description',
            'phone_number',
            'address',
            'rating',
            'status',
            'is_verified',
            'is_active',
            'created_at',
        )
        read_only_fields = (
            'shop_name',
            'description',
            'phone_number',
            'address',
            'status'
        )
    def get_user(self,obj):
        return {
            'id':obj.user_id,
            'email':obj.user.email
        }

    def get_last_request_status(self,obj):

        qs = obj.user.is_seller_request.order_by('-created_at')
        last = qs.first()
        return last.status if last else None


class SellerListSerializer(serializers.ModelSerializer):

    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Seller
        fields = (
            'id',
            'user_email',
            'shop_name',
            'rating',
            'is_verified',
            'is_active',
        )

class SellerUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Seller
        fields = (
            'description',
            'phone_number',
            'address'
        )