import random
import string
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import HostedZone, DnsRecord
from ..schemas import HostedZoneCreate, HostedZoneResponse
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/zones",
    tags=["zones"]
)

def generate_zone_id() -> str:
    # Generates a random 20-character AWS-like Zone ID, e.g., Z0192847A5B6C8D9E0F2
    chars = string.ascii_uppercase + string.digits
    return "Z" + "".join(random.choices(chars, k=19))

@router.post("", response_model=HostedZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(
    zone_in: HostedZoneCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Standardize zone name to end with a dot if not present
    zone_name = zone_in.name.strip()
    if not zone_name.endswith("."):
        zone_name += "."

    zone_id = generate_zone_id()
    caller_ref = str(uuid.uuid4())

    new_zone = HostedZone(
        id=zone_id,
        owner_id=current_user.id,
        name=zone_name,
        type=zone_in.type,
        description=zone_in.description,
        comment=zone_in.comment,
        record_count=2,  # NS and SOA
        caller_reference=caller_ref
    )
    
    # Generate mock AWS nameservers based on random numbers
    ns_num1 = random.randint(1, 2048)
    ns_num2 = random.randint(1, 2048)
    ns_num3 = random.randint(1, 2048)
    ns_num4 = random.randint(1, 2048)
    ns1 = f"ns-{ns_num1}.awsdns-{random.randint(10, 99)}.com."
    ns2 = f"ns-{ns_num2}.awsdns-{random.randint(10, 99)}.net."
    ns3 = f"ns-{ns_num3}.awsdns-{random.randint(10, 99)}.co.uk."
    ns4 = f"ns-{ns_num4}.awsdns-{random.randint(10, 99)}.org."

    # Create default NS record
    ns_record = DnsRecord(
        zone_id=zone_id,
        name=zone_name,
        type="NS",
        ttl=172800,  # 2 days default
        value=f"{ns1}\n{ns2}\n{ns3}\n{ns4}",
        routing_policy="Simple"
    )

    # Create default SOA record
    soa_record = DnsRecord(
        zone_id=zone_id,
        name=zone_name,
        type="SOA",
        ttl=900,     # 15 mins default
        value=f"{ns1} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400",
        routing_policy="Simple"
    )

    db.add(new_zone)
    db.add(ns_record)
    db.add(soa_record)
    
    try:
        db.commit()
        db.refresh(new_zone)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
        
    return new_zone

@router.get("", response_model=List[HostedZoneResponse])
def get_zones(
    name: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(HostedZone).filter(HostedZone.owner_id == current_user.id)
    if name:
        query = query.filter(HostedZone.name.contains(name))
    return query.offset(skip).limit(limit).all()

@router.get("/{zone_id}", response_model=HostedZoneResponse)
def get_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found"
        )
    return zone

@router.put("/{zone_id}", response_model=HostedZoneResponse)
def update_zone(
    zone_id: str,
    zone_in: HostedZoneCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found"
        )
    
    zone.description = zone_in.description
    zone.comment = zone_in.comment
    
    db.commit()
    db.refresh(zone)
    return zone

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found"
        )
    
    db.delete(zone)
    db.commit()
    return None
