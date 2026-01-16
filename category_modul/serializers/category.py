from rest_framework import serializers

from ..models.category import Category,Attribute

class CategoryListSerializer(serializers.ModelSerializer):

    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'slug',
            'type',
            'children'
        )

    def get_children(self, obj):
        qs = obj.children.filter(is_active=True)
        return CategoryListSerializer(qs,many=True).data


class CategoryDetailSerializer(serializers.ModelSerializer):

    ancestors = serializers.SerializerMethodField()
    slug = serializers.ReadOnlyField()

    class Meta:
        model = Category
        fields = (
            'id',
            'name',
            'slug',
            'type',
            'parent',
            'ancestors',
        )

    def get_ancestors(self, obj):
        return [
            {
                'id':s.id,
                'name':s.id,
                'slug':s.id
            }
            for s in obj.get_ancestors()
        ]

class CategoryCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = (
            'name',
            'type',
            'parent',
            'is_active',
        )

    def validate(self, attrs):
        name = attrs.get('name')
        parent = attrs.get('parent')
        qs = Category.objects.filter(name__iexact=name,parent=parent)
        if qs.exists():
            raise serializers.ValidationError("Bu nomdagi kategoriya oldindan mavjud")
        instance = Category(**attrs)
        instance.clean()
        return attrs


class AttributeSerializer(serializers.ModelSerializer):
    categories = serializers.StringRelatedField(many=True)
    class Meta:
        model = Attribute
        fields = (
            'id',
            'name',
            'categories'
        )