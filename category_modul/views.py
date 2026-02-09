from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import filters
from django.db.models import Avg, Sum

from core.permissions import IsAdmin, IsSellerOwner
from .models.category import Category, Attribute
from .serializers.category import (
    CategoryCreateSerializer,
    CategoryDetailSerializer,
    CategoryListSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):


    swagger_tags = ["Category"]

    queryset = (
        Category.objects.all()
        .select_related('parent')
        .prefetch_related('children')
    )
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug']
    ordering_fields = ['created_at', 'name']

    def get_serializer_class(self):
        if self.action == 'list':
            return CategoryListSerializer
        if self.action == 'create':
            return CategoryCreateSerializer
        return CategoryDetailSerializer

    def get_permissions(self):
        # public read-only endpoints
        read_actions = (
            'list', 'retrieve', 'get_subcategories', 'get_parent',
            'get_ancestors', 'get_descendants', 'get_products', 'list_attributes',
            'get_attribute', 'get_products_stats', 'is_leaf', 'is_root'
        )

        write_actions = (
            'create', 'update', 'partial_update', 'destroy', 'delete_category',
            'add_attribute', 'update_attribute', 'delete_attribute'
        )

        if self.action in read_actions:
            return [AllowAny()]

        if self.action in write_actions:
            return [IsAdmin()]

        # fallback
        return [IsAuthenticatedOrReadOnly()]

    # rely on built-in list/retrieve/create/update/destroy implementations

    @action(detail=True, methods=['get'], url_path='attributes')
    def list_attributes(self, request, pk=None):
        category = self.get_object()
        attributes = Attribute.objects.filter(category=category)
        data = [{'id': attr.id, 'name': attr.name} for attr in attributes]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='attributes')
    def add_attribute(self, request, pk=None):
        category = self.get_object()
        name = request.data.get('name')
        if not name:
            return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
        attribute = Attribute.objects.create(category=category, name=name)
        return Response({'id': attribute.id, 'name': attribute.name}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='attributes/(?P<attr_id>[^/.]+)')
    def get_attribute(self, request, pk=None, attr_id=None):
        category = self.get_object()
        try:
            attribute = Attribute.objects.get(id=attr_id, category=category)
            data = {'id': attribute.id, 'name': attribute.name}
            return Response(data, status=status.HTTP_200_OK)
        except Attribute.DoesNotExist:
            return Response({'error': 'Attribute not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['put'], url_path='attributes/(?P<attr_id>[^/.]+)')
    def update_attribute(self, request, pk=None, attr_id=None):
        category = self.get_object()
        try:
            attribute = Attribute.objects.get(id=attr_id, category=category)
            name = request.data.get('name')
            if not name:
                return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)
            attribute.name = name
            attribute.save()
            return Response({'id': attribute.id, 'name': attribute.name}, status=status.HTTP_200_OK)
        except Attribute.DoesNotExist:
            return Response({'error': 'Attribute not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['delete'], url_path='attributes/(?P<attr_id>[^/.]+)')
    def delete_attribute(self, request, pk=None, attr_id=None):
        category = self.get_object()
        try:
            attribute = Attribute.objects.get(id=attr_id, category=category)
            attribute.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Attribute.DoesNotExist:
            return Response({'error': 'Attribute not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='subcategories')
    def get_subcategories(self, request, pk=None):
        category = self.get_object()
        subcategories = category.children.filter(is_active=True)
        serializer = self.get_serializer(subcategories, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='products')
    def get_products(self, request, pk=None):
        category = self.get_object()
        products_qs = getattr(category, 'products', None)
        if products_qs is None:
            return Response([], status=status.HTTP_200_OK)
        products = products_qs.filter(is_active=True)
        data = [{'id': p.id, 'name': getattr(p, 'name', '')} for p in products]
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='products/stats')
    def get_products_stats(self, request, pk=None):
        category = self.get_object()
        products_qs = getattr(category, 'products', None)
        if products_qs is None:
            return Response({'product_count': 0, 'average_price': 0, 'average_rating': 0, 'total_revenue': 0, 'total_orders': 0})

        active_products = products_qs.filter(is_active=True)

        # Try several possible price field names to be robust across models
        price_field_candidates = ['price', 'base_price', 'variants__price']
        avg_price = 0
        total_revenue = 0
        for field in price_field_candidates:
            try:
                avg_price = active_products.aggregate(avg=Avg(field))['avg'] or 0
                total_revenue = active_products.aggregate(total=Sum(field))['total'] or 0
                break
            except Exception:
                avg_price = 0
                total_revenue = 0

        # rating field candidate
        try:
            avg_rating = active_products.aggregate(avg=Avg('rating'))['avg'] or 0
        except Exception:
            avg_rating = 0

        # orders aggregation may vary depending on relation names; try candidates
        order_quantity_candidates = ['orderitem__quantity', 'orders__quantity', 'order__quantity']
        total_orders = 0
        for oq in order_quantity_candidates:
            try:
                total_orders = active_products.aggregate(total=Sum(oq))['total'] or 0
                break
            except Exception:
                total_orders = 0

        count = active_products.count()
        return Response({
            'product_count': count,
            'average_price': avg_price,
            'average_rating': avg_rating,
            'total_revenue': total_revenue,
            'total_orders': total_orders,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='parent')
    def get_parent(self, request, pk=None):
        category = self.get_object()
        parent = category.parent
        if parent and parent.is_active:
            serializer = self.get_serializer(parent, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({'detail': 'Parent category not found or inactive'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path='ancestors')
    def get_ancestors(self, request, pk=None):
        category = self.get_object()
        ancestors = getattr(category, 'get_ancestors', lambda: [])()
        serializer = self.get_serializer(ancestors, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='descendants')
    def get_descendants(self, request, pk=None):
        category = self.get_object()
        descendants = getattr(category, 'get_descendants', lambda: [])()
        serializer = self.get_serializer(descendants, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='is_leaf')
    def is_leaf(self, request, pk=None):
        category = self.get_object()
        is_leaf = not category.children.filter(is_active=True).exists()
        return Response({'is_leaf': is_leaf}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='is_root')
    def is_root(self, request, pk=None):
        category = self.get_object()
        is_root = category.parent is None
        return Response({'is_root': is_root}, status=status.HTTP_200_OK)


