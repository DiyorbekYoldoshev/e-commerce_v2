from django.contrib import admin
from product_modul.models import Product,ProductVariant,VariantAttributeValue


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id','name','status','category','seller','description')
    list_filter = ('status','seller')

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('id','product','sku')

@admin.register(VariantAttributeValue)
class VariantAttributeValueAdmin(admin.ModelAdmin):
    list_display = ('variant','attribute','value')