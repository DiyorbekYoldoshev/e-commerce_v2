from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsAdmin, IsSeller, IsSellerOwner
from ..models import Seller
from ..serializers import SellerUpdateSerializer
from ..serializers.seller import SellerCreateSerializer, SellerDetailSerializer, SellerListSerializer


class SellerCreateView(APIView):

    permission_classes = [IsAdmin]

    def post(self,request):

        serializer = SellerCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        seller = serializer.save()

        return Response(
            {
                'message':"Seller tasdiqlandi",
                'seller_id':seller.id
            },
            status=status.HTTP_201_CREATED
        )

class AdminSellerDetailView(RetrieveAPIView):

    queryset = Seller.objects.select_related("user").all()
    serializer_class = SellerDetailSerializer
    permission_classes = [IsAdmin]

class AdminSellerListView(ListAPIView):

    queryset = Seller.objects.select_related("user").all()
    serializer_class = SellerListSerializer
    permission_classes = [IsAdmin]


class AdminSellerUpdateView(UpdateAPIView):

    queryset = Seller.objects.select_related("user").all()
    serializer_class = SellerUpdateSerializer
    permission_classes = [IsAdmin | IsSellerOwner]
