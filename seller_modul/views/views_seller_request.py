from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsAdmin

from ..models.seller import SellerRequest, Seller
from ..serializers.seller_request import (
    SellerRequestCreateSerializer,
    SellerRequestListSerializer,
    SellerRequestDetailSerializer,
    SellerRequestAdminActionSerializer,
    SellerRequestMyStatusSerializer,
)
from ..serializers.seller import SellerDetailSerializer


class SellerRequestViewSet(viewsets.ModelViewSet):

    queryset = SellerRequest.objects.select_related('user').all()
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == 'create':
            return SellerRequestCreateSerializer
        if self.action == 'list':
            return SellerRequestListSerializer
        if self.action == 'retrieve':
            return SellerRequestDetailSerializer
        if self.action == 'my_requests':
            return SellerRequestMyStatusSerializer
        if self.action == 'admin_action':
            return SellerRequestAdminActionSerializer
        return SellerRequestDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'admin_action'):
            return [IsAdmin()]
        if self.action in ('create', 'my_requests'):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        out_serializer = SellerRequestDetailSerializer(obj, context={'request': request})
        return Response(out_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='me')
    def my_requests(self, request):
        qs = SellerRequest.objects.filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='admin/action')
    def admin_action(self, request, pk=None):
        req_obj = self.get_object()
        serializer = self.get_serializer(data=request.data, context={'seller_request': req_obj})
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        # If approved, serializer.save() returns created Seller instance
        if isinstance(result, Seller):
            out = SellerDetailSerializer(result, context={'request': request})
            return Response(out.data, status=status.HTTP_200_OK)

        # Otherwise return updated request detail
        out = SellerRequestDetailSerializer(result, context={'request': request})
        return Response(out.data, status=status.HTTP_200_OK)
