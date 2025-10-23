from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:{os.getenv('POSTGRES_PASSWORD', 'postgres')}@{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'context_machine')}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Import all models to ensure they're registered with Base
from .user import User, UserRole
from .partner import Partner
from .tenant import Tenant
from .project import Project
from .group import Group
from .subscription import Subscription, SubscriptionStatus
from .permission import Permission, ScopeType
from .page import Page, LayoutRegion
from .module import Module
from .widget import Widget
from .theme import Theme, ProjectTheme, UserPreference
from .domain import Domain

__all__ = [
    "Base",
    "engine", 
    "SessionLocal",
    "User",
    "UserRole",
    "Partner",
    "Tenant", 
    "Project",
    "Group",
    "Subscription",
    "SubscriptionStatus",
    "Permission",
    "ScopeType",
    "Page",
    "LayoutRegion",
    "Module",
    "Widget",
    "Theme",
    "ProjectTheme",
    "UserPreference",
    "Domain"
]