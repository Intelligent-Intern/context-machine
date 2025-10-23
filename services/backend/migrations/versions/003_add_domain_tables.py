"""Add domain tables and project-domain relationship

Revision ID: 003
Revises: 002
Create Date: 2024-10-22 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Create domains table
    op.create_table('domains',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('domain', sa.String(), nullable=False),
        sa.Column('protocol', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('domain')
    )
    
    # Create project_domains association table
    op.create_table('project_domains',
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('domain_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['domain_id'], ['domains.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('project_id', 'domain_id')
    )
    
    # Insert default localhost domain
    op.execute("""
        INSERT INTO domains (id, domain, protocol, is_active, created_at, updated_at)
        VALUES (
            'localhost-5173',
            'localhost:5173',
            'http',
            true,
            NOW(),
            NOW()
        )
    """)
    
    # Insert default localhost:8080 domain for production
    op.execute("""
        INSERT INTO domains (id, domain, protocol, is_active, created_at, updated_at)
        VALUES (
            'localhost-8080',
            'localhost:8080',
            'http',
            true,
            NOW(),
            NOW()
        )
    """)


def downgrade():
    op.drop_table('project_domains')
    op.drop_table('domains')