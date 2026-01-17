from rest_framework import serializers

from ..models.product import ProductVariant,VariantAttributeValue

class VariantAttributeValueSerializer(serializers.ModelSerializer):

    attribute_name = serializers.CharField(source='attribute.name',read_only=True)

    class Meta:
        model = VariantAttributeValue
        fields = (
            'id',
            'attribute',
            'attribute_name',
            'variant'
        )


class ProductVariantSerializer(serializers.ModelSerializer):

    attribute = VariantAttributeValueSerializer(many=True,read_only=True)

    class Meta:
        model = ProductVariant
        fields = (
            'id',
            'sku',
            'price',
            'stock',
            'attributes'
        )