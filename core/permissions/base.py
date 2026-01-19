from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthenticatedAndActive(BasePermission):

    """
    Login qilgan va activ userlar
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )

class ReadyOnly(BasePermission):

    """Faqat o'qish uchun"""
    def has_permission(self, request, view):
        return request.method == SAFE_METHODS