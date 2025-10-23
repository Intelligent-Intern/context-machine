"""Initial data - default user, modules, pages

Revision ID: 002
Revises: 001
Create Date: 2025-01-17 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import bcrypt
import uuid

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create connection
    connection = op.get_bind()
    
    # Hash password for default admin user
    admin_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Insert default admin user
    admin_id = str(uuid.uuid4())
    connection.execute(sa.text("""
        INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
        VALUES (:id, 'admin', 'admin@context-machine.local', :password_hash, 'Administrator', 'SUPERADMIN', true)
    """), {
        'id': admin_id,
        'password_hash': admin_password
    })
    
    # Insert default permissions
    permissions = [
        ('system.admin', 'Full system administration', 'system'),
        ('project.read', 'View project data', 'project'),
        ('project.write', 'Modify project data', 'project'),
        ('project.admin', 'Administer project settings', 'project'),
        ('page.view', 'View pages', 'page'),
        ('module.navigation.use', 'Use navigation module', 'module'),
        ('module.dashboard.use', 'Use dashboard module', 'module'),
        ('module.chat.use', 'Use chat module', 'module')
    ]
    
    for name, description, category in permissions:
        connection.execute(sa.text("""
            INSERT INTO permissions (id, name, description, category, is_active)
            VALUES (:id, :name, :description, :category, true)
        """), {
            'id': str(uuid.uuid4()),
            'name': name,
            'description': description,
            'category': category
        })
    
    # Insert default themes
    themes = [
        ('light', 'Light Theme', '{"--primary": "#007bff", "--bg": "#ffffff", "--text": "#333333"}', True),
        ('dark', 'Dark Theme', '{"--primary": "#0d6efd", "--bg": "#1a1a1a", "--text": "#ffffff"}', False)
    ]
    
    for name, display_name, css_vars, is_default in themes:
        connection.execute(sa.text("""
            INSERT INTO themes (id, name, display_name, css_variables, is_default, is_active, created_by)
            VALUES (:id, :name, :display_name, :css_variables, :is_default, true, :created_by)
        """), {
            'id': str(uuid.uuid4()),
            'name': name,
            'display_name': display_name,
            'css_variables': css_vars,
            'is_default': is_default,
            'created_by': admin_id
        })
    
    # Insert default modules
    navigation_module_id = str(uuid.uuid4())
    dashboard_module_id = str(uuid.uuid4())
    
    modules = [
        (navigation_module_id, 'navigation', 'Navigation', 'Navigation and menu system', '1.0.0', 'navigation', 'system', None, True),
        (dashboard_module_id, 'dashboard', 'Dashboard', 'Main dashboard and welcome screen', '1.0.0', 'dashboard', 'system', None, True)
    ]
    
    for module_id, name, display_name, description, version, icon, category, service_url, is_system in modules:
        connection.execute(sa.text("""
            INSERT INTO modules (id, name, display_name, description, version, icon, category, service_url, is_system, is_active)
            VALUES (:id, :name, :display_name, :description, :version, :icon, :category, :service_url, :is_system, true)
        """), {
            'id': module_id,
            'name': name,
            'display_name': display_name,
            'description': description,
            'version': version,
            'icon': icon,
            'category': category,
            'service_url': service_url,
            'is_system': is_system
        })
    
    # Insert default widgets
    widgets = [
        # Navigation widgets
        (str(uuid.uuid4()), navigation_module_id, 'TopBar', 'Top Navigation Bar', './components/TopBar.vue', '{}', '{}'),
        (str(uuid.uuid4()), navigation_module_id, 'SideMenu', 'Side Menu', './components/SideMenu.vue', '{}', '{}'),
        # Dashboard widgets
        (str(uuid.uuid4()), dashboard_module_id, 'Welcome', 'Welcome Screen', './components/Welcome.vue', '{}', '{}'),
        (str(uuid.uuid4()), dashboard_module_id, 'Stats', 'Statistics Widget', './components/Stats.vue', '{}', '{}')
    ]
    
    for widget_id, module_id, name, display_name, component_path, props_schema, default_config in widgets:
        connection.execute(sa.text("""
            INSERT INTO widgets (id, module_id, name, display_name, component_path, props_schema, default_config, is_active)
            VALUES (:id, :module_id, :name, :display_name, :component_path, :props_schema, :default_config, true)
        """), {
            'id': widget_id,
            'module_id': module_id,
            'name': name,
            'display_name': display_name,
            'component_path': component_path,
            'props_schema': props_schema,
            'default_config': default_config
        })
    
    # Insert default pages
    home_page_id = str(uuid.uuid4())
    dashboard_page_id = str(uuid.uuid4())
    
    pages = [
        (home_page_id, '/', 'Home', 'Home Page', 'Welcome to Context Machine', '{"top": true, "main": true}', 0),
        (dashboard_page_id, '/dashboard', 'Dashboard', 'Dashboard', 'Main Dashboard', '{"top": true, "left": true, "main": true}', 1)
    ]
    
    for page_id, route, name, title, description, layout_config, display_order in pages:
        connection.execute(sa.text("""
            INSERT INTO pages (id, project_id, route, name, title, description, layout_config, is_active, display_order, created_by)
            VALUES (:id, null, :route, :name, :title, :description, :layout_config, true, :display_order, :created_by)
        """), {
            'id': page_id,
            'route': route,
            'name': name,
            'title': title,
            'description': description,
            'layout_config': layout_config,
            'display_order': display_order,
            'created_by': admin_id
        })


def downgrade() -> None:
    # Remove all inserted data
    connection = op.get_bind()
    
    connection.execute(sa.text("DELETE FROM pages WHERE route IN ('/', '/dashboard')"))
    connection.execute(sa.text("DELETE FROM widgets WHERE name IN ('TopBar', 'SideMenu', 'Welcome', 'Stats')"))
    connection.execute(sa.text("DELETE FROM modules WHERE name IN ('navigation', 'dashboard')"))
    connection.execute(sa.text("DELETE FROM themes WHERE name IN ('light', 'dark')"))
    connection.execute(sa.text("DELETE FROM permissions WHERE category IN ('system', 'project', 'page', 'module')"))
    connection.execute(sa.text("DELETE FROM users WHERE username = 'admin'"))