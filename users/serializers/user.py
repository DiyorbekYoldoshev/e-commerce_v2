from rest_framework import serializers

from ..models.user import User
from .profile import ProfileSerializer


class UserSerializer(serializers.ModelSerializer):

    profile = ProfileSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    is_seller = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'full_name',
            'first_name',
            'last_name',
            'slug',
            'gender',
            'is_seller',
            'profile',
        )

        read_only_fields = (
            'id',
            'email',
            'slug',
            'is_seller'
        )
