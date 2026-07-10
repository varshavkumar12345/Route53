import os
import sys

# Ensure backend root is on path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine

client = TestClient(app)

def test_bulk_delete():
    # Setup clean db schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 1. Register User
    reg_res = client.post("/api/auth/register", json={
        "username": "bulker",
        "password": "bulkpassword"
    })
    assert reg_res.status_code == 201, reg_res.text
    
    # 2. Login User
    login_res = client.post("/api/auth/login", data={
        "username": "bulker",
        "password": "bulkpassword"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Hosted Zone
    zone_res = client.post("/api/zones", json={
        "name": "bulkme.com.",
        "type": "Public",
        "comment": "Testing Bulker",
        "description": "Testing Bulker"
    }, headers=headers)
    assert zone_res.status_code == 201
    zone_id = zone_res.json()["id"]
    
    # 4. Insert 3 custom records
    rec1 = client.post(f"/api/zones/{zone_id}/records", json={
        "name": "a.bulkme.com.",
        "type": "A",
        "ttl": 300,
        "value": "1.1.1.1",
        "routing_policy": "Simple"
    }, headers=headers)
    assert rec1.status_code == 201
    id1 = rec1.json()["id"]
    
    rec2 = client.post(f"/api/zones/{zone_id}/records", json={
        "name": "b.bulkme.com.",
        "type": "A",
        "ttl": 300,
        "value": "2.2.2.2",
        "routing_policy": "Simple"
    }, headers=headers)
    assert rec2.status_code == 201
    id2 = rec2.json()["id"]
    
    rec3 = client.post(f"/api/zones/{zone_id}/records", json={
        "name": "c.bulkme.com.",
        "type": "A",
        "ttl": 300,
        "value": "3.3.3.3",
        "routing_policy": "Simple"
    }, headers=headers)
    assert rec3.status_code == 201
    id3 = rec3.json()["id"]
    
    # Check that zone record count is 5 (SOA + NS + 3 custom)
    zone_chk = client.get(f"/api/zones/{zone_id}", headers=headers)
    assert zone_chk.json()["record_count"] == 5
    
    # 5. Bulk Delete 2 of them (a and b)
    bulk_res = client.post(f"/api/zones/{zone_id}/records/bulk-delete", json={
        "record_ids": [id1, id2]
    }, headers=headers)
    assert bulk_res.status_code == 200, bulk_res.text
    assert bulk_res.json()["deleted_count"] == 2
    
    # Check zone record count decremented to 3
    zone_chk = client.get(f"/api/zones/{zone_id}", headers=headers)
    assert zone_chk.json()["record_count"] == 3
    
    # 6. Try to bulk delete with a system record ID
    # First, let's fetch system record IDs
    recs_res = client.get(f"/api/zones/{zone_id}/records", headers=headers)
    soa_id = next(r["id"] for r in recs_res.json() if r["type"] == "SOA")
    
    bad_bulk = client.post(f"/api/zones/{zone_id}/records/bulk-delete", json={
        "record_ids": [id3, soa_id]
    }, headers=headers)
    assert bad_bulk.status_code == 400
    assert "Default system records" in bad_bulk.json()["detail"]
    
    print("ALL BULK DELETE UNIT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_bulk_delete()
