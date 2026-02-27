from django.db.models import Avg, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsSellerOwner, IsAdmin
from seller_modul.models.seller import Seller
from seller_modul.serializers.seller import (
    SellerListSerializer,
    SellerDetailSerializer,
    SellerUpdateSerializer,
    SellerStatsSerializer,
)


class SellerViewSet(viewsets.ModelViewSet):
    """
    Admin:
      - list, retrieve, update/partial_update, stats
    Seller owner:
      - me, me_update, my_stats
    """

    queryset = Seller.objects.select_related("user").all()
    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_serializer_class(self):
        if self.action == "list":
            return SellerListSerializer
        if self.action in ("retrieve", "me"):
            return SellerDetailSerializer
        if self.action in ("update", "partial_update", "me_update"):
            return SellerUpdateSerializer
        if self.action in ("stats", "my_stats"):
            return SellerStatsSerializer
        return SellerDetailSerializer

    def get_permissions(self):
        # admin actions
        if self.action in ("list", "retrieve", "update", "partial_update", "stats"):
            return [IsAdmin()]

        # seller-owner actions
        if self.action in ("me", "me_update", "my_stats"):
            return [IsSellerOwner()]

        return [IsAdmin()]

    # --------- helpers ----------
    def _get_my_seller(self, request):
        seller = getattr(request.user, "seller", None)
        return seller

    def _build_stats_for_user(self, user):
        """
        Sizning Product model: seller FK related_name='seller_products'
        """
        products_qs = getattr(user, "seller_products", None)
        if products_qs is None:
            # fallback (agar related_name boshqa bo'lsa)
            return {
                "product_count": 0,
                "orders_count": 0,
                "revenue": 0,
                "avg_rating": 0,
            }

        # product count
        product_count = products_qs.count()

        # avg rating: product reviewlaridan o'rtacha
        avg_rating = products_qs.aggregate(avg=Avg("reviews__rating"))["avg"] or 0

        # orders: sizda Order user FK related_name='orders' bo'lgan
        orders_qs = getattr(user, "orders", None)
        if orders_qs is None:
            orders_count = 0
            revenue = 0
        else:
            orders_count = orders_qs.count()
            revenue = orders_qs.aggregate(total=Sum("total_amount"))["total"] or 0

        return {
            "product_count": product_count,
            "orders_count": orders_count,
            "revenue": revenue,
            "avg_rating": avg_rating,
        }

    # --------- endpoints ----------
    @action(detail=False, methods=["get"], url_path="me", permission_classes=[IsAuthenticated])
    def me(self, request):
        seller = self._get_my_seller(request)
        if not seller:
            return Response({"detail": "Sizda seller profili yo'q"}, status=status.HTTP_404_NOT_FOUND)
        serializer = SellerDetailSerializer(seller, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["patch", "put"], url_path="me", permission_classes=[IsAuthenticated])
    def me_update(self, request):
        """
        Endi alohida 'me/update' shart emas:
        PATCH/PUT /sellers/sellers/me/
        """
        seller = self._get_my_seller(request)
        if not seller:
            return Response({"detail": "Sizda seller profili yo'q"}, status=status.HTTP_404_NOT_FOUND)

        partial = request.method.lower() == "patch"
        serializer = SellerUpdateSerializer(seller, data=request.data, partial=partial, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        out = SellerDetailSerializer(seller, context={"request": request})
        return Response(out.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        """
        Admin: seller stats
        """
        seller = self.get_object()
        data = self._build_stats_for_user(seller.user)

        serializer = SellerStatsSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="me/stats", permission_classes=[IsAuthenticated])
    def my_stats(self, request):
        """
        Seller owner: my stats
        """
        seller = self._get_my_seller(request)
        if not seller:
            return Response({"detail": "Sizda seller profili yo'q"}, status=status.HTTP_404_NOT_FOUND)

        data = self._build_stats_for_user(request.user)
        serializer = SellerStatsSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)