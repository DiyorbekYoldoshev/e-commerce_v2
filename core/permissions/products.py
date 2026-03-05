from rest_framework.permissions import BasePermission,SAFE_METHODS

class IsProductOwnerOrReadOnly(BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_staff or user.is_superuser:
            return True

        if hasattr(obj, "product") and hasattr(obj.product, "seller_id"):
            return obj.product.seller_id == user.id

        if hasattr(obj, "seller_id"):
            return obj.seller_id == user.id

        return False