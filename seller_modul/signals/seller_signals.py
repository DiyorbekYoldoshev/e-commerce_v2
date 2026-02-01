from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings

from ..models.seller import SellerRequest, Seller
from ..services import seller_approval


@receiver(post_save, sender=SellerRequest)
def on_seller_request_created(sender, instance: SellerRequest, created, **kwargs):

    if not created:
        return

    if instance.status != SellerRequest.STATUS_PENDING:
        return

    admins = [a[1] for a in settings.ADMINS] if hasattr(settings, 'ADMINS') else []
    subject = f"Yangi seller arizasi: {instance.shop_name}"
    message = f"Foydalanuvchi {instance.user.email} yangi seller arizasi yubordi. ID: {instance.id}\n\nShop: {instance.shop_name}\nDescription: {instance.description}\nPhone: {instance.phone_number}\nAddress: {instance.address}\n"

    if admins:
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, admins)
        except Exception:
            # don't raise from signal, just log in real projects
            pass


@receiver(post_save, sender=Seller)
def on_seller_created(sender, instance: Seller, created, **kwargs):
    if not created:
        return

    try:
        send_mail(
            "Sizning seller arizangiz tasdiqlandi",
            f"Tabriklaymiz! Do'koningiz {instance.shop_name} tasdiqlandi.",
            settings.DEFAULT_FROM_EMAIL,
            [instance.user.email],
        )
    except Exception:
        pass
