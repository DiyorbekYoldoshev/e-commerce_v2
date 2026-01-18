from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthenticatedAndActive(BasePermission):

    """
    Login qilgan va activ userlar
    """


class ReadyOnly(BasePermission):

    """Faqat o'qish uchun"""
