from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from core.permissions import IsAdmin
from .models.category import Category, Attribute
from .serializers.category import (
    CategoryCreateSerializer,
    CategoryDetailSerializer,
    CategoryListSerializer, AttributeSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    swagger_tags = ["Category"]

    queryset = (
        Category.objects.all()
        .select_related("parent")
        .prefetch_related("children", "attributes")  # children + M2M
    )

    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "slug"]
    ordering_fields = ["created_at", "name"]

    def get_serializer_class(self):
        if self.action == "list":
            return CategoryListSerializer
        if self.action == "create":
            return CategoryCreateSerializer
        return CategoryDetailSerializer

    def get_permissions(self):
        read_actions = (
            "list", "retrieve", "subcategories", "parent_category",
            "ancestors", "is_leaf", "is_root", "list_attributes",
        )
        if self.action in read_actions:
            return [AllowAny()]
        return [IsAdmin()]  # create/update/delete va custom write actionlar

    @action(detail=True, methods=["get"], url_path="subcategories")
    def subcategories(self, request, pk=None):
        category = self.get_object()
        qs = category.children.filter(is_active=True).order_by("name")
        serializer = CategoryListSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="parent")
    def parent_category(self, request, pk=None):
        category = self.get_object()
        parent = category.parent
        if parent and parent.is_active:
            serializer = CategoryDetailSerializer(parent, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"detail": "Parent category topilmadi yoki inactive."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["get"], url_path="ancestors")
    def ancestors(self, request, pk=None):
        category = self.get_object()
        serializer = CategoryDetailSerializer(category.get_ancestors(), many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="is-leaf")
    def is_leaf(self, request, pk=None):
        category = self.get_object()
        leaf = not category.children.filter(is_active=True).exists()
        return Response({"is_leaf": leaf}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="is-root")
    def is_root(self, request, pk=None):
        category = self.get_object()
        return Response({"is_root": category.parent is None}, status=status.HTTP_200_OK)

    # ---------- Attributes (M2M) ----------
    @action(detail=True, methods=["get"], url_path="attributes")
    def list_attributes(self, request, pk=None):
        category = self.get_object()
        attrs = category.attributes.all().order_by("name")
        serializer = AttributeSerializer(attrs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="attributes/add")
    def add_attribute(self, request, pk=None):
        """
        Body: { "attribute_id": 1 } yoki { "name": "Color" }
        """
        category = self.get_object()
        attr_id = request.data.get("attribute_id")
        name = request.data.get("name")

        if attr_id:
            try:
                attr = Attribute.objects.get(pk=attr_id)
            except Attribute.DoesNotExist:
                return Response({"detail": "Attribute topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        else:
            if not name:
                return Response({"detail": "attribute_id yoki name yuboring."}, status=status.HTTP_400_BAD_REQUEST)
            attr, _ = Attribute.objects.get_or_create(name=name.strip())

        attr.categories.add(category)
        return Response({"id": attr.id, "name": attr.name}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="attributes/remove/(?P<attr_id>[^/.]+)")
    def remove_attribute(self, request, pk=None, attr_id=None):
        category = self.get_object()
        try:
            attr = Attribute.objects.get(pk=attr_id)
        except Attribute.DoesNotExist:
            return Response({"detail": "Attribute topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        attr.categories.remove(category)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AttributeViewSet(viewsets.ModelViewSet):
    queryset = Attribute.objects.all().prefetch_related("categories")
    permission_classes = [IsAuthenticatedOrReadOnly]  # xohlasangiz IsAdmin qiling
    serializer_class = AttributeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["created_at", "name"]