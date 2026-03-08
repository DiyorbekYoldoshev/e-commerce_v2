import stripe
from django.conf import settings
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from rest_framework.views import APIView
from rest_framework.response import Response

from billing.models import Payment
from billing.serializers import PaymentSerializer
from order_modul.models import Order, InstallmentPayment

stripe.api_key = settings.STRIPE_SECRET_KEY


class CreatePaymentIntent(APIView):

    def post(self, request):

        order_id = request.data.get("order_id")
        installment_id = request.data.get("installment_id")

        order = Order.objects.get(id=order_id)

        if installment_id:

            installment = InstallmentPayment.objects.get(id=installment_id)

            amount = installment.amount

        else:

            amount = order.payable_amount

        intent = stripe.PaymentIntent.create(

            amount=int(amount * 100),

            currency="usd",

            metadata={
                "order_id": order.id,
                "installment_id": installment_id
            }
        )

        return Response({
            "client_secret": intent.client_secret
        })

class PaymentListView(ListAPIView):

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            order__user = self.request.user
        ).order_by("-created_at")
