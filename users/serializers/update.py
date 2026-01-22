from rest_framework import serializers

from ..models import Profile
from ..models.user import User

class UserUpdateSerializer(serializers.ModelSerializer):

    phone = serializers.CharField(source='profile.phone',required=False)
    bio = serializers.CharField(source='profile.bio',required=False)

    class Meta:
        model = User
        fields = (
            'first_name',
            'last_name',
            'gender',
            'phone',
            'bio'
        )

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile',{})

        instance = super().update(instance, validated_data)

        profile, _ = Profile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save(update_fields=list(profile_data.keys()) if profile_data else None)

        return instance