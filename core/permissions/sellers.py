from rest_framework.permissions import BasePermission

class IsSeller(BasePermission):

    """
    Seller bo'lgan va bloklanmagan user
    """
    def has_permission(self, request, view):

        user = request.user
        return bool(
            request.user.is_authenticated
            and hasattr(user,'seller')
            and user.seller.is_active
            and not user.seller.is_blocked
        )

class IsSellerOwner(BasePermission):

    """
    Seller faqat o'z shopini boshqaradi
    """
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user