from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/logout/", views.logout, name="logout"),
    path("purchases/", views.purchases, name="purchases"),
    path("purchases/<str:product_id>/", views.purchase_detail, name="purchase-detail"),
]
