from rest_framework.permissions import BasePermission

class IsUserOwner(BasePermission):
        """
        User faqat o'z profilini ko'radi
        """
        def has_object_permission(self, request, view, obj):
                return obj == request.user

class IsAdmin(BasePermission):
        """
        Faqat admin uchun
        """
        def has_permission(self, request, view):
                user = request.user
                return bool(
                     user.is_active and
                     user.is_staff and
                     user.is_superuser
                )