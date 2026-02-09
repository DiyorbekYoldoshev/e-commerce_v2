from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404

from core.permissions import IsProductOwnerOrReadOnly, IsAuthenticatedAndActive

from .models.product import Product, ProductVariant
from .models.favorite import Wishlist
from .models.review import Review

from .serializers.product import (
    ProductListSerializer,
    ProductDetailSerializer,
    ProductCreateUpdateSerializer,
)
from .serializers.variant import ProductVariantSerializer
from .serializers.review import ReviewSerializer, ReviewCreateSerializer
from .serializers.wishlist import WishlistSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """Product endpoints.

    - Public: list, retrieve
    - Authenticated sellers: create product (seller set from request.user)
    - Owners (seller) can update/delete their products
    - Extra actions: variants, add/remove wishlist, reviews
    """

    swagger_tags = ["Product"]

    queryset = (
        Product.objects.all()
        .select_related('category', 'seller')
        .prefetch_related('variants', 'reviews')
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug', 'description']
    ordering_fields = ['created_at', 'base_price', 'name']

    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer

    def get_permissions(self):
        # public read-only
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        # create requires authenticated active user
        if self.action == 'create':
            return [IsAuthenticatedAndActive()]
        # object-level enforced by IsProductOwnerOrReadOnly
        return [IsProductOwnerOrReadOnly()]

    def perform_create(self, serializer):
        # serializer.create will use request from context if needed
        serializer.save()

    @action(detail=True, methods=['get'], url_path='variants')
    def list_variants(self, request, pk=None):
        product = self.get_object()
        variants = product.variants.all()
        serializer = ProductVariantSerializer(variants, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='wishlist', permission_classes=[IsAuthenticatedAndActive])
    def add_to_wishlist(self, request, pk=None):
        product = self.get_object()
        user = request.user
        obj, created = Wishlist.objects.get_or_create(user=user, product=product)
        serializer = WishlistSerializer(obj, context={'request': request})
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

    @action(detail=True, methods=['delete'], url_path='wishlist', permission_classes=[IsAuthenticatedAndActive])
    def remove_from_wishlist(self, request, pk=None):
        product = self.get_object()
        user = request.user
        try:
            item = Wishlist.objects.get(user=user, product=product)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Wishlist.DoesNotExist:
            return Response({'detail': 'Not in wishlist'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='reviews', permission_classes=[IsAuthenticatedAndActive])
    def add_review(self, request, pk=None):
        product = self.get_object()
        serializer = ReviewCreateSerializer(data=request.data, context={'request': request, 'product': product})
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        out = ReviewSerializer(review, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class ProductVariantViewSet(viewsets.ModelViewSet):
    """Manage product variants. Only owners or admins should modify variants."""

    queryset = ProductVariant.objects.select_related('product').all()
    serializer_class = ProductVariantSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['sku']
    ordering_fields = ['id', 'price', 'stock']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsProductOwnerOrReadOnly()]

    def perform_create(self, serializer):
        # require product field provided in request data
        product_id = self.request.data.get('product')
        if not product_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('product field is required')
        serializer.save()


class ReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve reviews. Creation handled on ProductViewSet.add_review."""

    queryset = Review.objects.select_related('product', 'user').all()
    serializer_class = ReviewSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'rating']


# End of product_modul views
