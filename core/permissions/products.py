from rest_framework.permissions import BasePermission,SAFE_METHODS

class IsProductOwnerOrReadOnly(BasePermission):

    """
    O'qish hammaga
    O'zgartirish faqat seller
    """
    def has_object_permission(self, request, view, obj):
        if request.method == SAFE_METHODS:
            return True
        return obj.seller.user == request.user