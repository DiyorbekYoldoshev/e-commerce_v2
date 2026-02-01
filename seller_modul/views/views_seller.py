from django.db.models import Avg, Sum
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action

from core.permissions import IsSellerOwner, IsAdmin

from ..models.seller import Seller
from ..serializers.seller import (
    SellerListSerializer, SellerUpdateSerializer,
    SellerDetailSerializer, SellerStatsSerializer
)


class SellerViewSet(viewsets.ModelViewSet):


    queryset = Seller.objects.select_related('user').all()
    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_serializer_class(self):
        if self.action == 'list':
            return SellerListSerializer
        if self.action in ('retrieve', 'me'):
            return SellerDetailSerializer
        if self.action in ('update', 'partial_update', 'update_me'):
            return SellerUpdateSerializer
        if self.action in ('stats', 'my_stats'):
            return SellerStatsSerializer
        return SellerDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'update', 'partial_update', 'stats'):
            return [IsAdmin()]

        if self.action in ('me', 'update_me', 'my_stats'):
            return [IsSellerOwner()]

        return [IsAdmin()]

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        seller = getattr(request.user, 'seller', None)
        if not seller:
            return Response({'detail': "Sizda seller profili yo'q"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(seller, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['put', 'patch'], url_path='me/update')
    def update_me(self, request):
        seller = getattr(request.user, 'seller', None)
        if not seller:
            return Response({'detail': "Sizda seller profile yo'q"}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(seller, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        seller = self.get_object()

        product_count = seller.user.products.count() if hasattr(seller.user, 'products') else 0
        avg_rating = seller.user.products.aggregate(avg=Avg('reviews__rating'))['avg'] or 0 if hasattr(seller.user, 'products') else 0

        orders_count = None
        revenue = None
        if hasattr(seller.user, 'orders'):
            orders_agg = seller.user.orders.aggregate(total=Sum('total_amount'))
            revenue = orders_agg.get('total') or 0
            try:
                orders_count = seller.user.orders.count()
            except Exception:
                orders_count = None

        data = {
            'product_count': product_count,
            'orders_count': orders_count if orders_count is not None else 0,
            'revenue': revenue if revenue is not None else 0,
            'avg_rating': avg_rating,
        }
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='me/stats')
    def my_stats(self, request):
        seller = getattr(request.user, 'seller', None)
        if not seller:
            return Response({'detail': "Sizda seller profile yo'q"}, status=status.HTTP_404_NOT_FOUND)

        product_count = request.user.products.count() if hasattr(request.user, 'products') else 0
        avg_rating = request.user.products.aggregate(avg=Avg('reviews__rating'))['avg'] or 0 if hasattr(request.user, 'products') else 0

        orders_count = None
        revenue = None
        if hasattr(request.user, 'orders'):
            orders_agg = request.user.orders.aggregate(total=Sum('total_amount'))
            revenue = orders_agg.get('total') or 0
            try:
                orders_count = request.user.orders.count()
            except Exception:
                orders_count = None

        data = {
            'product_count': product_count,
            'orders_count': orders_count if orders_count is not None else 0,
            'revenue': revenue if revenue is not None else 0,
            'avg_rating': avg_rating,
        }
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)

