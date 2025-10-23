from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

# Association table for project-domain many-to-many relationship
project_domain_association = Table(
    'project_domains',
    Base.metadata,
    Column('project_id', String, ForeignKey('projects.id'), primary_key=True),
    Column('domain_id', String, ForeignKey('domains.id'), primary_key=True),
    Column('created_at', DateTime, default=datetime.utcnow)
)

class Domain(Base):
    """Domain model for storing allowed frontend domains"""
    __tablename__ = 'domains'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    domain = Column(String, nullable=False, unique=True)  # e.g. "localhost:5173"
    protocol = Column(String, nullable=False, default='http')  # http or https
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to projects
    projects = relationship("Project", secondary=project_domain_association, back_populates="domains")
    
    @property
    def full_url(self):
        """Get full URL with protocol"""
        return f"{self.protocol}://{self.domain}"
    
    def to_dict(self):
        return {
            'id': self.id,
            'domain': self.domain,
            'protocol': self.protocol,
            'full_url': self.full_url,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }