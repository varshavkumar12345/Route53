import os
import sys

# Ensure backend root is on path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine

client = TestClient(app)

def test_bind_export():
    # Setup clean db schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 1. Register User
    reg_res = client.post("/api/auth/register", json={
        "username": "exporter",
        "password": "exportpassword"
    })
    assert reg_res.status_code == 201, reg_res.text
    
    # 2. Login User
    login_res = client.post("/api/auth/login", data={
        "username": "exporter",
        "password": "exportpassword"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Hosted Zone
    zone_res = client.post("/api/zones", json={
        "name": "exportme.com.",
        "type": "Public",
        "comment": "Testing Exporter",
        "description": "Testing Exporter"
    }, headers=headers)
    assert zone_res.status_code == 201
    zone_id = zone_res.json()["id"]
    
    # 4. Insert custom A record
    rec_res = client.post(f"/api/zones/{zone_id}/records", json={
        "name": "www.exportme.com.",
        "type": "A",
        "ttl": 300,
        "value": "9.9.9.9",
        "routing_policy": "Simple"
    }, headers=headers)
    assert rec_res.status_code == 201
    
    # 5. Export as JSON
    json_export = client.get(f"/api/zones/{zone_id}/export?format=json", headers=headers)
    assert json_export.status_code == 200
    assert json_export.headers["content-type"] == "application/json"
    data = json_export.json()
    assert data["zone_id"] == zone_id
    assert data["zone_name"] == "exportme.com."
    assert len(data["records"]) == 3  # SOA, NS, and A
    
    names = [r["name"] for r in data["records"]]
    assert "www.exportme.com." in names
    
    # 6. Export as BIND
    bind_export = client.get(f"/api/zones/{zone_id}/export?format=bind", headers=headers)
    assert bind_export.status_code == 200
    assert bind_export.headers["content-type"] == "text/plain; charset=utf-8"
    bind_text = bind_export.text
    assert "; BIND Zone File Export for exportme.com." in bind_text
    assert "$TTL 3600" in bind_text
    assert "www.exportme.com." in bind_text
    assert "9.9.9.9" in bind_text
    
    # Ensure SOA record appears before others
    lines = [line.strip() for line in bind_text.splitlines() if line.strip() and not line.startswith(";")]
    # First line after comments/TTL should be SOA
    soa_line = next(line for line in lines if "SOA" in line)
    a_line = next(line for line in lines if "A" in line and "9.9.9.9" in line)
    assert lines.index(soa_line) < lines.index(a_line)
    
    print("ALL BIND EXPORT UNIT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_bind_export()
