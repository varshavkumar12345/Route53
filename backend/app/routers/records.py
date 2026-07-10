from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import HostedZone, DnsRecord
from ..schemas import DnsRecordResponse
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/zones",
    tags=["records"]
)

@router.get("/{zone_id}/records", response_model=List[DnsRecordResponse])
def get_records(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify zone ownership before returning records
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found or access denied"
        )
    return db.query(DnsRecord).filter(DnsRecord.zone_id == zone_id).all()
