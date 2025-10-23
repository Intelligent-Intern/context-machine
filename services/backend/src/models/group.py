from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from . import Base

# Association tables
group_pages = Table('group_pages', Base.metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('group_id', UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE')),
    Column('page_id', UUID(as_uuid=True), ForeignKey('pages.id', ondelete='CASCADE')),
    Column('created_at', DateTime(timezone=True), server_default=func.now()),
    UniqueConstraint('group_id', 'page_id')
)

group_permissions = Table('group_permissions', Base.metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('group_id', UUID(as_uuid=True), ForeignKey('groups.id', ondelete='CASCADE')),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id', ondelete='CASCADE')),
    Column('created_at', DateTime(timezone=True), server_default=func.now()),
    UniqueConstraint('group_id', 'permission_id')
)

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (UniqueConstraint('project_id', 'name'),)