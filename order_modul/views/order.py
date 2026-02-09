from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction

from core.permissions import IsOrderOwner, IsAdmin
from core.permissions.orders import CanManagerOrderStatus
from order_modul.models import Order, Coupon
from order_modul.serializers import (
    OrderListSerializer, OrderDetailSerializer, OrderCreateSerializer,
    CouponSerializer
)
from order_modul.services.order_service import create_order


class OrderViewSet(viewsets.ModelViewSet):
    """Customer-facing order endpoints."""

    queryset = Order.objects.all()

    def get_permissions(self):
        if self.action in ['create']:
            return [IsAuthenticated()]
        if self.action in ['list', 'retrieve', 'cancel']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or getattr(user, 'is_superuser', False)):
            return Order.objects.all()
        return Order.objects.filter(user=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        items_data = request.data.get('items')
        if not items_data or not isinstance(items_data, list):
            return Response({'detail': 'items is required and must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        # hydrate product instances
        hydrated_items = []
        from product_modul.models import Product
        product_ids = [it.get('product') for it in items_data]
        products = Product.objects.select_for_update().filter(id__in=product_ids)
        prod_map = {p.id: p for p in products}

        for it in items_data:
            pid = it.get('product')
            qty = it.get('quantity', 1)
            prod = prod_map.get(pid)
            if not prod:
                return Response({'detail': f'Product {pid} not found'}, status=status.HTTP_400_BAD_REQUEST)
            hydrated_items.append({'product': prod, 'quantity': int(qty)})

        order = create_order(request.user, serializer.validated_data, hydrated_items)
        out_serializer = OrderDetailSerializer(order, context={'request': request})
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)
        if order.user != request.user and not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if order.status_choices == 'delivered':
            return Response({'detail': 'Cannot cancel delivered order'}, status=status.HTTP_400_BAD_REQUEST)

        # rollback stock for items
        with transaction.atomic():
            for item in order.items.select_related('product').all():
                prod = item.product
                if hasattr(prod, 'base_stock'):
                    prod.base_stock += item.quantity
                    prod.save(update_fields=['base_stock'])
            order.status_choices = 'cancelled'
            order.save(update_fields=['status_choices'])

        return Response({'detail': 'order cancelled'})

    @action(detail=True, methods=['post'], permission_classes=[CanManagerOrderStatus])
    def set_status(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)
        status_value = request.data.get('status')
        valid = [c[0] for c in Order._meta.get_field('status_choices').choices]
        if status_value not in valid:
            return Response({'detail': 'invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        order.status_choices = status_value
        order.save(update_fields=['status_choices'])
        return Response({'detail': 'status updated'})


class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    permission_classes = [IsAdmin]
    serializer_class = CouponSerializer
