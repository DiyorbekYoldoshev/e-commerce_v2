from rest_framework.permissions import BasePermission

class IsOrderOwner(BasePermission):

    """
    Order faqat o'z egasiga ko'rinadi
    """

class CanManagerOrderStatus(BasePermission):

    """
    Order statusni faqat admin yoki seller o'zgartira oladi
    """

class CanEditOnlyPendingOrder(BasePermission):

    """
    order DELIVERED bo‘lsa — o‘zgartirib bo‘lmaydi
    CANCELLED bo‘lsa — delete yo‘q
    """