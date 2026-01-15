# services/seller_service.py
from django.utils import timezone
from seller_modul.models import Seller, SellerRequest


def approve_seller_request(request_obj: SellerRequest):
    Seller.objects.create_seller(
        user=request_obj.user,
        shop_name=request_obj.shop_name,
        phone=request_obj.phone_number,
        address=request_obj.address,
        description=request_obj.description,
    )

    request_obj.status = SellerRequest.STATUS_APPROVED
    request_obj.reviewed_at = timezone.now()
    request_obj.save()
