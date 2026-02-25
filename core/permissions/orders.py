from rest_framework.permissions import BasePermission

class IsOrderOwner(BasePermission):

    """
    Order faqat o'z egasiga ko'rinadi
    """
    def has_object_permission(self, request, view, obj):
        return obj == request.user

class CanManagerOrderStatus(BasePermission):

    """
    Order statusni faqat admin yoki seller o'zgartira oladi
    """
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated(
            request.user.is_staff or
            hasattr(request.user, 'seller'),
        ))

class CanEditOnlyPendingOrder(BasePermission):

    """
    order DELIVERED bo‘lsa — o‘zgartirib bo‘lmaydi
    CANCELLED bo‘lsa — delete yo‘q
    """
    def has_object_permission(self, request, view, obj):
        return obj.status_choices == 'pending'