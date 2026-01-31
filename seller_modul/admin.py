from django.contrib import admin
from .models import Seller, SellerRequest
from .services import approve_request
from simple_history.admin import SimpleHistoryAdmin


@admin.register(SellerRequest)
class SellerRequestAdmin(SimpleHistoryAdmin):
    # Asosiy ro'yxatda ko'rinadigan ustunlar
    list_display = ('user', 'id', 'shop_name', 'status', 'created_at')
    list_filter = ('status',)

    # Tarixda (History sahifasida) ko'rinadigan ustunlar
    history_list_display = ["status"]

    # Custom Admin Action
    actions = ['approve_requests_action']

    def approve_requests_action(self, request, queryset):
        count = 0
        for req in queryset.filter(status='pending'):
            approve_request(req)
            count += 1
        self.message_user(request, f"{count} ta ariza muvaffaqiyatli tasdiqlandi.")

    approve_requests_action.short_description = "Tanlangan arizalarni TASDIQLASH"


@admin.register(Seller)
class SellerAdmin(SimpleHistoryAdmin):
    # Asosiy ro'yxatda ko'rinadigan ustunlar
    list_display = ('shop_name', 'user', 'is_active', 'created_at')
    list_filter = ('is_active', 'is_blocked')

    # Tarixda ko'rinadigan ustunlar
    history_list_display = ["is_active", "is_blocked"]

    # Qidiruv maydonlari
    search_fields = ('shop_name', 'user__email')
