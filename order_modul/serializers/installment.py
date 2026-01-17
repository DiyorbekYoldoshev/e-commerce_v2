from rest_framework import serializers
from order_modul.models import InstallmentPlan, InstallmentPayment


class InstallmentPlanSerializer(serializers.ModelSerializer):

    class Meta:
        model = InstallmentPlan
        fields = (
            'id',
            'order',
            'total_amount',
            'months',
            'monthly_amount',
            'is_approved',
        )
        read_only_fields = (
            'total_amount',
            'monthly_amount',
            'is_approved',
        )

class InstallmentPaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = InstallmentPayment
        fields = (
            'id',
            'month',
            'amount',
            'is_paid',
            'paid_at',
        )
        read_only_fields = (
            'amount',
            'paid_at',
        )
