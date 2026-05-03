from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status as drf_status

from ..models.order import Order, PaymentChoices
from ..serializers.order import OrderDetailSerializer, OrderListSerializer
from core.permissions.users import IsAdmin


class AdminOrderViewSet(ReadOnlyModelViewSet):

    permission_classes = [IsAdmin]
    queryset = Order.objects.all()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderListSerializer

    @action(detail=False, methods=['get'], url_path=r"status/(?P<status>[^/.]+)")
    def by_status(self, request, status=None):
        qs = self.get_queryset().filter(status_choices=status)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='set-payment-status')
    def set_payment_status(self, request, pk=None):
        """
        Faqat admin payment_status ni o'zgartira oladi.
        Ruxsat etilgan statuslar: unpaid, paid, partial, refunded, canceled
        """
        order = self.get_object()
        new_status = request.data.get('payment_status')

        valid_statuses = [c[0] for c in PaymentChoices.choices]
        if new_status not in valid_statuses:
            return Response(
                {'detail': f"Noto'g'ri status. To'g'ri statuslar: {valid_statuses}"},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        order.payment_status = new_status
        order.save(update_fields=['payment_status'])

        return Response({
            'detail': f"To'lov holati '{new_status}' ga o'zgartirildi",
            'payment_status': order.payment_status,
        })

    @action(detail=True, methods=['post'], url_path='confirm-cash-payment')
    def confirm_cash_payment(self, request, pk=None):
        """
        Naqd buyurtma yetkazib berilganda admin to'lovni tasdiqlaydi.
        Faqat: is_cash=True, status=delivered, payment_status=unpaid
        """
        order = self.get_object()

        if not order.is_cash:
            return Response(
                {'detail': "Bu buyurtma naqd to'lov emas"},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if order.status_choices != 'delivered':
            return Response(
                {'detail': "Buyurtma hali yetkazib berilmagan. Avval statusni 'delivered' ga o'tkazing."},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        if order.payment_status == 'paid':
            return Response(
                {'detail': "Bu buyurtma allaqachon to'langan"},
                status=drf_status.HTTP_400_BAD_REQUEST
            )

        order.payment_status = PaymentChoices.PAID
        order.save(update_fields=['payment_status'])

        return Response({
            'detail': "Naqd to'lov tasdiqlandi",
            'payment_status': order.payment_status,
        })
