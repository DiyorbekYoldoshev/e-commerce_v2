from django.db.models import Exists, OuterRef
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from seller_modul.models import Seller
from users.models import User
from users.serializers import UserSerializer
from core.permissions import IsAdmin

class AdminViewSet(ReadOnlyModelViewSet):

    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        qs = User.objects.all_with_deleted()
        if self.action == 'list':
            return qs.filter(is_deleted=False)
        return qs

    @action(methods=['get'],detail=False,url_path='active')
    def active(self,request):
        qs = self.get_queryset().filter(is_deleted=False,is_active=True)
        ser = self.get_serializer(qs,many=True,context={'request':request})
        return Response(ser.data)

    @action(methods=['get'],detail=False,url_path='blocked')
    def blocked(self,request):
        qs = self.get_queryset().filter(is_deleted=False,is_active=False)
        ser = self.get_serializer(qs,many=True,context={'request':request})
        return Response(ser.data)

    @action(methods=['get'],detail=False,url_path='deleted')
    def deleted(self,request):
        qs = self.get_queryset().filter(is_deleted=True)
        ser = self.get_serializer(qs,many=True,context={'request':request})
        return Response(ser.data)

    @action(methods=['get'],detail=False,url_path='all')
    def all_users(self,request):
        qs = self.get_queryset()
        ser = self.get_serializer(qs,many=True,context={'request':request})
        return Response(ser.data)

    @action(detail=False, methods=["get"], url_path="sellers")
    def sellers(self, request):
        qs = self.get_queryset().annotate(
            has_seller=Exists(Seller.objects.filter(user_id=OuterRef("pk")))
        ).filter(has_seller=True, is_deleted=False)

        ser = self.get_serializer(qs, many=True, context={"request": request})
        return Response(ser.data)