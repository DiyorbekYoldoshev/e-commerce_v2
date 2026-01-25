from rest_framework import serializers

from ..models import Profile, User


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, max_length=30,min_length=8)
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
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {
                    'password':"Parollar mos emas"
                }
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password,**validated_data)
        Profile.objects.get_or_create(user=user)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)