from rest_framework.views import APIView
from rest_framework.response import Response

from rest_framework import status
from django.contrib.auth import authenticate

from users.serializers import UserRegisterSerializer, UserSerializer
from users.services.auth import register_user



class RegisterView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        data.pop("password_confirm")

        user = register_user(**data)
        return Response(UserSerializer(user,context={'request':request}).data, status=status.HTTP_201_CREATED)