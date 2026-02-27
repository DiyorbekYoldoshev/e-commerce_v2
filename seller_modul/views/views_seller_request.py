from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdmin
from seller_modul.models.seller import SellerRequest, Seller
from seller_modul.serializers.seller_request import (
    SellerRequestCreateSerializer,
    SellerRequestListSerializer,
    SellerRequestDetailSerializer,
    SellerRequestAdminActionSerializer,
    SellerRequestMyStatusSerializer,
)
from seller_modul.serializers.seller import SellerDetailSerializer


class SellerRequestViewSet(viewsets.ModelViewSet):
    queryset = SellerRequest.objects.select_related("user").all()
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return SellerRequestCreateSerializer
        if self.action == "list":
            return SellerRequestListSerializer
        if self.action == "retrieve":
            return SellerRequestDetailSerializer
        if self.action == "me":
            return SellerRequestMyStatusSerializer
        if self.action == "admin_action":
            return SellerRequestAdminActionSerializer
        return SellerRequestDetailSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "admin_action"):
            return [IsAdmin()]
        if self.action in ("create", "me"):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            obj = serializer.save()
        except IntegrityError:
            # DB constraint (unique pending) urilishi mumkin
            return Response(
                {"detail": "Sizda pending holatda ariza mavjud."},
                status=status.HTTP_400_BAD_REQUEST
            )

        out = SellerRequestDetailSerializer(obj, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        qs = SellerRequest.objects.filter(user=request.user).order_by("-created_at")
        serializer = SellerRequestMyStatusSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="admin/action")
    def admin_action(self, request, pk=None):
        req_obj = self.get_object()

        serializer = self.get_serializer(data=request.data, context={"seller_request": req_obj})
        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        # approved bo'lsa Seller qaytadi
        if isinstance(result, Seller):
            out = SellerDetailSerializer(result, context={"request": request})
            return Response(out.data, status=status.HTTP_200_OK)

        # reject bo'lsa SellerRequest qaytadi
        out = SellerRequestDetailSerializer(result, context={"request": request})
        return Response(out.data, status=status.HTTP_200_OK)