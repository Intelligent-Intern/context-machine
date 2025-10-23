from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from . import Base

class Module(Base):
    __tablename__ = "modules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    version = Column(String(20), default='1.0.0')
    icon = Column(String(100))
    category = Column(String(50))
    service_url = Column(String(255))
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ProjectModule(Base):
    __tablename__ = "project_modules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"))
    config_json = Column(JSONB)
    is_enabled = Column(Boolean, default=True)
    enabled_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    enabled_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('project_id', 'module_id'),)

class ModuleAction(Base):
    __tablename__ = "module_actions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"))
    action_name = Column(String(100), nullable=False)
    description = Column(Text)
    request_schema = Column(JSONB)
    response_schema = Column(JSONB)
    requires_permission_id = Column(UUID(as_uuid=True), ForeignKey("permissions.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('module_id', 'action_name'),)

class ModuleEvent(Base):
    __tablename__ = "module_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"))
    event_name = Column(String(100), nullable=False)
    description = Column(Text)
    payload_schema = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('module_id', 'event_name'),)