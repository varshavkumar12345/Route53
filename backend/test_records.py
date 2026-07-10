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
TEST_DATABASE_URL = "sqlite:///./test_records.db"
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

def test_records_crud():
    # Seed admin user in test database
    db = TestingSessionLocal()
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(username="admin", password_hash=get_password_hash("adminpassword"), aws_account_id="123456789012")
        db.add(admin)
        db.commit()
    db.close()

    # Login User
    login = client.post("/api/auth/login", data={"username": "admin", "password": "adminpassword"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a zone
    zone_res = client.post("/api/zones", json={"name": "testzone.net", "type": "Public"}, headers=headers)
    assert zone_res.status_code == 201
    zone = zone_res.json()
    zone_id = zone["id"]
    assert zone["record_count"] == 2

    # 2. Get records - verify default NS and SOA exist
    records_res = client.get(f"/api/zones/{zone_id}/records", headers=headers)
    assert records_res.status_code == 200
    records = records_res.json()
    assert len(records) == 2
    types = {r["type"] for r in records}
    assert "NS" in types
    assert "SOA" in types
    
    # Identify record IDs
    ns_record = next(r for r in records if r["type"] == "NS")
    soa_record = next(r for r in records if r["type"] == "SOA")

    # 3. Create valid A record
    print("Testing create valid A record...")
    a_res = client.post(
        f"/api/zones/{zone_id}/records",
        json={"name": "www", "type": "A", "ttl": 300, "value": "1.2.3.4\n5.6.7.8"},
        headers=headers
    )
    assert a_res.status_code == 201
    a_rec = a_res.json()
    assert a_rec["name"] == "www.testzone.net."
    assert a_rec["value"] == "1.2.3.4\n5.6.7.8"

    # Confirm record count incremented
    zone_check = client.get(f"/api/zones/{zone_id}", headers=headers).json()
    assert zone_check["record_count"] == 3

    # 4. Create invalid A record
    print("Testing create invalid A record...")
    a_invalid = client.post(
        f"/api/zones/{zone_id}/records",
        json={"name": "mail", "type": "A", "ttl": 300, "value": "999.0.0.1"},
        headers=headers
    )
    assert a_invalid.status_code == 400
    assert "Invalid IPv4 address" in a_invalid.json()["detail"]

    # 5. Create CNAME record
    print("Testing CNAME constraints...")
    cname_res = client.post(
        f"/api/zones/{zone_id}/records",
        json={"name": "web", "type": "CNAME", "ttl": 60, "value": "www.testzone.net."},
        headers=headers
    )
    assert cname_res.status_code == 201

    # Multiple CNAME values should fail
    cname_invalid = client.post(
        f"/api/zones/{zone_id}/records",
        json={"name": "ftp", "type": "CNAME", "ttl": 60, "value": "a.domain.com.\nb.domain.com."},
        headers=headers
    )
    assert cname_invalid.status_code == 400

    # 6. Edit a record
    print("Testing edit custom record...")
    a_id = a_rec["id"]
    edit_res = client.put(
        f"/api/zones/{zone_id}/records/{a_id}",
        json={"name": "www", "type": "A", "ttl": 600, "value": "10.0.0.1"},
        headers=headers
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["ttl"] == 600
    assert edit_res.json()["value"] == "10.0.0.1"

    # 7. Restrict delete on default records
    print("Testing delete block on SOA/NS...")
    del_ns_fail = client.delete(f"/api/zones/{zone_id}/records/{ns_record['id']}", headers=headers)
    assert del_ns_fail.status_code == 400
    assert "Default system records" in del_ns_fail.json()["detail"]

    # 8. Delete custom record
    print("Testing delete custom record...")
    del_res = client.delete(f"/api/zones/{zone_id}/records/{a_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify count decremented
    zone_check_2 = client.get(f"/api/zones/{zone_id}", headers=headers).json()
    assert zone_check_2["record_count"] == 3 # Default NS, SOA, and CNAME (web) remain

if __name__ == "__main__":
    try:
        test_records_crud()
        print("ALL DNS RECORDS CRUD TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"Assertion failed: {e}")
        sys.exit(1)
