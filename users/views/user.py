from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from core.permissions import IsAdmin
from order_modul.models import Order
from ..serializers.user import UserSerializer
from ..models.user import User

# order app
from order_modul.serializers.order import OrderListSerializer,OrderDetailSerializer


class UserViewSet(viewsets.ModelViewSet):

    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

class OrderGetView(APIView):

    permission_classes = [IsAdmin]

    def get(self,request,pk=None):
        if pk:
            order = Order.objects.get(pk=pk)
            serializer = OrderDetailSerializer(order)
            return Response(serializer.data)
        orders = Order.objects.all()
        serializer = OrderListSerializer(orders,many=True)
        return Response(serializer.data)
