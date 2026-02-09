app_name = 'category_modul'

from rest_framework.routers import DefaultRouter
from django.urls import include,path

from .views import CategoryViewSet

router = DefaultRouter()
router.register(r'category',CategoryViewSet,basename='category')

urlpatterns = [
    path("",include(router.urls))
]