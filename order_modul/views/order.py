from decimal import Decimal

from django.db import transaction, models
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import status,viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


from core.permissions import IsOrderOwner,IsAdmin
from core.permissions.orders import CanManagerOrderStatus
from order_modul.models import Order, OrderItem
from order_modul.serializers import (
    OrderListSerializer,OrderDetailSerializer,OrderCreateSerializer
)
from order_modul.services.order_service import create_order
from product_modul.models import ProductVariant


class OrderViewSet(viewsets.ModelViewSet):

    queryset = Order.objects.all()

    def get_permissions(self):

        action_method = getattr(self,self.action,None)
        if action_method and hasattr(action_method,'permission_classes'):
            return [p() for p in action_method.permission_classes]

        if self.action in ['create','list','retrieve','cancel']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):

        if getattr(self,'swagger_fake_view',False):
            return Order.objects.none()
        user = self.request.user
        if not user or not user.is_authenticated:
            return Order.objects.none

        if user.is_staff and user.is_superuser:
            return Order.objects.all()

        return Order.objects.filter(user_id=user.id)

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderListSerializer

    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    def calculate_total(self):
        total = self.items.aggregate(total=Sum("subtotal"))["total"] or Decimal("0.00")
        self.total_amount = total
        self.save(update_fields=["total_amount"])
        return total

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        items_data = serializer.validated_data.pop("items", None)
        if not items_data or not isinstance(items_data, list):
            return Response({"detail": "items is required and must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        # 1) order create
        order = Order.objects.create(user=request.user, **serializer.validated_data)

        # 2) variantlarni lock qilib olib kelamiz
        variant_ids = [it["variant"].id if hasattr(it["variant"], "id") else it["variant"] for it in items_data]
        variants = ProductVariant.objects.select_for_update().filter(id__in=variant_ids)
        vmap = {v.id: v for v in variants}

        missing = set(variant_ids) - set(vmap.keys())
        if missing:
            return Response({"detail": f"Variant {list(missing)[0]} not found"}, status=status.HTTP_400_BAD_REQUEST)

        # 3) itemlar + stock update
        for it in items_data:
            vid = it["variant"].id if hasattr(it["variant"], "id") else it["variant"]
            qty = int(it.get("quantity", 1))

            if qty <= 0:
                return Response({"detail": "quantity must be >= 1"}, status=status.HTTP_400_BAD_REQUEST)

            v = vmap[vid]

            if v.stock < qty:
                return Response(
                    {"detail": f"Stock yetarli emas: {v.sku} (bor: {v.stock})"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            OrderItem.objects.create(
                order=order,
                variant=v,
                quantity=qty,
                unit_price=v.price,
                subtotal=v.price * qty,
            )

            v.stock -= qty
            v.save(update_fields=["stock"])

        # 4) total hisoblash (buni Order modelga qo'yish kerak!)
        order.calculate_totals()

        return Response(OrderDetailSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)

        # owner yoki admin
        if order.user_id != request.user.id and not (request.user.is_staff or request.user.is_superuser):
            return Response(status=status.HTTP_403_FORBIDDEN)

        if order.status_choices == "delivered":
            return Response({"detail": "Cannot cancel delivered order"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            items = order.items.select_related("variant")

            for item in items:
                v = item.variant
                v.stock += item.quantity
                v.save(update_fields=["stock"])

            order.status_choices = "cancelled"
            order.save(update_fields=["status_choices"])

        return Response({"detail": "order cancelled"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[CanManagerOrderStatus])
    def set_status(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)

        status_value = request.data.get("status")
        valid = [c[0] for c in Order._meta.get_field("status_choices").choices]
        if status_value not in valid:
            return Response({"detail": "invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        order.status_choices = status_value
        order.save(update_fields=["status_choices"])
        return Response({"detail": "status updated"})

