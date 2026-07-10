import sys
from fastapi.testclient import TestClient

try:
    from app.main import app
    from app.database import get_db, Base, engine
    from app.models import User
except ImportError as e:
    print(f"Error importing app: {e}")
    sys.exit(1)

client = TestClient(app)

def test_login_success():
    print("Testing admin login with correct credentials...")
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "adminpassword"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "access_token" in data, "Token should be present in response"
    assert data["token_type"] == "bearer", f"Expected token_type to be 'bearer', got {data['token_type']}"
    token = data["access_token"]
    print("Admin login successful! Access token obtained.")
    
    # Test /api/auth/me
    print("Testing /api/auth/me with token...")
    headers = {"Authorization": f"Bearer {token}"}
    response_me = client.get("/api/auth/me", headers=headers)
    assert response_me.status_code == 200, f"Expected 200, got {response_me.status_code}"
    data_me = response_me.json()
    assert data_me["username"] == "admin", f"Expected username 'admin', got {data_me['username']}"
    print("/api/auth/me returns current user profile correctly!")

def test_login_fail():
    print("Testing admin login with incorrect credentials...")
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "wrongpassword"}
    )
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    print("Incorrect credentials handled correctly (401 Unauthorized).")

def test_register_and_login():
    print("Testing user registration...")
    # Use a unique username to avoid conflicts across test runs
    import time
    username = f"user_{int(time.time())}"
    password = "custompassword123"

    # Register
    response = client.post(
        "/api/auth/register",
        json={"username": username, "password": password}
    )
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    user = response.json()
    assert user["username"] == username
    print(f"Registered new user '{username}' successfully.")

    # Check database model contains 64-char hex SHA-256 hash (not bcrypt)
    db = next(get_db())
    db_user = db.query(User).filter(User.username == username).first()
    assert db_user is not None
    assert len(db_user.password_hash) == 64, f"Expected hash length of 64 characters for SHA-256, got {len(db_user.password_hash)}"
    print("Confirmed password hash is a 64-character SHA-256 hex string.")
    db.close()

    # Login as new user
    print("Testing login with new user credentials...")
    login_response = client.post(
        "/api/auth/login",
        data={"username": username, "password": password}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Authenticate /api/auth/me
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["username"] == username
    print("Login with new custom user and token authentication succeeded.")

    # Test duplicate registration
    print("Testing duplicate user registration...")
    dup_response = client.post(
        "/api/auth/register",
        json={"username": username, "password": "otherpassword"}
    )
    assert dup_response.status_code == 400
    assert dup_response.json()["detail"] == "Username is already taken"
    print("Duplicate username prevention handled correctly.")

if __name__ == "__main__":
    try:
        test_login_success()
        test_login_fail()
        test_register_and_login()
        print("ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
