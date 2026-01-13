from django.contrib import admin
from order_modul.models import Order, OrderItem, InstallmentPlan, InstallmentPayment


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id','user','payment_status','status_choices','address','phone')
    list_filter = ('user','payment_status','status_choices')

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id','order','product')

@admin.register(InstallmentPlan)
class InstallmentPlanAdmin(admin.ModelAdmin):
    list_display = ('id','order','total_amount','months','monthly_amount')

@admin.register(InstallmentPayment)
class InstallmentPaymentAdmin(admin.ModelAdmin):
    list_display = ('id','installment','month')