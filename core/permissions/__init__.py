# core/permissions/__init__.py
from .base import IsAuthenticatedAndActive, ReadOnly
from .users import IsUserOwner,IsAdmin
from .sellers import IsSeller, IsSellerOwner
from .products import IsProductOwnerOrReadOnly
from .orders import IsOrderOwner

__all__ = [
    'IsAuthenticatedAndActive',
    'ReadOnly',
    'IsUserOwner',
    'IsSeller',
    'IsSellerOwner',
    'IsProductOwnerOrReadOnly',
    'IsOrderOwner',
    'IsAdmin'
]
