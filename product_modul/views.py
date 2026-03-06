from django.db.models import Avg, Count, Sum, Value
from django.db.models.functions import Coalesce

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.permissions import (
    IsProductOwnerOrReadOnly,
    IsAuthenticatedAndActive,
    IsSeller,
)

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
    - Sellers: create
    - Owner (seller) can update/delete
    - Actions: variants, wishlist, reviews
    """

    swagger_tags = ["Product"]

    queryset = Product.objects.select_related("category", "seller").annotate(
        average_rating=Coalesce(Avg("reviews__rating"), Value(0.0)),
        reviews_count=Count("reviews", distinct=True),
        total_stock=Coalesce(Sum("variants__stock"), Value(0)),
    )

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["created_at", "base_price", "name"]

    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "list":
            return ProductListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ProductCreateUpdateSerializer
        return ProductDetailSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]

        if self.action == "create":
            return [IsAuthenticatedAndActive(), IsSeller()]

        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticatedAndActive(), IsProductOwnerOrReadOnly()]

        return [IsAuthenticatedAndActive()]

    def get_queryset(self):
        qs = Product.objects.select_related("category", "seller").annotate(
            average_rating=Coalesce(Avg("reviews__rating"), Value(0.0)),
            reviews_count=Count("reviews", distinct=True),
            total_stock=Coalesce(Sum("variants__stock"), Value(0)),
        )

        if self.action in ("list", "retrieve"):
            return qs

        if self.request.user.is_staff or self.request.user.is_superuser:
            return qs

        return qs.filter(seller=self.request.user)

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="variants")
    def variants(self, request, pk=None):
        product = self.get_object()

        if request.method == "GET":
            qs = product.variants.all()
            serializer = ProductVariantSerializer(qs, many=True, context={"request": request})
            return Response(serializer.data)

        if not (request.user.is_authenticated and product.seller_id == request.user.id):
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProductVariantSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


    @action(detail=True, methods=["post"], url_path="wishlist", permission_classes=[IsAuthenticatedAndActive])
    def add_to_wishlist(self, request, pk=None):
        product = self.get_object()
        user = request.user
        obj, created = Wishlist.objects.get_or_create(user=user, product=product)
        serializer = WishlistSerializer(obj, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["delete"], url_path="wishlist", permission_classes=[IsAuthenticatedAndActive])
    def remove_from_wishlist(self, request, pk=None):
        product = self.get_object()
        user = request.user
        try:
            item = Wishlist.objects.get(user=user, product=product)
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Wishlist.DoesNotExist:
            return Response({"detail": "Not in wishlist"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["post"], url_path="reviews", permission_classes=[IsAuthenticatedAndActive])
    def add_review(self, request, pk=None):
        product = self.get_object()
        serializer = ReviewCreateSerializer(data=request.data, context={"request": request, "product": product})
        serializer.is_valid(raise_exception=True)
        review = serializer.save(user=request.user, product=product)
        out = ReviewSerializer(review, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="my-products", permission_classes=[IsAuthenticatedAndActive])
    def my_products(self, request):
        qs = Product.objects.filter(seller=request.user).select_related("category", "seller").annotate(
            average_rating=Coalesce(Avg("reviews__rating"), Value(0.0)),
            reviews_count=Count("reviews", distinct=True),
            total_stock=Coalesce(Sum("variants__stock"), Value(0)),
        )

        category_id = request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)

        serializer = ProductListSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
class ProductVariantViewSet(viewsets.ModelViewSet):
    """Variant CRUD via /product-variant/.
    - list/retrieve public
    - create/update/delete: only authenticated seller AND owner rule via IsProductOwnerOrReadOnly
    """

    queryset = ProductVariant.objects.select_related("product").all()
    serializer_class = ProductVariantSerializer

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["sku"]
    ordering_fields = ["id", "price", "stock"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]

        if self.action == "create":
            return [IsAuthenticatedAndActive(), IsSeller()]

        return [IsAuthenticatedAndActive(), IsProductOwnerOrReadOnly()]


class ReviewViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Review.objects.select_related("product", "user").all()
    serializer_class = ReviewSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "rating"]