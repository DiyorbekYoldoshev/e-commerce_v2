# seller_modul/views/me.py
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound

from seller_modul.models import Seller
from core.permissions import IsSeller
from seller_modul.serializers.seller import SellerDetailSerializer, SellerUpdateSerializer


class SellerMeView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsSeller]

    def get_object(self):
        try:
            return Seller.objects.select_related("user").get(user=self.request.user)
        except Seller.DoesNotExist:
            raise NotFound("Seller profili topilmadi")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return SellerUpdateSerializer
        return SellerDetailSerializer
