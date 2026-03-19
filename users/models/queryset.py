from django.db.models import Q,QuerySet

class UserQuerySet(QuerySet):

    def active(self):
        return self.filter(is_active=True, is_deleted=False)

    def staff(self):
        return self.filter(is_staff=True, is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)

    def blocked(self):
        return self.filter(is_deleted=False,is_blocked=False)

    def all_with_deleted(self):
        return self

    def search(self, text):
        return self.filter(
            Q(email__icontains=text) |
            Q(first_name__icontains=text) |
            Q(last_name__icontains=text)
        )
