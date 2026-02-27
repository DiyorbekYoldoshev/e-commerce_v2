from rest_framework import serializers
from ..models.category import Category, Attribute


class CategoryChildSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "type")


class CategoryListSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "type", "children")

    def get_children(self, obj):
        # children prefetched bo‘lsa tez ishlaydi
        qs = obj.children.filter(is_active=True).order_by("name")
        return CategoryChildSerializer(qs, many=True, context=self.context).data


class CategoryDetailSerializer(serializers.ModelSerializer):
    ancestors = serializers.SerializerMethodField()
    slug = serializers.ReadOnlyField()

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "type", "parent", "ancestors", "is_active")

    def get_ancestors(self, obj):
        return [
            {"id": c.id, "name": c.name, "slug": c.slug, "type": c.type}
            for c in obj.get_ancestors()
        ]


class CategoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("name", "type", "parent", "is_active")

    def validate(self, attrs):
        name = (attrs.get("name") or "").strip()
        parent = attrs.get("parent")

        # bir parent ichida bir xil name bo‘lmasin (case-insensitive)
        qs = Category.objects.filter(name__iexact=name, parent=parent)
        if qs.exists():
            raise serializers.ValidationError({"name": "Bu parent ichida shu nomdagi kategoriya oldindan mavjud."})

        # model clean qoidalarini ishlatamiz
        instance = Category(**attrs)
        instance.clean()
        return attrs

class AttributeSerializer(serializers.ModelSerializer):
    categories = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = Attribute
        fields = ("id", "name", "categories")
