import logging

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from billing.models import Payment
from order_modul.models import Order, InstallmentPayment

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Stripe webhook endpoint.
    FIX #1: Stripe signature tekshiruvi bilan xavfsiz.
    FIX #9: Duplicate to'lovlarni oldini oladi (get_or_create).
    FIX #12: failed va canceled eventlarni ham handle qiladi.
    """
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    if not sig_header:
        logger.warning("Stripe webhook: signature header yo'q")
        return HttpResponse(status=400)

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET  # settings.py ga qo'shish kerak
        )
    except ValueError:
        logger.error("Stripe webhook: payload noto'g'ri")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        logger.error("Stripe webhook: signature noto'g'ri")
        return HttpResponse(status=400)

    event_type = event["type"]
    intent = event["data"]["object"]

    # ---- payment_intent.succeeded ----
    if event_type == "payment_intent.succeeded":
        _handle_payment_succeeded(intent)

    # ---- payment_intent.payment_failed ----
    elif event_type == "payment_intent.payment_failed":
        _handle_payment_failed(intent)

    # ---- payment_intent.canceled ----
    elif event_type == "payment_intent.canceled":
        _handle_payment_canceled(intent)

    return HttpResponse(status=200)


def _handle_payment_succeeded(intent):
    """To'lov muvaffaqiyatli bo'lganda"""
    order_id = intent["metadata"].get("order_id")
    installment_id = intent["metadata"].get("installment_id")  # None yoki str

    if not order_id:
        logger.error(f"Webhook: order_id metadata'da topilmadi. Intent: {intent['id']}")
        return

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        logger.error(f"Webhook: Order {order_id} topilmadi")
        return

    # FIX #9: Duplicate webhook uchun get_or_create
    payment, created = Payment.objects.get_or_create(
        stripe_payment_intent=intent["id"],
        defaults={
            "order": order,
            "amount": intent["amount"] / 100,
            "currency": intent.get("currency", "usd"),
            "status": "succeeded",
            "installment_payment_id": installment_id if installment_id else None,
        }
    )

    if not created:
        # Allaqachon mavjud — duplicate webhook, skip
        logger.info(f"Duplicate webhook for intent {intent['id']}, skipping")
        return

    # FIX #5: installment_id faqat metadata'da mavjud bo'lganda
    if installment_id:
        try:
            installment = InstallmentPayment.objects.get(id=installment_id)
            installment.mark_paid()

            # Barcha oyliklar to'langanligi tekshiruvi
            plan = installment.installment
            all_paid = not plan.payments.filter(is_paid=False).exists()
            if all_paid:
                order.payment_status = "paid"
                order.save(update_fields=["payment_status"])
                logger.info(f"Order {order.id}: barcha nasiya to'lovlari to'landi")

        except InstallmentPayment.DoesNotExist:
            logger.error(f"InstallmentPayment {installment_id} topilmadi")
    else:
        # To'liq to'lov
        order.payment_status = "paid"
        order.save(update_fields=["payment_status"])
        logger.info(f"Order {order.id}: to'liq to'lov amalga oshirildi")


def _handle_payment_failed(intent):
    """To'lov muvaffaqiyatsiz bo'lganda"""
    Payment.objects.update_or_create(
        stripe_payment_intent=intent["id"],
        defaults={
            "status": "failed",
            "amount": intent["amount"] / 100,
        }
    )
    logger.warning(f"Payment failed for intent {intent['id']}")


def _handle_payment_canceled(intent):
    """To'lov bekor qilinganda"""
    Payment.objects.update_or_create(
        stripe_payment_intent=intent["id"],
        defaults={
            "status": "canceled",
            "amount": intent["amount"] / 100,
        }
    )
    logger.info(f"Payment canceled for intent {intent['id']}")
