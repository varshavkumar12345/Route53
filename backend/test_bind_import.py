import os
import sys

# Ensure backend root is on path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, HostedZone, DnsRecord

client = TestClient(app)

def test_bind_import():
    # Setup clean db schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Register User A
    reg_res = client.post("/api/auth/register", json={
        "username": "tester",
        "password": "testerpassword"
    })
    assert reg_res.status_code == 201, reg_res.text
    
    # 2. Login User A
    login_res = client.post("/api/auth/login", data={
        "username": "tester",
        "password": "testerpassword"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Hosted Zone
    zone_res = client.post("/api/zones", json={
        "name": "example.com.",
        "type": "Public",
        "comment": "Testing BIND Import",
        "description": "Testing BIND Import"
    }, headers=headers)
    assert zone_res.status_code == 201
    zone_id = zone_res.json()["id"]
    
    # 4. Prepare BIND zone file content
    bind_content = """
    $TTL 86400
    ; Standard BIND Header comments
    @   IN  SOA ns.example.com. hostmaster.example.com. (
                2023071001 ; serial
                3600       ; refresh
                1800       ; retry
                604800     ; expire
                86400      ; minimum TTL
    )
    @      IN  NS  ns.example.com.
    @      IN  A   192.0.2.1
    www    IN  A   192.0.2.2
    mail   IN  MX  10 mail.example.com.
    google IN  CNAME ghs.google.com.
    spf    IN  TXT   "v=spf1 include:_spf.google.com ~all"
    """
    
    # 5. Send Import POST Request
    import_res = client.post(
        f"/api/zones/{zone_id}/import",
        json={"zone_file_content": bind_content},
        headers=headers
    )
    assert import_res.status_code == 200, import_res.text
    assert import_res.json()["status"] == "success"
    assert import_res.json()["imported_count"] == 5  # A (root), A (www), MX, CNAME, TXT (SOA and NS root are skipped!)
    
    # 6. Verify Records in DB
    recs_res = client.get(f"/api/zones/{zone_id}/records", headers=headers)
    assert recs_res.status_code == 200
    records = recs_res.json()
    
    # Standard hosted zones start with 2 records (default NS and SOA)
    # Plus 5 imported records = 7 total records
    assert len(records) == 7
    
    types = [r["type"] for r in records]
    assert "A" in types
    assert "MX" in types
    assert "CNAME" in types
    assert "TXT" in types
    
    # Verify name resolution
    www_rec = next(r for r in records if r["name"] == "www.example.com.")
    assert www_rec["value"] == "192.0.2.2"
    assert www_rec["ttl"] == 86400
    
    spf_rec = next(r for r in records if r["name"] == "spf.example.com.")
    assert spf_rec["value"] == '"v=spf1 include:_spf.google.com ~all"'
    
    print("ALL BIND IMPORT UNIT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_bind_import()
