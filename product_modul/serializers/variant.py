from rest_framework import serializers
from category_modul.models import Attribute
from ..models.product import Product, ProductVariant, VariantAttributeValue


class VariantAttributeValueSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    attribute = serializers.PrimaryKeyRelatedField(queryset=Attribute.objects.all())

    class Meta:
        model = VariantAttributeValue
        fields = ["id", "attribute", "attribute_name", "value"]
        read_only_fields = ["id"]


class ProductVariantSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), required=False
    )
    attributes = VariantAttributeValueSerializer(
        many=True, required=False, source="attribute_values"
    )

    class Meta:
        model = ProductVariant
        fields = ["id", "product", "sku", "price", "stock", "attributes"]
        read_only_fields = ["id"]

    def validate_price(self, value):
        """Price musbat bo'lishi kerak"""
        if value < 0:
            raise serializers.ValidationError("Narx manfiy bo'lishi mumkin emas.")
        return value

    def create(self, validated_data):
        attrs_data = validated_data.pop("attribute_values", [])

        if "product" not in validated_data:
            raise serializers.ValidationError({"product": "product is required."})

        variant = ProductVariant.objects.create(**validated_data)

        for item in attrs_data:
            # item["attribute"] — bu Attribute instance (PrimaryKeyRelatedField tomonidan resolve qilingan)
            VariantAttributeValue.objects.create(
                variant=variant,
                attribute=item["attribute"],
                value=item["value"],
            )

        return variant

    def update(self, instance, validated_data):
        attrs_data = validated_data.pop("attribute_values", None)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if attrs_data is not None:
            # Avval hammasi o'chiriladi, keyin yangilar yoziladi
            instance.attribute_values.all().delete()
            for item in attrs_data:
                VariantAttributeValue.objects.create(
                    variant=instance,
                    attribute=item["attribute"],
                    value=item["value"],
                )

        return instance
