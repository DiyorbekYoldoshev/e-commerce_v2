from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status,viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


from core.permissions import IsOrderOwner,IsAdmin
from core.permissions.orders import CanManagerOrderStatus
from order_modul.models import Order,Coupon
from order_modul.serializers import (
    OrderListSerializer,OrderDetailSerializer,OrderCreateSerializer,CouponSerializer
)
from order_modul.services.order_service import create_order

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

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        items_data = request.data.get("items")
        if not items_data or not isinstance(items_data, list):
            return Response({"detail": "items is required and must be a list"}, status=status.HTTP_400_BAD_REQUEST)

        from product_modul.models import Product

        product_ids = [it.get("product") for it in items_data if it.get("product")]
        products = Product.objects.select_for_update().filter(id__in=product_ids)
        prod_map = {p.id: p for p in products}

        hydrated_items = []
        for it in items_data:
            pid = it.get("product")
            qty = int(it.get("quantity", 1))

            if qty <= 0:
                return Response({"detail": "quantity must be >= 1"}, status=status.HTTP_400_BAD_REQUEST)

            prod = prod_map.get(pid)
            if not prod:
                return Response({"detail": f"Product {pid} not found"}, status=status.HTTP_400_BAD_REQUEST)

            hydrated_items.append({"product": prod, "quantity": qty})

        order = create_order(request.user, serializer.validated_data, hydrated_items)
        return Response(OrderDetailSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        order = get_object_or_404(Order, pk=pk)

        # ✅ permission check (owner yoki admin)
        if order.user_id != request.user.id and not (request.user.is_staff or request.user.is_superuser):
            return Response(status=status.HTTP_403_FORBIDDEN)

        # ⚠️ FIELD nomi sizda status_choices bo‘lsa qolsin, bo‘lmasa statusga almashtiring
        if order.status_choices == "delivered":
            return Response({"detail": "Cannot cancel delivered order"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for item in order.items.select_related("product").all():
                prod = item.product
                if hasattr(prod, "base_stock"):
                    prod.base_stock += item.quantity
                    prod.save(update_fields=["base_stock"])

            order.status_choices = "cancelled"
            order.save(update_fields=["status_choices"])

        return Response({"detail": "order cancelled"})

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

class CouponViewSet(viewsets.ModelViewSet):

    queryset = Coupon.objects.all()
    permission_classes = [IsAdmin]
    serializer_class = CouponSerializer
