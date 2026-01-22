from rest_framework import viewsets
from ..serializers.user import UserSerializer
from ..models.user import User

class UserViewSet(viewsets.ModelViewSet):

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = []