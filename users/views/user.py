# users/views/user.py
from django.db.models import Exists, OuterRef
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ReadOnlyModelViewSet

from core.permissions import IsAdmin
from seller_modul.models import Seller
from users.models import User, Profile

from users.serializers import (
    UserSerializer,
    UserRegisterSerializer,
    LoginSerializer,
)
from users.serializers import UserUpdateSerializer
from users.serializers.password import PasswordChangeSerializer
from users.serializers.profile import ProfileSerializer

from users.services.auth import authenticate_user, register_user


class UserViewSet(GenericViewSet):


    queryset = User.objects.all()
    serializer_class = UserSerializer  # default

    def get_permissions(self):
        if self.action in ("register", "login"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "register":
            return UserRegisterSerializer
        if self.action == "login":
            return LoginSerializer
        if self.action in ("update_me",):
            return UserUpdateSerializer
        if self.action in ("profile", "update_profile"):
            return ProfileSerializer
        if self.action == "change_password":
            return PasswordChangeSerializer
        return UserSerializer

    # ---------- AUTH ----------
    @action(detail=False, methods=["post"], url_path="auth/register")
    def register(self, request):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data.copy()
        data.pop("password_confirm", None)

        user = register_user(**data)
        return Response(
            UserSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["post"], url_path="auth/login")
    def login(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate_user(**serializer.validated_data)

        return Response(
            {"user": UserSerializer(user, context={"request": request}).data},
            status=status.HTTP_200_OK
        )

    # ---------- ME ----------
    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        return Response(
            UserSerializer(request.user, context={"request": request}).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["patch"], url_path="me/update")
    def update_me(self, request):
        serializer = self.get_serializer(
            instance=request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user, context={"request": request}).data,
            status=status.HTTP_200_OK
        )

    # ---------- PROFILE ----------
    @action(detail=False, methods=["get"], url_path="profile")
    def profile(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(
            ProfileSerializer(profile, context={"request": request}).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=["patch", "put"], url_path="profile/update")
    def update_profile(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(
            instance=profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    # ---------- PASSWORD ----------
    @action(detail=False, methods=["post"], url_path="auth/password/change")
    def change_password(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        if not user.check_password(old_password):
            return Response(
                {"old_password": "Eski parol noto'g'ri"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"message": "Parol muvaffaqiyatli o‘zgartirildi"}, status=status.HTTP_200_OK)


class AdminUserViewSet(ReadOnlyModelViewSet):

    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = User.objects.all_with_deleted()
        if self.action == "list":
            return qs.filter(is_deleted=False)
        return qs

    @action(methods=["get"], detail=False, url_path="active")
    def active(self, request):
        qs = self.get_queryset().filter(is_deleted=False, is_active=True)
        return Response(self.get_serializer(qs, many=True, context={"request": request}).data)

    @action(methods=["get"], detail=False, url_path="blocked")
    def blocked(self, request):
        qs = self.get_queryset().filter(is_deleted=False, is_active=False)
        return Response(self.get_serializer(qs, many=True, context={"request": request}).data)

    @action(methods=["get"], detail=False, url_path="deleted")
    def deleted(self, request):
        qs = self.get_queryset().filter(is_deleted=True)
        return Response(self.get_serializer(qs, many=True, context={"request": request}).data)

    @action(methods=["get"], detail=False, url_path="all")
    def all_users(self, request):
        qs = self.get_queryset()
        return Response(self.get_serializer(qs, many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="sellers")
    def sellers(self, request):
        qs = self.get_queryset().annotate(
            has_seller=Exists(Seller.objects.filter(user_id=OuterRef("pk")))
        ).filter(has_seller=True, is_deleted=False)
        return Response(self.get_serializer(qs, many=True, context={"request": request}).data)