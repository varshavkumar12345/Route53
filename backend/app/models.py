from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    aws_account_id = Column(String, unique=True, nullable=False)

    zones = relationship("HostedZone", back_populates="owner", cascade="all, delete-orphan")

class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String, primary_key=True, index=True)  # e.g. Z0123456789
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, index=True, nullable=False)  # e.g. example.com.
    type = Column(String, nullable=False)              # Public or Private
    description = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    record_count = Column(Integer, default=0)
    caller_reference = Column(String, nullable=False)

    owner = relationship("User", back_populates="zones")
    records = relationship("DnsRecord", back_populates="zone", cascade="all, delete-orphan")

class DnsRecord(Base):
    __tablename__ = "dns_records"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(String, ForeignKey("hosted_zones.id"), nullable=False)
    name = Column(String, index=True, nullable=False)  # e.g. www.example.com.
    type = Column(String, nullable=False)              # A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA
    ttl = Column(Integer, default=300)
    value = Column(String, nullable=False)             # Newline-separated records
    routing_policy = Column(String, default="Simple")

    zone = relationship("HostedZone", back_populates="records")
