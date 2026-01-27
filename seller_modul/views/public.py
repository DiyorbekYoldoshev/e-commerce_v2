# seller_modul/views/public.py
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny

from seller_modul.models import Seller
from seller_modul.serializers.seller import SellerListSerializer, SellerDetailSerializer


class SellerListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = SellerListSerializer

    def get_queryset(self):
        qs = Seller.objects.select_related("user").all()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.search(search)  # SellerQuerySet.search()
        return qs


class SellerDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = SellerDetailSerializer
    queryset = Seller.objects.select_related("user").all()
