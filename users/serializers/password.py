from rest_framework import serializers

class PasswordChangeSerializer(serializers.ModelSerializer):

    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8,max_length=30)
    new_password_confirm = serializers.CharField()

    def validate(self, attrs):

        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError(
                {
                    'new_password':"Parollar mos emas"
                }
            )
        return attrs

