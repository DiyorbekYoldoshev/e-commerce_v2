from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from core.permissions import IsAdmin
from .models.category import Category, Attribute
from .serializers.category import (
    CategoryCreateSerializer,
    CategoryDetailSerializer,
    CategoryListSerializer,
    AttributeSerializer,
)


class CategoryAddAttributeSerializer(serializers.Serializer):
    attribute_id = serializers.IntegerField(required=False)
    name = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        if not attrs.get("attribute_id") and not attrs.get("name"):
            raise serializers.ValidationError("attribute_id yoki name yuboring.")
        return attrs


class CategoryViewSet(viewsets.ModelViewSet):
    swagger_tags = ["Category"]

    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "slug"]
    ordering_fields = ["created_at", "name"]

    def get_queryset(self):

        qs = Category.objects.all().select_related("parent")

        if self.action in ("list", "retrieve", "subcategories", "ancestors", "list_attributes"):
            qs = qs.prefetch_related("children", "attribute")  # model related_name="attribute"

        return qs

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
        if self.action == "create":
            return [IsAdmin()]
        return [IsAdmin()]  # write actionlar

    # ----------------- Tree actions -----------------
    @action(detail=True, methods=["get"], url_path="subcategories")
    def subcategories(self, request, pk=None):
        category = self.get_object()
        qs = category.children.filter(is_active=True).order_by("name")
        serializer = CategoryListSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="parent")
    def parent_category(self, request, pk=None):
        category = self.get_object()
        parent = category.parent
        if parent and parent.is_active:
            serializer = CategoryDetailSerializer(parent, context={"request": request})
            return Response(serializer.data)
        return Response({"detail": "Parent category topilmadi yoki inactive."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["get"], url_path="ancestors")
    def ancestors(self, request, pk=None):
        category = self.get_object()
        serializer = CategoryDetailSerializer(category.get_ancestors(), many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="is-leaf")
    def is_leaf(self, request, pk=None):
        category = self.get_object()
        leaf = not category.children.filter(is_active=True).exists()
        return Response({"is_leaf": leaf})

    @action(detail=True, methods=["get"], url_path="is-root")
    def is_root(self, request, pk=None):
        category = self.get_object()
        return Response({"is_root": category.parent is None})

    # ----------------- Attributes (M2M) -----------------
    @action(detail=True, methods=["get"], url_path="attributes")
    def list_attributes(self, request, pk=None):
        category = self.get_object()
        attrs = category.attribute.all().order_by("name")
        serializer = AttributeSerializer(attrs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="attributes/add",
        permission_classes=[IsAdmin],
    )
    def add_attribute(self, request, pk=None):

        category = self.get_object()
        ser = CategoryAddAttributeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        attr_id = ser.validated_data.get("attribute_id")
        name = ser.validated_data.get("name")

        if attr_id:
            attr = get_object_or_404(Attribute, pk=attr_id)
        else:
            attr, _ = Attribute.objects.get_or_create(name=name.strip())

        attr.categories.add(category)
        return Response({"id": attr.id, "name": attr.name}, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"attributes/remove/(?P<attr_id>\d+)",
        permission_classes=[IsAdmin],
    )
    def remove_attribute(self, request, pk=None, attr_id=None):
        category = self.get_object()

        try:
            attr_id_int = int(attr_id)
        except (TypeError, ValueError):
            return Response({"detail": "Attribute ID raqam bo‘lishi kerak."}, status=status.HTTP_400_BAD_REQUEST)

        attr = get_object_or_404(Attribute, pk=attr_id_int)
        attr.categories.remove(category)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AttributeViewSet(viewsets.ModelViewSet):
    swagger_tags = ["Attribute"]

    queryset = Attribute.objects.all().prefetch_related("categories")
    serializer_class = AttributeSerializer

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["created_at", "name"]

    def get_permissions(self):
        # public read, admin write
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAdmin()]