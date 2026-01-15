from django.db import models
from django.db.models import Q


class SellerQuerySet(models.QuerySet):
    """
    Seller bilan ishlash uchun maxsus QuerySet.
    Barcha murakkab filterlar shu yerda bo‘ladi.
    """

    def active(self):
        """
        Aktiv va bloklanmagan sellerlar
        """
        return self.filter(is_active=True, is_blocked=False)

    def inactive(self):
        """
        Aktiv bo‘lmagan sellerlar
        """
        return self.filter(is_active=False)

    def blocked(self):
        """
        Bloklangan sellerlar
        """
        return self.filter(is_blocked=True)

    def verified(self):
        """
        Admin tomonidan tasdiqlangan sellerlar
        """
        return self.filter(is_verified=True)

    def unverified(self):
        """
        Tasdiqlanmagan sellerlar
        """
        return self.filter(is_verified=False)

    def search(self, text: str):
        """
        Do‘kon nomi, tavsif yoki user email orqali qidirish
        """
        if not text:
            return self

        return self.filter(
            Q(shop_name__icontains=text) |
            Q(description__icontains=text) |
            Q(user__email__icontains=text)
        )


class SellerManager(models.Manager.from_queryset(SellerQuerySet)):
    """
    Seller uchun maxsus Manager.
    QuerySet metodlari avtomatik ulanadi.
    """

    def create_seller(
        self,
        *,
        user,
        shop_name: str,
        phone_number: str,
        address: str,
        description: str = "",
        is_verified: bool = True,
        is_active: bool = True,
        **extra_fields
    ):
        """
        Faqat admin / service orqali seller yaratish uchun.

        Oddiy user bu metodni chaqirmaydi.
        """

        if not user:
            raise ValueError("Seller uchun user majburiy")

        if not shop_name:
            raise ValueError("Shop nomi majburiy")

        seller = self.model(
            user=user,
            shop_name=shop_name,
            phone_number=phone_number,
            address=address,
            description=description,
            is_verified=is_verified,
            is_active=is_active,
            **extra_fields
        )

        seller.full_clean()  # model validation
        seller.save(using=self._db)
        return seller
