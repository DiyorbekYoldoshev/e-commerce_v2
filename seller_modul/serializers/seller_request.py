from django.db import transaction
from rest_framework import serializers
from rest_framework.serializers import (
    ModelSerializer,Serializer,SerializerMethodField,ListSerializer)


from ..models.seller import SellerRequest

class SellerRequestCreateSerializer(ModelSerializer):


    class Meta:
        model = SellerRequest
        fields = (
            'shop_name',
            'description',
            'phone_number',
            'address',
        )


    def validate(self, attrs):

        user = self.context['request'].user

        if SellerRequest.objects.filter(
            user=user,
            status='pending'
        ).exists():
            raise serializers.ValidationError(
                "Sizda ko'rib chqilyotgan ariza mavjud"
            )
        return attrs

    def create(self, validated_data):

        user = self.context['request'].user
        return SellerRequest.objects.create(
            user=user,
            status='pending',
            **validated_data
        )

class SellerRequestListSerializer(ListSerializer):

    user_email = serializers.CharField(source='user.email',read_only=True)
    class Meta:
        model = SellerRequest
        fields = (
            'id',
            'user_email',
            'shop_name',
            'phone_number',
            'status',
            'created_at'
        )

class SellerRequestDetailSerializer(ModelSerializer):

    user = serializers.StringRelatedField()

    class Meta:
        model = SellerRequest
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

from rest_framework import serializers
from ..models import SellerRequest


class SellerRequestAdminActionSerializer(serializers.Serializer):


    ACTION_APPROVE = "approve"
    ACTION_REJECT = "reject"

    action = serializers.ChoiceField(choices=[ACTION_APPROVE, ACTION_REJECT])
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        req: SellerRequest = self.context["seller_request"]

        if req.status != "pending":
            raise serializers.ValidationError("Bu ariza allaqachon ko‘rib chiqilgan.")

        if attrs["action"] == self.ACTION_REJECT and not attrs.get("reason"):
            raise serializers.ValidationError({"reason": "Reject uchun reason majburiy."})

        return attrs

    def save(self, **kwargs):
        req = self.context["seller_request"]
        action = self.validated_data["action"]

        with transaction.atomic():
            if action == self.ACTION_APPROVE:

                if hasattr(req,'approve'):
                    req.approve()
                else:
                    req.status = "approved"
                    req.save(update_fields=['status'])

            else:
                if hasattr(req,'reject'):
                    req.reject(reaseon=self.validated_data.get('reason',''))
                else:
                    req.status = 'rejected'
                    if hasattr(req,'reason'):
                        req.reason = self.validated_data.get('reason','')
                        req.save(update_fields=['status','reason'])
                    else:
                        req.save(update_fields=['status'])
        return req


class SellerRequestMyStatusSerializer(serializers.ModelSerializer):

    user = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = SellerRequest
        fields = (
            "id",
            "user",
            "shop_name",
            "description",
            "phone_number",
            "address",
            "status",
            "created_at",
        )
        read_only_fields = fields