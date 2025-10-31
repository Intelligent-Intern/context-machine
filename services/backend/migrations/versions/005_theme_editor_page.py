"""Add theme editor page

Revision ID: 005
Revises: 004
Create Date: 2024-10-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import uuid

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    
    # Get admin user ID
    result = connection.execute(sa.text("SELECT id FROM users WHERE username = 'admin'"))
    admin_id = result.fetchone()[0]
    
    # Check if theme editor page already exists
    result = connection.execute(sa.text("SELECT id FROM pages WHERE route = '/theme-editor'"))
    existing_page = result.fetchone()
    
    if not existing_page:
        # Create theme editor page
        theme_editor_page_id = str(uuid.uuid4())
        
        connection.execute(sa.text("""
            INSERT INTO pages (id, project_id, route, name, title, description, layout_config, is_active, display_order, created_by)
            VALUES (:id, null, :route, :name, :title, :description, :layout_config, true, :display_order, :created_by)
        """), {
            'id': theme_editor_page_id,
            'route': '/theme-editor',
            'name': 'ThemeEditor',
            'title': 'Theme Editor',
            'description': 'Theme customization interface',
            'layout_config': '{"top": true, "main": true, "right": true, "left": true}',
            'display_order': 2,
            'created_by': admin_id
        })
    else:
        theme_editor_page_id = str(existing_page[0])
    
    # Create or get modules
    modules_to_create = [
        ('navigation', 'Navigation Module', 'Provides navigation widgets'),
        ('theme-preview', 'Theme Preview Module', 'Provides theme preview widgets'),
        ('theme-controls', 'Theme Controls Module', 'Provides theme control widgets')
    ]
    
    module_ids = {}
    for module_name, module_title, module_desc in modules_to_create:
        # Check if module exists
        result = connection.execute(sa.text("SELECT id FROM modules WHERE name = :name"), {'name': module_name})
        existing_module = result.fetchone()
        
        if not existing_module:
            module_id = str(uuid.uuid4())
            connection.execute(sa.text("""
                INSERT INTO modules (id, name, display_name, description, version, is_active)
                VALUES (:id, :name, :display_name, :description, '1.0.0', true)
            """), {
                'id': module_id,
                'name': module_name,
                'display_name': module_title,
                'description': module_desc
            })
        else:
            module_id = str(existing_module[0])
        
        module_ids[module_name] = module_id
    
    # Create or get widgets
    widgets_to_create = [
        ('TopBar', 'navigation', 'Top navigation bar'),
        ('SidebarNav', 'navigation', 'Sidebar navigation'),
        ('MiniAppPreview', 'theme-preview', 'Mini application preview'),
        ('ThemeControlPanel', 'theme-controls', 'Theme control panel')
    ]
    
    widget_ids = {}
    for widget_name, widget_module, widget_desc in widgets_to_create:
        # Check if widget exists
        result = connection.execute(sa.text("SELECT id FROM widgets WHERE name = :name"), {'name': widget_name})
        existing_widget = result.fetchone()
        
        if not existing_widget:
            widget_id = str(uuid.uuid4())
            connection.execute(sa.text("""
                INSERT INTO widgets (id, module_id, name, display_name, description, component_path, is_active)
                VALUES (:id, :module_id, :name, :display_name, :description, :component_path, true)
            """), {
                'id': widget_id,
                'module_id': module_ids[widget_module],
                'name': widget_name,
                'display_name': widget_name,
                'description': widget_desc,
                'component_path': f'{widget_module}@{widget_name}'
            })
        else:
            widget_id = str(existing_widget[0])
        
        widget_ids[widget_name] = widget_id
    
    # Create page modules
    page_modules_config = [
        ('navigation', 'TOP', 0),
        ('navigation', 'LEFT', 0),
        ('theme-preview', 'MAIN', 0),
        ('theme-controls', 'RIGHT', 0)
    ]
    
    page_module_ids = {}
    for module_name, region, order in page_modules_config:
        # Check if page module exists
        result = connection.execute(sa.text("""
            SELECT id FROM page_modules 
            WHERE page_id = :page_id AND module_id = :module_id AND layout_region = :region
        """), {
            'page_id': theme_editor_page_id,
            'module_id': module_ids[module_name],
            'region': region
        })
        existing_page_module = result.fetchone()
        
        if not existing_page_module:
            page_module_id = str(uuid.uuid4())
            connection.execute(sa.text("""
                INSERT INTO page_modules (id, page_id, module_id, layout_region, display_order, config_json)
                VALUES (:id, :page_id, :module_id, :layout_region, :display_order, '{}')
            """), {
                'id': page_module_id,
                'page_id': theme_editor_page_id,
                'module_id': module_ids[module_name],
                'layout_region': region,
                'display_order': order
            })
        else:
            page_module_id = str(existing_page_module[0])
        
        page_module_ids[f'{module_name}_{region}'] = page_module_id
    
    # Create page widgets
    page_widgets_config = [
        ('TopBar', 'navigation', 'TOP', 0),
        ('SidebarNav', 'navigation', 'LEFT', 0),
        ('MiniAppPreview', 'theme-preview', 'MAIN', 0),
        ('ThemeControlPanel', 'theme-controls', 'RIGHT', 0)
    ]
    
    for widget_name, module_name, region, order in page_widgets_config:
        page_module_key = f'{module_name}_{region}'
        
        # Check if page widget exists
        result = connection.execute(sa.text("""
            SELECT id FROM page_widgets 
            WHERE page_module_id = :page_module_id AND widget_id = :widget_id
        """), {
            'page_module_id': page_module_ids[page_module_key],
            'widget_id': widget_ids[widget_name]
        })
        existing_page_widget = result.fetchone()
        
        if not existing_page_widget:
            page_widget_id = str(uuid.uuid4())
            connection.execute(sa.text("""
                INSERT INTO page_widgets (id, page_module_id, widget_id, layout_region, display_order, config_json)
                VALUES (:id, :page_module_id, :widget_id, :layout_region, :display_order, '{}')
            """), {
                'id': page_widget_id,
                'page_module_id': page_module_ids[page_module_key],
                'widget_id': widget_ids[widget_name],
                'layout_region': region,
                'display_order': order
            })


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text("DELETE FROM pages WHERE route = '/theme-editor'"))