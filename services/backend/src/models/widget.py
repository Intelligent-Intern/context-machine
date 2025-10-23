from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from . import Base

class Widget(Base):
    __tablename__ = "widgets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    component_path = Column(String(255), nullable=False)
    props_schema = Column(JSONB)
    default_config = Column(JSONB)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('module_id', 'name'),)

class WidgetPack(Base):
    __tablename__ = "widget_packs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    version = Column(String(20), default='1.0.0')
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('module_id', 'name'),)

class WidgetPackComponent(Base):
    __tablename__ = "widget_pack_components"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    widget_pack_id = Column(UUID(as_uuid=True), ForeignKey("widget_packs.id", ondelete="CASCADE"))
    widget_id = Column(UUID(as_uuid=True), ForeignKey("widgets.id", ondelete="CASCADE"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('widget_pack_id', 'widget_id'),)