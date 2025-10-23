import os
from alembic.config import Config
from alembic import command
from .database import DatabaseService

class MigrationService:
    """Alembic migration service"""
    
    def __init__(self):
        self.db_service = DatabaseService()
        
        # Set up alembic config
        self.alembic_cfg = Config("alembic.ini")
        self.alembic_cfg.set_main_option("sqlalchemy.url", self.db_service.database_url)
    
    def init_migrations(self):
        """Initialize alembic migrations"""
        try:
            print("[MIGRATION] Initializing alembic...")
            command.init(self.alembic_cfg, "migrations")
            print("[MIGRATION] Alembic initialized")
        except Exception as e:
            print(f"[MIGRATION] Init error (may already exist): {e}")
    
    def create_migration(self, message: str = "Auto migration"):
        """Create new migration"""
        try:
            print(f"[MIGRATION] Creating migration: {message}")
            command.revision(self.alembic_cfg, autogenerate=True, message=message)
            print("[MIGRATION] Migration created")
        except Exception as e:
            print(f"[MIGRATION] Create error: {e}")
            raise
    
    def run_migrations(self):
        """Run all pending migrations"""
        try:
            print("[MIGRATION] Running migrations...")
            command.upgrade(self.alembic_cfg, "head")
            print("[MIGRATION] Migrations completed")
        except Exception as e:
            print(f"[MIGRATION] Migration error: {e}")
            raise
    
    def setup_database(self):
        """Complete database setup: create DB, run migrations, seed data"""
        try:
            print("[MIGRATION] Setting up database...")
            
            # Database is already created by DatabaseService
            print("[MIGRATION] Database ready")
            
            # Try to run migrations first
            try:
                self.run_migrations()
                print("[MIGRATION] Database setup complete")
            except Exception as migration_error:
                print(f"[MIGRATION] Migration failed: {migration_error}")
                # Fallback: create tables directly
                print("[MIGRATION] Fallback: Creating tables directly...")
                self.db_service.create_tables()
                print("[MIGRATION] Tables created directly")
            
            # Seed test data
            self.seed_test_data()
            
        except Exception as e:
            print(f"[MIGRATION] Setup error: {e}")
            raise
    
    def seed_test_data(self):
        """Seed database with hardcoded test data"""
        try:
            print("[MIGRATION] Seeding test data...")
            
            from models import (
                User, UserRole, Module, Widget, Page, Permission, Group, 
                Project, Tenant, Partner
            )
            import uuid
            import bcrypt
            
            with self.db_service.get_session() as session:
                # Check if data already exists
                if session.query(User).count() > 0:
                    print("[MIGRATION] Test data already exists, skipping...")
                    return
                
                # Create Partner
                partner = Partner(
                    id=uuid.uuid4(),
                    name="Context Machine Corp",
                    slug="context-machine",
                    is_active=True
                )
                session.add(partner)
                session.flush()
                
                # Create Tenant
                tenant = Tenant(
                    id=uuid.uuid4(),
                    partner_id=partner.id,
                    name="Default Tenant",
                    slug="default",
                    is_active=True
                )
                session.add(tenant)
                session.flush()
                
                # Create Project
                project = Project(
                    id=uuid.UUID("550e8400-e29b-41d4-a716-446655440000"),  # Fixed UUID for widget pack
                    tenant_id=tenant.id,
                    name="Core System",
                    slug="core-system",
                    description="Core system project",
                    is_active=True
                )
                session.add(project)
                session.flush()
                
                # Skip subscription types for now - model doesn't exist yet
                
                # Create Permissions
                permissions = [
                    Permission(id=uuid.uuid4(), name="navigation.view", description="View navigation"),
                    Permission(id=uuid.uuid4(), name="navigation.navigate", description="Navigate"),
                    Permission(id=uuid.uuid4(), name="dashboard.view", description="View dashboard"),
                    Permission(id=uuid.uuid4(), name="admin.manage", description="Admin management"),
                    Permission(id=uuid.uuid4(), name="theme.edit", description="Edit themes"),
                    Permission(id=uuid.uuid4(), name="theme.create", description="Create themes"),
                    Permission(id=uuid.uuid4(), name="theme.delete", description="Delete themes"),
                    Permission(id=uuid.uuid4(), name="admin.theme.access", description="Access theme editor"),
                ]
                session.add_all(permissions)
                session.flush()
                
                # Create Groups
                user_group = Group(
                    id=uuid.uuid4(),
                    name="Users",
                    description="Regular users",
                    is_active=True
                )
                admin_group = Group(
                    id=uuid.uuid4(),
                    name="Administrators", 
                    description="System administrators",
                    is_active=True
                )
                session.add_all([user_group, admin_group])
                session.flush()
                
                # Create Users
                admin_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                user_password = bcrypt.hashpw("user123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                
                admin_user = User(
                    id=uuid.uuid4(),
                    username="admin",
                    email="admin@contextmachine.com",
                    password_hash=admin_password,
                    full_name="System Administrator",
                    role=UserRole.SUPERADMIN,
                    is_active=True
                )
                
                regular_user = User(
                    id=uuid.uuid4(),
                    username="user",
                    email="user@contextmachine.com", 
                    password_hash=user_password,
                    full_name="Regular User",
                    role=UserRole.USER,
                    is_active=True
                )
                session.add_all([admin_user, regular_user])
                session.flush()
                
                # Create Modules
                core_ui_module = Module(
                    id=uuid.uuid4(),
                    name="core-ui",
                    display_name="Core UI Components",
                    description="Essential UI components for the system",
                    version="1.0.0",
                    category="ui",
                    is_system=True,
                    is_active=True
                )
                
                dashboard_module = Module(
                    id=uuid.uuid4(),
                    name="dashboard",
                    display_name="Dashboard",
                    description="System dashboard and analytics",
                    version="1.0.0", 
                    category="analytics",
                    is_system=True,
                    is_active=True
                )
                session.add_all([core_ui_module, dashboard_module])
                session.flush()
                
                # Create Widgets
                widgets = [
                    # Navigation Widgets
                    Widget(
                        id=uuid.uuid4(),
                        module_id=core_ui_module.id,
                        name="SidebarNav",
                        display_name="Sidebar Navigation",
                        description="Professional sidebar navigation component",
                        component_path="@/widget-packs/navigation/widgets/SidebarNav.vue",
                        props_schema={"items": {"type": "array", "required": True}},
                        is_active=True
                    ),
                    Widget(
                        id=uuid.uuid4(),
                        module_id=core_ui_module.id,
                        name="TopBar",
                        display_name="Top Navigation Bar",
                        description="Horizontal top navigation bar",
                        component_path="@/widget-packs/navigation/widgets/TopBar.vue",
                        props_schema={"items": {"type": "array"}},
                        is_active=True
                    ),
                    # Dashboard Widgets
                    Widget(
                        id=uuid.uuid4(),
                        module_id=dashboard_module.id,
                        name="Welcome",
                        display_name="Welcome Widget",
                        description="Welcome dashboard widget",
                        component_path="@/components/Welcome.vue",
                        props_schema={},
                        is_active=True
                    )
                ]
                session.add_all(widgets)
                session.flush()
                
                # Create Pages
                pages = [
                    Page(
                        id=uuid.uuid4(),
                        name="Home",
                        title="Home Page",
                        route="/",
                        description="Main home page",
                        layout_config={
                            "bars": {"t": 2, "b": 0, "l": 2, "r": 0},
                            "ports": {
                                "t": ["nav@TopBar"],
                                "l": ["nav@SidebarNav"],
                                "m": ["dashboard@Welcome"]
                            }
                        },
                        is_active=True
                    ),
                    Page(
                        id=uuid.uuid4(),
                        name="Test",
                        title="Test Page", 
                        route="/test",
                        description="Test page for development",
                        layout_config={
                            "bars": {"t": 2, "b": 0, "l": 2, "r": 0},
                            "ports": {
                                "t": ["nav@TopBar"],
                                "l": ["nav@SidebarNav"],
                                "m": ["dashboard@Welcome"]
                            }
                        },
                        is_active=True
                    ),
                    Page(
                        id=uuid.uuid4(),
                        name="Theme Editor",
                        title="Theme Editor",
                        route="/admin/theme-editor",
                        description="Advanced theme editor for customizing application appearance",
                        layout_config={
                            "bars": {"t": 2, "b": 0, "l": 2, "r": 0},
                            "ports": {
                                "t": ["nav@TopBar"],
                                "l": ["nav@SidebarNav"],
                                "m": ["theme@ThemeEditor"]
                            }
                        },
                        is_active=True
                    )
                ]
                session.add_all(pages)
                session.flush()
                
                # Add permissions to Theme Editor page
                theme_editor_page = next((p for p in pages if p.route == "/admin/theme-editor"), None)
                admin_theme_permission = next((p for p in permissions if p.name == "admin.theme.access"), None)
                
                if theme_editor_page and admin_theme_permission:
                    from models.page import page_permissions
                    session.execute(
                        page_permissions.insert().values(
                            page_id=theme_editor_page.id,
                            permission_id=admin_theme_permission.id
                        )
                    )
                
                # Create default themes
                from models.theme import Theme
                
                default_theme = Theme(
                    id=uuid.uuid4(),
                    name="default",
                    display_name="Default Theme",
                    description="System default theme with professional blue colors",
                    css_variables={
                        "primary-color": "#667eea",
                        "secondary-color": "#764ba2",
                        "accent-color": "#f093fb",
                        "background-color": "#ffffff",
                        "surface-color": "#f8fafc",
                        "text-color": "#1a202c",
                        "text-secondary-color": "#718096",
                        "border-color": "#e2e8f0",
                        "border-radius": "8px",
                        "font-family": "Inter, system-ui, sans-serif",
                        "font-size": "14px",
                        "spacing-unit": "16px"
                    },
                    is_default=True,
                    is_active=True,
                    created_by=None  # System theme
                )
                
                dark_theme = Theme(
                    id=uuid.uuid4(),
                    name="dark",
                    display_name="Dark Theme",
                    description="Dark theme for low-light environments",
                    css_variables={
                        "primary-color": "#667eea",
                        "secondary-color": "#764ba2",
                        "accent-color": "#f093fb",
                        "background-color": "#1a202c",
                        "surface-color": "#2d3748",
                        "text-color": "#f7fafc",
                        "text-secondary-color": "#a0aec0",
                        "border-color": "#4a5568",
                        "border-radius": "8px",
                        "font-family": "Inter, system-ui, sans-serif",
                        "font-size": "14px",
                        "spacing-unit": "16px"
                    },
                    is_default=False,
                    is_active=True,
                    created_by=None  # System theme
                )
                
                session.add_all([default_theme, dark_theme])
                session.flush()
                
                # Skip subscriptions for now - need subscription types first
                
                print("[MIGRATION] Test data seeded successfully")
                
        except Exception as e:
            print(f"[MIGRATION] Seed error: {e}")
            raise