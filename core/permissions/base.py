# permissions/base.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthenticatedAndActive(BasePermission):
    """
    Login qilgan va aktiv userlar uchun
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and not request.user.is_deleted  # qo'shimcha tekshiruv
        )


class ReadOnly(BasePermission):
    """
    Faqat o'qish (GET, HEAD, OPTIONS) uchun
    """

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """
    O'qish hammaga, tahrirlash faqat egasiga
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        # obj.user bor bo'lsa
        if hasattr(obj, 'user'):
            return obj.user == request.user

        return False
