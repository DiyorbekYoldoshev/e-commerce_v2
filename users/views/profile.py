from rest_framework import viewsets

from ..serializers import ProfileSerializer,UserSerializer


class ProfileViewSet(viewsets.ModelViewSet):


    serializer_class = ProfileSerializer
