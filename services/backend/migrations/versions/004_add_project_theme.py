"""Add theme_config to projects table

Revision ID: 004
Revises: 003
Create Date: 2024-10-22 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Add theme_config column to projects table
    op.add_column('projects', sa.Column('theme_config', sa.Text(), nullable=True))
    
    # Set default theme for existing projects
    op.execute("""
        UPDATE projects 
        SET theme_config = '{"primary": "#667eea", "secondary": "#764ba2", "accent": "#f093fb", "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "surface": "#ffffff", "text": "#1a202c", "textSecondary": "#718096"}'
        WHERE theme_config IS NULL
    """)


def downgrade():
    op.drop_column('projects', 'theme_config')