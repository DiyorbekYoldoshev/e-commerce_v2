from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models.profile import Profile
from users.serializers import UserSerializer, UserUpdateSerializer
from users.serializers.profile import ProfileSerializer

class ProfileView(RetrieveUpdateAPIView):

    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self):
        obj,_ = Profile.objects.get_or_create(user=self.request.user)
        return obj

class MeView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self,request):
        serializer = UserSerializer(request.user,context={'request':request})
        return Response(serializer.data,status=status.HTTP_200_OK)

    def patch(self,request):
        serializer = UserUpdateSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
            context={'request':request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(
                user,
                context={'request':request}).data,
                status=status.HTTP_200_OK
            )
