from django.db import transaction
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer

from ..models.seller import SellerRequest
from ..services import seller_approval


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
            status=SellerRequest.STATUS_PENDING
        ).exists():
            raise serializers.ValidationError(
                "Sizda ko'rib chqilyotgan ariza mavjud"
            )
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        return SellerRequest.objects.create(
            user=user,
            status=SellerRequest.STATUS_PENDING,
            **validated_data
        )


class SellerRequestListSerializer(ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)

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


class SellerRequestAdminActionSerializer(serializers.Serializer):

    ACTION_APPROVE = "approve"
    ACTION_REJECT = "reject"

    action = serializers.ChoiceField(choices=[ACTION_APPROVE, ACTION_REJECT])
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        req: SellerRequest = self.context["seller_request"]

        if req.status != SellerRequest.STATUS_PENDING:
            raise serializers.ValidationError("Bu ariza allaqachon ko‘rib chiqilgan.")

        if attrs["action"] == self.ACTION_REJECT and not attrs.get("reason"):
            raise serializers.ValidationError({"reason": "Reject uchun reason majburiy."})

        return attrs

    def save(self, **kwargs):
        req = self.context["seller_request"]
        action = self.validated_data["action"]
        reason = self.validated_data.get("reason", "")

        with transaction.atomic():
            if action == self.ACTION_APPROVE:
                seller = seller_approval.approve_request(req)
                return seller
            else:
                seller_approval.reject_request(req, reason=reason)
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