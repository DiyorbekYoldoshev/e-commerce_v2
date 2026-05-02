import logging
import stripe
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone

from billing.models import Payment
from order_modul.models import Order, InstallmentPayment

logger = logging.getLogger(__name__)
stripe.api_key = settings.STRIPE_SECRET_KEY


@csrf_exempt
@require_POST
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
    if not webhook_secret:
        logger.error("❌ STRIPE_WEBHOOK_SECRET not configured!")
        return HttpResponse(status=500)
    if not sig_header:
        return HttpResponse(status=400)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error(f"❌ Webhook verify error: {e}")
        return HttpResponse(status=400)

    et = event["type"]
    obj = event["data"]["object"]

    if et == "payment_intent.succeeded":
        handle_payment_success(obj)
    elif et in ("payment_intent.payment_failed", "payment_intent.canceled"):
        handle_payment_failed(obj, et)
    else:
        logger.info(f"ℹ️ Ignoring event: {et}")

    return HttpResponse(status=200)


def handle_payment_success(intent):
    """Stripe to'lov muvaffaqiyatli bo'lganda — IDEMPOTENT."""
    pi_id = intent["id"]
    metadata = intent.get("metadata", {}) or {}
    order_id = metadata.get("order_id")
    installment_id = metadata.get("installment_id") or None

    if not order_id:
        logger.error("❌ No order_id in metadata")
        return

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        logger.error(f"❌ Order {order_id} not found")
        return

    with transaction.atomic():
        try:
            payment = Payment.objects.select_for_update().get(stripe_payment_intent=pi_id)
        except Payment.DoesNotExist:
            payment = Payment(
                order=order,
                stripe_payment_intent=pi_id,
                amount=0,
                currency="uzs",
                stripe_currency=intent.get("currency", "usd"),
                stripe_amount_cents=intent.get("amount", 0),
                status="pending",
                installment_payment_id=installment_id,
            )

        # Idempotency
        if payment.status == "succeeded":
            logger.info(f"⏩ Payment {pi_id} already succeeded, skip")
            return

        payment.status = "succeeded"
        payment.stripe_amount_cents = intent.get("amount", payment.stripe_amount_cents)
        payment.stripe_currency = intent.get("currency", payment.stripe_currency)
        payment.save()

        if installment_id:
            try:
                installment = InstallmentPayment.objects.select_for_update().get(id=installment_id)
                if not installment.is_paid:
                    installment.is_paid = True
                    installment.paid_at = timezone.now()
                    installment.save(update_fields=["is_paid", "paid_at"])

                plan = installment.installment
                all_paid = not plan.payments.filter(is_paid=False).exists()
                if all_paid and order.payment_status != "paid":
                    order.payment_status = "paid"
                    order.save(update_fields=["payment_status"])
            except InstallmentPayment.DoesNotExist:
                logger.error(f"❌ InstallmentPayment {installment_id} not found")
        else:
            if order.payment_status != "paid":
                order.payment_status = "paid"
                order.save(update_fields=["payment_status"])

    logger.info(f"✅ Payment {pi_id} succeeded for order {order_id}")


def handle_payment_failed(intent, event_type):
    pi_id = intent["id"]
    new_status = "failed" if event_type.endswith("failed") else "canceled"
    Payment.objects.filter(stripe_payment_intent=pi_id).update(status=new_status)
    logger.warning(f"⚠️ Payment {pi_id} -> {new_status}")
