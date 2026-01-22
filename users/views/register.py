from rest_framework.views import APIView
from rest_framework.response import Response

from rest_framework import status
from django.contrib.auth import authenticate

class LoginView(APIView):

    permission_classes = []

    def post(self,request):

        email = request.data.get('email')
        password = request.data.get('password')

        user = authenticate(email=email,password=password)

        if not user:
            return Response(
                {
                    'error':"Email yoki parol noto'g'ri"
                },status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(
            {
                'message':"Muvaffaqiyatli login",
                'user_id':user.id,
            },status=status.HTTP_200_OK
        )