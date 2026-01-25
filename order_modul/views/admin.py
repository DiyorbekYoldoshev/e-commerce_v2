from rest_framework.viewsets import ReadOnlyModelViewSet,ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response


from ..models.order import Order,Coupon
from ..serializers import CouponSerializer
from ..serializers.order import OrderDetailSerializer,OrderListSerializer
from core.permissions.users import IsAdmin
class AdminOrderViewSet(ReadOnlyModelViewSet):

    permission_classes = [IsAdmin]
    queryset = Order.objects.all()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderListSerializer

    @action(detail=False,methods=['get'],url_path=r"status/(?P<status>[^/.]+)")
    def by_status(self,request,status=None):
        qs = self.get_queryset().filter(status=status)
        serializer = self.get_serializer(qs,many=True)
        return Response(serializer.data)


class AdminCouponViewSet(ModelViewSet):

    permission_classes = [IsAdmin]
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    