# seller_modul/admin.py

from django.contrib import admin
from .models import Seller, SellerRequest
from .services import approve_request


@admin.register(SellerRequest)
class SellerRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'id', 'shop_name', 'status', 'created_at')
    list_filter = ('status',)
    actions = ['approve_requests']

    def approve_requests(self, request, queryset):
        for req in queryset.filter(status='pending'):
            approve_request(req)

    approve_requests.short_description = "Tanlangan arizalarni TASDIQLASH"


@admin.register(Seller)
class SellerAdmin(admin.ModelAdmin):
    list_display = ('shop_name', 'user', 'is_active', 'created_at')
    list_filter = ('is_active',)
