from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password

from users.models import User
from users.services.auth import register_user


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = (
            'email',
            'first_name',
            'last_name',
            'password',
            'password_confirm'
        )

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({'password': "Parollar mos emas"})

        # validate password strength
        validate_password(attrs['password'])

        # check email uniqueness (including soft-deleted records)
        if User.objects.all_with_deleted().filter(email=attrs.get('email')).exists():
            raise serializers.ValidationError({'email': "Bu email allaqachon ro'yxatdan o'tgan"})

        return attrs

    def create(self, validated_data):
        # delegate creation to service for consistency (creates Profile too)
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')
        user = register_user(email=validated_data.get('email'), password=password,
                             first_name=validated_data.get('first_name', ''),
                             last_name=validated_data.get('last_name', ''))
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)