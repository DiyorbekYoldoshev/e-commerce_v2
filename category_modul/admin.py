from django.contrib import admin
from .models import Category,Attribute

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id','name','type','parent')
    list_filter = ('parent','name','type')

