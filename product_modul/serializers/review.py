from rest_framework import serializers
from ..models.review import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Review
        fields = (
            'id',
            'user_name',
            'rating',
            'comment',
            'created_at',
        )
class ReviewCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Review
        fields = (
            'rating',
            'comment',
        )

    def validate(self, attrs):
        request = self.context['request']
        product = self.context['product']

        if Review.objects.filter(user=request.user, product=product).exists():
            raise serializers.ValidationError("Siz bu mahsulotga allaqachon baho bergansiz")

        return attrs
