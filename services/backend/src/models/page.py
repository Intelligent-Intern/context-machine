from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Integer, UniqueConstraint, Table, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum
from . import Base

class LayoutRegion(enum.Enum):
    TOP = "top"
    LEFT = "left"
    MAIN = "main"
    RIGHT = "right"
    BOTTOM = "bottom"

# Association table
page_permissions = Table('page_permissions', Base.metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('page_id', UUID(as_uuid=True), ForeignKey('pages.id', ondelete='CASCADE')),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE')),
    Column('created_at', DateTime(timezone=True), server_default=func.now()),
    UniqueConstraint('page_id', 'permission_id')
)

class Page(Base):
    __tablename__ = "pages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    route = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    title = Column(String(255))
    description = Column(Text)
    layout_config = Column(JSONB)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (UniqueConstraint('project_id', 'route'),)

class PageModule(Base):
    __tablename__ = "page_modules"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_id = Column(UUID(as_uuid=True), ForeignKey("pages.id", ondelete="CASCADE"))
    module_id = Column(UUID(as_uuid=True), ForeignKey("modules.id", ondelete="CASCADE"))
    layout_region = Column(Enum(LayoutRegion), nullable=False)
    display_order = Column(Integer, default=0)
    config_json = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (UniqueConstraint('page_id', 'module_id', 'layout_region'),)

class PageWidget(Base):
    __tablename__ = "page_widgets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    page_module_id = Column(UUID(as_uuid=True), ForeignKey("page_modules.id", ondelete="CASCADE"))
    widget_id = Column(UUID(as_uuid=True), ForeignKey("widgets.id", ondelete="CASCADE"))
    layout_region = Column(Enum(LayoutRegion), nullable=False)
    display_order = Column(Integer, default=0)
    config_json = Column(JSONB)
    visible_when = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())