from django.db import transaction
from django.db.models import Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdmin
from core.permissions.orders import CanManagerOrderStatus

from order_modul.models import Order, StatusChoices
from order_modul.serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
)


class OrderViewSet(viewsets.ModelViewSet):


    http_method_names = ["get", "post", "patch", "put", "head", "options", "delete"]

    def get_permissions(self):
        if not self.action:
            return [IsAuthenticated()]

        # action decorator permission_classes bo'lsa
        action_method = getattr(self, self.action, None)
        if action_method and hasattr(action_method, "permission_classes"):
            return [p() for p in action_method.permission_classes]

        if self.action in ("list", "retrieve", "create", "cancel"):
            return [IsAuthenticated()]

        return [IsAdmin()]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Order.objects.none()

        user = self.request.user

        qs = (
            Order.objects.all()
            .annotate(
                total_quantity=Coalesce(Sum("items__quantity"), Value(0)),
            )
            .select_related("user")
            .prefetch_related("items", "items__variant", "items__variant__product")
        )

        if user.is_staff and user.is_superuser:
            return qs

        return qs.filter(user_id=user.id)

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        if self.action == "retrieve":
            return OrderDetailSerializer
        return OrderListSerializer



    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        order = self.get_object()

        # owner yoki admin/superuser
        if order.user_id != request.user.id and not (request.user.is_staff or request.user.is_superuser):
            return Response(status=status.HTTP_403_FORBIDDEN)

        if order.status_choices == StatusChoices.DELIVERED:
            return Response({"detail": "Delivered orderni bekor qilib bo‘lmaydi."}, status=status.HTTP_400_BAD_REQUEST)

        # Order cancel bo‘lsa, stockni qaytaramiz
        with transaction.atomic():
            items = order.items.select_related("variant")

            for item in items:
                v = item.variant
                v.stock += item.quantity
                v.save(update_fields=["stock"])

            order.status_choices = StatusChoices.CANCELLED
            order.save(update_fields=["status_choices"])

        return Response({"detail": "order cancelled"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[CanManagerOrderStatus], url_path="set-status")
    def set_status(self, request, pk=None):
        order = self.get_object()

        status_value = request.data.get("status")
        valid = [c[0] for c in Order._meta.get_field("status_choices").choices]

        if status_value not in valid:
            return Response({"detail": "invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        order.status_choices = status_value
        order.save(update_fields=["status_choices"])
        return Response({"detail": "status updated"}, status=status.HTTP_200_OK)