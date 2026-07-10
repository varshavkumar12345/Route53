import ipaddress
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import HostedZone, DnsRecord
from ..schemas import DnsRecordCreate, DnsRecordResponse
from ..auth import get_current_user

router = APIRouter(
    prefix="/api/zones",
    tags=["records"]
)

def validate_record_values(record_type: str, value: str):
    # Splits the multi-line values to validate each line
    lines = [line.strip() for line in value.strip().split("\n") if line.strip()]
    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Value cannot be empty."
        )

    if record_type == "A":
        for ip in lines:
            try:
                ipaddress.IPv4Address(ip)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid IPv4 address: '{ip}'"
                )
    elif record_type == "AAAA":
        for ip in lines:
            try:
                ipaddress.IPv6Address(ip)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid IPv6 address: '{ip}'"
                )
    elif record_type == "CNAME":
        if len(lines) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CNAME records only support a single value."
            )
        cname_val = lines[0]
        # Simple domain name regex
        if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\.?$", cname_val):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid CNAME domain value: '{cname_val}'"
            )
    elif record_type == "TXT":
        # AWS TXT records must be enclosed in double quotes
        for text in lines:
            if not (text.startswith('"') and text.endswith('"')):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"TXT record values must be enclosed in double quotes: {text}"
                )

@router.get("/{zone_id}/records", response_model=List[DnsRecordResponse])
def get_records(
    zone_id: str,
    name: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify zone ownership
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found or access denied"
        )
    
    query = db.query(DnsRecord).filter(DnsRecord.zone_id == zone_id)
    if name:
        query = query.filter(DnsRecord.name.contains(name))
    if type:
        query = query.filter(DnsRecord.type == type)
        
    return query.all()

@router.post("/{zone_id}/records", response_model=DnsRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    zone_id: str,
    record_in: DnsRecordCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify zone ownership
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found or access denied"
        )

    # Standardize record name: append zone name if user only entered a prefix
    rec_name = record_in.name.strip()
    if not rec_name.endswith("."):
        rec_name += "."
    
    if not rec_name.endswith(zone.name):
        rec_name = f"{rec_name.rstrip('.')}.{zone.name}"

    # Perform type-specific validations
    validate_record_values(record_in.type, record_in.value)

    # Save new record
    new_record = DnsRecord(
        zone_id=zone_id,
        name=rec_name,
        type=record_in.type,
        ttl=record_in.ttl,
        value=record_in.value.strip(),
        routing_policy=record_in.routing_policy or "Simple"
    )

    db.add(new_record)
    
    # Increment zone record count
    zone.record_count += 1
    
    try:
        db.commit()
        db.refresh(new_record)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
        
    return new_record

@router.put("/{zone_id}/records/{record_id}", response_model=DnsRecordResponse)
def update_record(
    zone_id: str,
    record_id: int,
    record_in: DnsRecordCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify zone ownership
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found or access denied"
        )

    # Verify record existence
    record = db.query(DnsRecord).filter(DnsRecord.id == record_id, DnsRecord.zone_id == zone_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DNS record not found"
        )

    # Prevent editing default system records (NS/SOA at zone root)
    if record.type in ["NS", "SOA"] and record.name == zone.name:
        # Prevent editing name or type. Editing values of default records is allowed in AWS console,
        # but changing name/type breaks the zone routing completely.
        if record_in.type != record.type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Default system records (NS/SOA) cannot change their type."
            )

    # Standardize record name
    rec_name = record_in.name.strip()
    if not rec_name.endswith("."):
        rec_name += "."
    
    if not rec_name.endswith(zone.name):
        rec_name = f"{rec_name.rstrip('.')}.{zone.name}"

    # Re-validate
    validate_record_values(record_in.type, record_in.value)

    record.name = rec_name
    record.type = record_in.type
    record.ttl = record_in.ttl
    record.value = record_in.value.strip()
    record.routing_policy = record_in.routing_policy or "Simple"

    db.commit()
    db.refresh(record)
    return record

@router.delete("/{zone_id}/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    zone_id: str,
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Verify zone ownership
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found or access denied"
        )

    # Verify record existence
    record = db.query(DnsRecord).filter(DnsRecord.id == record_id, DnsRecord.zone_id == zone_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="DNS record not found"
        )

    # Prevent deleting default NS and SOA records
    if record.type in ["NS", "SOA"] and record.name == zone.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Default system records (NS and SOA) cannot be deleted."
        )

    db.delete(record)
    
    # Decrement zone record count
    zone.record_count -= 1
    
    db.commit()
    return None

from pydantic import BaseModel

def parse_bind_zone_file(content: str, zone_name: str) -> list:
    records = []
    default_ttl = 3600
    
    lines = []
    in_parentheses = False
    current_line_parts = []
    
    for line in content.splitlines():
        clean_line = ""
        in_quotes = False
        for char in line:
            if char == '"':
                in_quotes = not in_quotes
            elif char == ';' and not in_quotes:
                break
            clean_line += char
            
        clean_line = clean_line.strip()
        if not clean_line:
            continue
            
        if clean_line.startswith('$'):
            parts = clean_line.split()
            if len(parts) >= 2:
                directive = parts[0].upper()
                if directive == "$TTL":
                    try:
                        val = parts[1]
                        mult = 1
                        if val[-1].lower() in ['s', 'm', 'h', 'd', 'w']:
                            char = val[-1].lower()
                            val = val[:-1]
                            if char == 'm': mult = 60
                            elif char == 'h': mult = 3600
                            elif char == 'd': mult = 86400
                            elif char == 'w': mult = 604800
                        default_ttl = int(val) * mult
                    except Exception:
                        pass
            continue
            
        for char in clean_line:
            if char == '(':
                in_parentheses = True
                continue
            elif char == ')':
                in_parentheses = False
                continue
            current_line_parts.append(char)
            
        if not in_parentheses:
            full_stmt = "".join(current_line_parts).strip()
            full_stmt = re.sub(r'\s+', ' ', full_stmt)
            if full_stmt:
                lines.append(full_stmt)
            current_line_parts = []
            
    last_name = "@"
    classes = {"IN", "CH", "HS"}
    valid_types = {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"}
    
    for r_line in lines:
        parts = r_line.split()
        if not parts:
            continue
            
        first_token = parts[0].upper()
        has_explicit_name = True
        if first_token in classes or first_token in valid_types or first_token.isdigit():
            has_explicit_name = False
            
        name = parts[0] if has_explicit_name else last_name
        last_name = name
        
        rem = parts[1:] if has_explicit_name else parts
        
        ttl = default_ttl
        r_type = None
        r_class = "IN"
        r_value_parts = []
        
        i = 0
        while i < len(rem):
            tok = rem[i].upper()
            if tok.isdigit():
                ttl = int(tok)
            elif tok in classes:
                r_class = tok
            elif tok in valid_types:
                r_type = tok
                r_value_parts = rem[i+1:]
                break
            i += 1
            
        if not r_type:
            continue
            
        r_value = " ".join(r_value_parts)
        z_name = zone_name.strip()
        if not z_name.endswith("."):
            z_name += "."
            
        rec_name = name.strip()
        if rec_name == "@":
            rec_name = z_name
        elif not rec_name.endswith("."):
            rec_name = f"{rec_name}.{z_name}"
            
        records.append({
            "name": rec_name,
            "type": r_type,
            "ttl": ttl,
            "value": r_value
        })
        
    return records

class BINDImportRequest(BaseModel):
    zone_file_content: str

@router.post("/{zone_id}/import")
def import_bind_records(
    zone_id: str,
    request: BINDImportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id, HostedZone.owner_id == current_user.id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hosted zone not found or access denied"
        )
        
    try:
        parsed_records = parse_bind_zone_file(request.zone_file_content, zone.name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse BIND zone file: {str(e)}"
        )
        
    imported_count = 0
    
    for r in parsed_records:
        r_type = r["type"]
        r_name = r["name"]
        r_ttl = r["ttl"]
        r_value = r["value"]
        
        if r_type == "SOA":
            continue
        if r_type == "NS" and r_name == zone.name:
            continue
            
        if not r_name.endswith(zone.name):
            continue
            
        try:
            validate_record_values(r_type, r_value)
        except HTTPException as he:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Record validation failed for {r_name} ({r_type}): {he.detail}"
            )
            
        new_rec = DnsRecord(
            zone_id=zone_id,
            name=r_name,
            type=r_type,
            ttl=r_ttl,
            value=r_value,
            routing_policy="Simple"
        )
        db.add(new_rec)
        imported_count += 1
        
    if imported_count > 0:
        zone.record_count += imported_count
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database commit failed: {str(e)}"
            )
            
    return {
        "status": "success",
        "imported_count": imported_count
    }
