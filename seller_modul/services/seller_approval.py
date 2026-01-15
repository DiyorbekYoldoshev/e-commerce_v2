from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from ..models import Seller, SellerRequest

@transaction.atomic
def approve_request(request_obj: SellerRequest) -> Seller:
    if request_obj.status != SellerRequest.STATUS_PENDING:
        raise ValidationError("Bu ariza allaqachon ko‘rib chiqilgan")

    seller = Seller.objects.create_seller(
        user=request_obj.user,
        shop_name=request_obj.shop_name,
        phone_number=request_obj.phone_number,
        address=request_obj.address,
        description=request_obj.description,
        is_active=True,
        is_verified=True
    )

    request_obj.status = SellerRequest.STATUS_APPROVED
    request_obj.reviewed_at = timezone.now()
    request_obj.save(update_fields=['status', 'reviewed_at'])

    return seller
