from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/logout/", views.logout, name="logout"),
    path("purchases/", views.purchases, name="purchases"),
    path("purchases/<str:product_id>/", views.purchase_detail, name="purchase-detail"),
    path("ai/discover/", views.ai_discover, name="ai-discover"),
    path("ai/compare/", views.ai_compare, name="ai-compare"),
    path("ai/promotions/", views.ai_promotions, name="ai-promotions"),
]
