import stripe
from django.conf import settings

from rest_framework.decorators import api_view
from rest_framework.response import Response

from billing.models import Payment
from order_modul.models import Order, InstallmentPayment

stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(["POST"])
def stripe_webhook(request):

    payload = request.body

    event = stripe.Event.construct_from(
        request.data,
        stripe.api_key
    )

    if event["type"] == "payment_intent.succeeded":

        intent = event["data"]["object"]

        order_id = intent["metadata"]["order_id"]
        installment_id = intent["metadata"].get("installment_id")

        order = Order.objects.get(id=order_id)

        Payment.objects.create(

            order=order,

            stripe_payment_intent=intent["id"],

            amount=intent["amount"] / 100,

            status="succeeded"
        )

        if installment_id:

            installment = InstallmentPayment.objects.get(id=installment_id)

            installment.mark_paid()

        else:

            order.payment_status = "paid"
            order.save()

    return Response({"status": "ok"})