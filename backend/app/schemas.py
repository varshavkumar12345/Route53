from pydantic import BaseModel
from typing import Optional

# User Schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    aws_account_id: str

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# DNS Record Schemas
class DnsRecordBase(BaseModel):
    name: str
    type: str
    ttl: int
    value: str
    routing_policy: Optional[str] = "Simple"

class DnsRecordCreate(DnsRecordBase):
    pass

class DnsRecordResponse(DnsRecordBase):
    id: int
    zone_id: str

    class Config:
        from_attributes = True

# Hosted Zone Schemas
class HostedZoneBase(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    comment: Optional[str] = None

class HostedZoneCreate(HostedZoneBase):
    pass

class HostedZoneResponse(HostedZoneBase):
    id: str
    record_count: int
    caller_reference: str

    class Config:
        from_attributes = True
