from rest_framework.generics import ListAPIView,RetrieveAPIView,UpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from core.permissions import IsAdmin, IsSellerOwner
from ..serializers.seller import (
    SellerListSerializer,SellerDetailSerializer,
    SellerUpdateSerializer,SellerStatsSerializer)
from ..models.seller import Seller

class SellerListView(ListAPIView):

    queryset = Seller.objects.all()
    serializer_class = SellerListSerializer
    permission_classes = [IsAdmin]

class SellerDetailView(APIView):

    permission_classes = [IsAdmin]

    def get(self,request,pk):

        seller = get_object_or_404(Seller,pk=pk)
        serializer = SellerDetailSerializer(seller)
        return Response(serializer.data)

class SellerUpdateView(UpdateAPIView):


    permission_classes = [IsAdmin | IsSellerOwner]
    serializer_class = [SellerUpdateSerializer]


