from django.contrib import admin
from .models import Category, Attribute


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "type", "parent", "is_active")
    list_filter = ("type", "is_active", "parent")
    search_fields = ("name", "slug")


@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    list_filter = ("name",)
    search_fields = ("name",)
    filter_horizontal = ("categories",)