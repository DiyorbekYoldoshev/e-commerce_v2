app_name = 'category_modul'

from rest_framework.routers import DefaultRouter
from django.urls import include,path

from .views import CategoryViewSet, AttributeViewSet

router = DefaultRouter()
router.register(r'category',CategoryViewSet,basename='category')
router.register(r'attribute',AttributeViewSet,basename='attribute')

urlpatterns = [
    path("",include(router.urls))
]