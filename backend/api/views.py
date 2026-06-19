from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Purchase


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    if not username or not password:
        return Response({"error": "Username and password are required."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"error": "That username is already taken."}, status=400)
    try:
        validate_password(password, User(username=username))
    except ValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)
    user = User.objects.create_user(username=username, password=password)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username}, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    user = authenticate(username=username, password=password)
    if user is None:
        return Response({"error": "Invalid username or password."}, status=400)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=204)


def _product_ids(user):
    return list(user.purchases.values_list("product_id", flat=True))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def purchases(request):
    if request.method == "POST":
        product_id = (request.data.get("product_id") or "").strip()
        if not product_id:
            return Response({"error": "product_id is required."}, status=400)
        Purchase.objects.get_or_create(user=request.user, product_id=product_id)
    return Response({"product_ids": _product_ids(request.user)})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def purchase_detail(request, product_id):
    Purchase.objects.filter(user=request.user, product_id=product_id).delete()
    return Response({"product_ids": _product_ids(request.user)})
