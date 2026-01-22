from rest_framework import serializers

from ..models.user import User
from .profile import ProfileSerializer


class UserSerializer(serializers.ModelSerializer):

    profile = ProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    is_seller = serializers.SerializerMethodField()

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
    def get_full_name(self,obj):
        return obj.full_name

    def get_is_seller(self,obj):
        return getattr(obj,'is_seller',False)