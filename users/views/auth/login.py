from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from users.serializers import LoginSerializer,UserSerializer
from users.services.auth import authenticate_user


class LoginView(APIView):

    permission_classes = []

    def post(self,request):

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate_user(**serializer.validated_data)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh':str(refresh),
                'user':UserSerializer(user,context={'request':request}).data
            },status=status.HTTP_200_OK
        )
