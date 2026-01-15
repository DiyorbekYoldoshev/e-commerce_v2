# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser

from ..models import SellerRequest
from ..services.seller_approval import approve_request


class ApproveSellerRequestAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        req = SellerRequest.objects.get(pk=pk)
        approve_request(req)
        return Response({"detail": "Seller tasdiqlandi"})
