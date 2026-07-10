import sys
import time
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

try:
    from app.main import app
    from app.database import Base, get_db
    from app.models import DnsRecord, HostedZone, User
    from app.auth import get_password_hash
except ImportError as e:
    print(f"Error importing app: {e}")
    sys.exit(1)

# Configure isolated test database
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Recreate tables fresh on test database
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Dependency override
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_zones_crud_and_isolation():
    # Seed admin user in test database
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(username="admin", password_hash=get_password_hash("adminpassword"), aws_account_id="123456789012")
        db.add(admin)
        db.commit()
    db.close()

    # Setup usernames
    ts = int(time.time())
    username_a = f"usera_{ts}"
    username_b = f"userb_{ts}"
    password = "testpassword123"

    print("Registering User A and User B...")
    # Register A
    reg_a = client.post("/api/auth/register", json={"username": username_a, "password": password})
    assert reg_a.status_code == 201
    
    # Register B
    reg_b = client.post("/api/auth/register", json={"username": username_b, "password": password})
    assert reg_b.status_code == 201

    # Login User A
    print("Logging in as User A...")
    login_a = client.post("/api/auth/login", data={"username": username_a, "password": password})
    assert login_a.status_code == 200
    token_a = login_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Login User B
    print("Logging in as User B...")
    login_b = client.post("/api/auth/login", data={"username": username_b, "password": password})
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A creates a hosted zone
    print("User A creating hosted zone 'usera-zone.com'...")
    zone_data_a = {
        "name": "usera-zone.com",
        "type": "Public",
        "description": "Zone for User A",
        "comment": "Owner User A"
    }
    response_a = client.post("/api/zones", json=zone_data_a, headers=headers_a)
    if response_a.status_code != 201:
        print(f"Error creating zone: {response_a.status_code} - {response_a.text}")
    assert response_a.status_code == 201
    zone_a = response_a.json()
    zone_a_id = zone_a["id"]
    print(f"User A zone created: {zone_a_id}")

    # 2. Verify User A lists their zone
    print("Verifying User A listings...")
    list_a = client.get("/api/zones", headers=headers_a).json()
    assert len(list_a) == 1
    assert list_a[0]["id"] == zone_a_id

    # 3. Verify User B lists nothing (Isolate dashboard check)
    print("Verifying User B listings (expecting empty different dashboard)...")
    list_b = client.get("/api/zones", headers=headers_b).json()
    assert len(list_b) == 0, f"User B saw User A's zone! Found {len(list_b)} items"
    print("User B dashboard is isolated successfully.")

    # 4. Verify User B cannot access User A's zone directly
    print("Verifying User B cannot fetch User A's zone ID...")
    get_b_fail = client.get(f"/api/zones/{zone_a_id}", headers=headers_b)
    assert get_b_fail.status_code == 404
    
    print("Verifying User B cannot update User A's zone...")
    put_b_fail = client.put(f"/api/zones/{zone_a_id}", json=zone_data_a, headers=headers_b)
    assert put_b_fail.status_code == 404
    
    print("Verifying User B cannot delete User A's zone...")
    del_b_fail = client.delete(f"/api/zones/{zone_a_id}", headers=headers_b)
    assert del_b_fail.status_code == 404
    print("User B restricted from accessing User A's zone details.")

    # 5. User B creates their own zone
    print("User B creating hosted zone 'userb-zone.com'...")
    zone_data_b = {
        "name": "userb-zone.com",
        "type": "Public",
        "description": "Zone for User B"
    }
    response_b = client.post("/api/zones", json=zone_data_b, headers=headers_b)
    assert response_b.status_code == 201
    zone_b = response_b.json()
    zone_b_id = zone_b["id"]

    # Verify listings match ownership
    list_a_after = client.get("/api/zones", headers=headers_a).json()
    assert len(list_a_after) == 1
    assert list_a_after[0]["id"] == zone_a_id

    list_b_after = client.get("/api/zones", headers=headers_b).json()
    assert len(list_b_after) == 1
    assert list_b_after[0]["id"] == zone_b_id
    print("Both users successfully see only their respective zones.")

    # 6. User A deletes their zone, verify cascade and list
    print("User A deleting their zone...")
    del_a = client.delete(f"/api/zones/{zone_a_id}", headers=headers_a)
    assert del_a.status_code == 204
    
    list_a_final = client.get("/api/zones", headers=headers_a).json()
    assert len(list_a_final) == 0
    print("User A zone deleted, list is empty.")

if __name__ == "__main__":
    try:
        test_zones_crud_and_isolation()
        print("ALL MULTI-TENANT ISOLATION TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"Assertion failed: {e}")
        sys.exit(1)
