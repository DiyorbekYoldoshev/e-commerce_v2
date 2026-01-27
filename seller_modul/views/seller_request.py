from rest_framework.generics import ListAPIView, RetrieveAPIView, get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ValidationError as DjangoValidationError

from core.permissions import IsAdmin
from ..serializers.seller_request import (
    SellerRequestAdminSerializer,SellerRejectSerializer,SellerApproveSerializer)

from ..models.seller import SellerRequest
from ..services import approve_request, reject_request


class AdminSellerRequestListView(ListAPIView):

    serializer_class = SellerRequestAdminSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = SellerRequest.objects.select_related('user').all()
        status_ = self.request.query_params('status').all()
        if status_:
            queryset = queryset.filter(status=status_)
        return queryset

class AdminSellerRequestDetailView(RetrieveAPIView):

    permission_classes = [IsAdmin]
    serializer_class = SellerRequestAdminSerializer
    queryset = SellerRequest.objects.select_related('user').all()

class AdminSellerRequestApproveView(APIView):

    permission_classes = [IsAdmin]

    def post(self,request,pk):

        serializer = SellerApproveSerializer(data=request.data or None)
        serializer.is_valid(raise_exception=True)

        request_obj = get_object_or_404(
            SellerRequest,
            pk=pk,
            status=SellerRequest.STATUS_PENDING
        )
        try:
            seller = approve_request(request_obj)
        except DjangoValidationError as e:
            return Response({
                'detail':str(e)
            },status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                'message':"Seller muvaffaqiyatli tasdiqlandi",
                'seller_id':seller.id
            },status=status.HTTP_201_CREATED
        )

class AdminSellerRequestRejectView(APIView):

    permission_classes = [IsAdmin]

    def post(self,request,pk):

        ser = SellerRejectSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)

        request_obj = get_object_or_404(
            SellerRequest,
            pk=pk,
            status=SellerRequest.STATUS_PENDING
        )
        try:
            reject_request(request_obj)
        except DjangoValidationError as e:
            return Response(
                {
                    'detail':str(e)
                },status=status.HTTP_400_BAD_REQUEST
            )
        return Response(
            {
                'message':"Seller arizasi rad etildi",
                'request_id':request_obj.id
            },status=status.HTTP_200_OK
        )