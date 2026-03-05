from rest_framework import serializers
from ..models.product import Product, ProductVariant, VariantAttributeValue

class VariantAttributeValueSerializer(serializers.ModelSerializer):

    attribute_name = serializers.CharField(source='attribute_name',read_only=True)

    class Meta:
        model = VariantAttributeValue
        fields = ["id", "attribute",'attribute_name', "value"]
        read_only_fields = ["id"]

class ProductVariantSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), required=False)
    attributes = VariantAttributeValueSerializer(many=True, required=False)

    class Meta:
        model = ProductVariant
        fields = ["id", "product", "sku", "price", "stock", "attributes"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        attrs_data = validated_data.pop("attributes", [])
        if "product" not in validated_data:
            raise serializers.ValidationError({"product": "product is required."})

        variant = ProductVariant.objects.create(**validated_data)

        for item in attrs_data:
            VariantAttributeValue.objects.create(variant=variant, **item)

        return variant

    def update(self, instance, validated_data):
        attrs_data = validated_data.pop("attributes", None)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if attrs_data is not None:
            instance.attribute_values.all().delete()
            for item in attrs_data:
                VariantAttributeValue.objects.create(variant=instance, **item)

        return instance