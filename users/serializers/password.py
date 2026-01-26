from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from users.models import User


class PasswordChangeSerializer(serializers.ModelSerializer):

    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8,max_length=30)
    new_password_confirm = serializers.CharField()

    class Meta:
        model = User
        fields = ('old_password','new_password','new_password_confirm')

    def validate(self, attrs):

        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {
                    'new_password':"Parollar mos emas"
                }
            )
        validate_password(attrs['new_password'])
        return attrs

