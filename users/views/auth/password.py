from drf_yasg.utils import swagger_auto_schema
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.serializers.password import PasswordChangeSerializer
from rest_framework import status

class ChangePasswordView(APIView):

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(request_body=PasswordChangeSerializer)
    def post(self, request):

        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {
                    'old_password':"Eski parol noto'g'ri"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response(
            {
                'message':"Parol muvaffaqiyatli o‘zgartirildi"
            },
            status=status.HTTP_200_OK
        )