# 1 - imports
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify

from.manager import ActiveManager
from .abstract import BaseModel


# 2 - class main
class Category(BaseModel):

    # 3 - choices
    TYPE_MAIN = "main"
    TYPE_SUB = "sub"
    
    TYPE_CHOICES = [
        (TYPE_MAIN,"Asosiy"),
        (TYPE_SUB,"Quyi bo'lim")
    ]
    # 4 - fields
    name = models.CharField(max_length=200, null=False, blank=False)
    type = models.CharField(max_length=13,choices=TYPE_CHOICES,default=TYPE_MAIN)
    slug = models.SlugField(unique=True,null=True,blank=True)
    is_active = models.BooleanField(default=True)


    # 4.1 - Relations (Foreign Key)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='children',
        null=True,
        blank=True
    )

    # 5 - manager
    objects = ActiveManager()
    all_objects = models.Manager()


    # 6 - Model validations (clean)
    def clean(self):
        if self.name and len(self.name) < 2:
            raise ValidationError("Kategoriya nomi 2 so'zdan kam bo'lmasligi kerak")

        if self.parent and self.parent == self:
            raise ValidationError("Kategoriya orders'zi orders'ziga parent bo'la olmaydi")

        if self.type == self.TYPE_MAIN and self.parent is not None:
            raise ValidationError("Asosiy kateroriya parent bo'la olmaydi")

        if self.type == self.TYPE_SUB and self.parent is None:
            raise ValidationError("Quyi kategoriya uchun parend talab qilinadi")

    # 7 - class meta
    class Meta:

        db_table = "category"
        verbose_name = "Kategoriya"
        verbose_name_plural = "Kategoriyalar"
        ordering = ['name']

        # constraints = [
        #     models.CheckConstraint(
        #         condition=(
        #                 models.Q(type="main", parent__isnull=True) |
        #                 models.Q(type="sub", parent__isnull=False)
        #         ),
        #         name="category_type_parent_rule"
        #     )
        # ]
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['slug'])
        ]

    # 8 - save
    def save(self, *args,**kwargs):
        if not self.slug:
            base = slugify(self.name) or "category"
            slug = base
            i = 1
            while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{i}"
                i += 1
            self.slug = slug
        super().save(*args,**kwargs)

    # 9 - ancestors
    def get_ancestors(self):

        ancestors = []
        node = self.parent
        while node:
            ancestors.insert(0,node)
            node = node.parent
        return ancestors

    # 10 - get_level
    def get_level(self):
        return len(self.get_ancestors())

    # 11 - full_path
    def full_path(self):
        if self.parent:
            return f"{self.parent.full_path()} -> {self.name}"
        return self.name

    # 12 - str_method
    def __str__(self):
        return self.full_path()

class Attribute(BaseModel):

    name = models.CharField(max_length=200,null=True,blank=True)
    categories = models.ManyToManyField(Category, related_name="attribute")

    def __str__(self):
        return self.name
