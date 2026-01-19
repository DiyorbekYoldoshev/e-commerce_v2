from rest_framework.permissions import BasePermission

class IsUserOwner(BasePermission):
        """
        User faqat o'z profilini ko'radi
        """
        def has_object_permission(self, request, view, obj):
                return obj == request.user