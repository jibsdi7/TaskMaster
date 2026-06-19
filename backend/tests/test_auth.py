"""
Authentication API tests
"""
import pytest
from fastapi import status


def test_register_user(client):
    """Test user registration"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "full_name": "New User",
            "password": "newpassword123",
            "role": "developer"
        }
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert "id" in data


def test_register_duplicate_user(client, test_user):
    """Test registration with duplicate email"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": test_user.email,
            "username": "anotheruser",
            "full_name": "Another User",
            "password": "password123",
            "role": "developer"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post(
        "/api/auth/login",
        data={
            "username": test_user.username,
            "password": "testpassword"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_credentials(client, test_user):
    """Test login with invalid credentials"""
    response = client.post(
        "/api/auth/login",
        data={
            "username": test_user.username,
            "password": "wrongpassword"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user(client, auth_headers):
    """Test getting current user info"""
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


def test_get_current_user_unauthorized(client):
    """Test getting current user without authentication"""
    response = client.get("/api/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

# Made with Bob
