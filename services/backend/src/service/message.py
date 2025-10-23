from typing import Dict, Any
from .pub import PubService
from .database import DatabaseService
from .theme import ThemeService
from models import Module, Page, Widget, User, Group, Permission, Subscription, Project, Tenant, Partner
from models.user import UserRole

class MessageService:
    """Message routing service for unified /api/message endpoint"""
    
    def __init__(self):
        self.pub_service = PubService()
        self.db_service = DatabaseService()
        self.theme_service = ThemeService()
        
        # Define routing table for message actions
        self.routes = {
            'discovery': self._handle_discovery,
            'user': self._handle_user,
            'group': self._handle_group,
            'permission': self._handle_permission,
            'subscription': self._handle_subscription,
            'project': self._handle_project,
            'tenant': self._handle_tenant,
            'partner': self._handle_partner,
            'module': self._handle_module,
            'widget': self._handle_widget,
            'page': self._handle_page,
            'chat': self._handle_chat,
            'navigation': self._handle_navigation,
            'dashboard': self._handle_dashboard,
            'theme': self._handle_theme
        }
    
    def get_public_config(self, origin: str) -> Dict[str, Any]:
        """
        Get public configuration for unauthenticated requests
        
        Args:
            origin: Frontend origin URL
            
        Returns:
            Public configuration including widget packs, login page config, theme
        """
        try:
            # Basic project info
            config = {
                'project': {
                    'name': 'Context Machine',
                    'version': '1.0.0',
                    'theme': {
                        'primary': '#667eea',
                        'secondary': '#764ba2'
                    }
                },
                'widgetPacks': [
                    {
                        'id': 'auth',
                        'name': 'Authentication Widgets',
                        'version': '1.0.0',
                        'components': {
                            'LoginForm': {
                                'path': './widgets/LoginForm.vue'
                            }
                        }
                    },
                    {
                        'id': 'navigation',
                        'name': 'Navigation Widgets',
                        'version': '1.0.0',
                        'components': {
                            'SidebarNav': {
                                'path': './widgets/SidebarNav.vue'
                            },
                            'TopBar': {
                                'path': './widgets/TopBar.vue'
                            }
                        }
                    },
                    {
                        'id': 'dashboard',
                        'name': 'Dashboard Widgets',
                        'version': '1.0.0',
                        'components': {
                            'Welcome': {
                                'path': './widgets/Welcome.vue'
                            }
                        }
                    }
                ],
                'pages': {
                    'login': {
                        'route': '/login',
                        'layout': {
                            'bars': {'top': 0, 'bottom': 0, 'left': 0, 'right': 0},
                            'ports': {
                                'main': [{'slot': 1, 'widget': 'auth@LoginForm'}]
                            }
                        }
                    }
                }
            }
            
            return config
            
        except Exception as e:
            print(f"[MESSAGE] Error getting public config: {e}")
            return {
                'error': 'Failed to load configuration',
                'project': {'name': 'Context Machine'},
                'widgetPacks': [],
                'pages': {}
            }
    
    def get_public_config(self, origin: str) -> Dict[str, Any]:
        """
        Get public configuration for unauthenticated requests
        
        Args:
            origin: Frontend origin URL (e.g. "http://localhost:5173")
            
        Returns:
            Public configuration including widget packs and login page layout
        """
        try:
            # Extract domain from origin
            domain = origin.replace('http://', '').replace('https://', '')
            
            # For now, return default config for localhost
            # TODO: Look up project by domain and return project-specific config
            if 'localhost' in domain:
                return {
                    'project': {
                        'name': 'Context Machine',
                        'theme': {
                            'primary': '#667eea',
                            'secondary': '#764ba2',
                            'accent': '#f093fb',
                            'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            'surface': '#ffffff',
                            'text': '#1a202c',
                            'textSecondary': '#718096'
                        }
                    },
                    'widgetPacks': [
                        {
                            'id': 'auth',
                            'name': 'Authentication',
                            'version': '1.0.0',
                            'components': {
                                'LoginForm': {'path': './widgets/LoginForm.vue'},
                                'ForgotPasswordForm': {'path': './widgets/ForgotPasswordForm.vue'}
                            }
                        }
                    ],
                    'pages': {
                        'login': {
                            'layout': {
                                'bars': {'top': 0, 'bottom': 0, 'left': 0, 'right': 0},
                                'ports': {
                                    'main': [{'slot': 1, 'widget': 'auth@LoginForm'}]
                                }
                            }
                        },
                        'forgot-password': {
                            'layout': {
                                'bars': {'top': 0, 'bottom': 0, 'left': 0, 'right': 0},
                                'ports': {
                                    'main': [{'slot': 1, 'widget': 'auth@ForgotPasswordForm'}]
                                }
                            }
                        }
                    }
                }
            else:
                return {'error': 'Domain not found'}
                
        except Exception as e:
            return {'error': str(e)}

    def route_message(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """
        Route message to appropriate handler based on action prefix
        
        Args:
            action: Action name (e.g. "discovery.module.list")
            payload: Message payload
            user_info: Authenticated user information
        """
        try:
            # Extract namespace from action (e.g. "discovery" from "discovery.module.list")
            namespace = action.split('.')[0]
            
            if namespace in self.routes:
                handler = self.routes[namespace]
                handler(action, payload, user_info)
            else:
                # Unknown namespace - send error response
                self.pub_service.publish_error(action, f"Unknown action namespace: {namespace}")
                
        except Exception as e:
            print(f"[MESSAGE] Error routing {action}: {e}")
            self.pub_service.publish_error(action, str(e))
    
    def _handle_discovery(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle discovery.* actions"""
        try:
            if action == "discovery.module.list":
                with self.db_service.get_session() as session:
                    modules = session.query(Module).filter(Module.is_active == True).all()
                    module_list = []
                    for module in modules:
                        # Get widgets for this module
                        widgets = session.query(Widget).filter(
                            Widget.module_id == module.id,
                            Widget.is_active == True
                        ).all()
                        
                        widget_names = [f"{module.name}@{widget.name}" for widget in widgets]
                        
                        module_list.append({
                            "id": module.name,
                            "name": module.display_name,
                            "description": module.description,
                            "version": module.version,
                            "category": module.category,
                            "widgets": widget_names
                        })
                    
                    self.pub_service.publish_response(action, {"modules": module_list})
                
            elif action == "discovery.page.list":
                with self.db_service.get_session() as session:
                    # TODO: Filter by user permissions and project
                    pages = session.query(Page).filter(Page.is_active == True).all()
                    page_list = []
                    for page in pages:
                        page_list.append({
                            "route": page.route,
                            "name": page.name,
                            "title": page.title,
                            "description": page.description,
                            "layout": page.layout_config or {"top": True, "main": True}
                        })
                    
                    self.pub_service.publish_response(action, {"pages": page_list})
                
            elif action == "discovery.widget.list":
                with self.db_service.get_session() as session:
                    modules = session.query(Module).filter(Module.is_active == True).all()
                    widget_packs = []
                    
                    for module in modules:
                        widgets = session.query(Widget).filter(
                            Widget.module_id == module.id,
                            Widget.is_active == True
                        ).all()
                        
                        components = {}
                        for widget in widgets:
                            components[widget.name] = {
                                "path": widget.component_path,
                                "props": widget.props_schema or {},
                                "config": widget.default_config or {}
                            }
                        
                        if components:  # Only add if module has widgets
                            widget_packs.append({
                                "id": f"widget-pack/{module.name}/ui/{str(module.id)}/1.0.0",
                                "name": f"{module.display_name} Widget Pack",
                                "module": module.name,
                                "type": "ui",
                                "projectId": str(module.id),
                                "version": "1.0.0",
                                "components": components
                            })
                    
                    self.pub_service.publish_response(action, {"widgetPacks": widget_packs})
                
            else:
                self.pub_service.publish_error(action, f"Unknown discovery action: {action}")
                
        except Exception as e:
            print(f"[MESSAGE] Discovery error: {e}")
            self.pub_service.publish_error(action, str(e))
    
    def _handle_user(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle user.* actions"""
        if action == "user.profile.get":
            self.pub_service.publish_response(action, {"user": user_info})
        else:
            self.pub_service.publish_error(action, f"Unknown user action: {action}")
    
    def _handle_chat(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle chat.* actions - route to chat service when available"""
        # For now, just echo back
        if action == "chat.send":
            message = payload.get("message", "")
            response = {
                "user": "assistant",
                "message": f"Echo: {message}",
                "timestamp": "2025-01-17T12:00:00Z"
            }
            self.pub_service.publish("chat.message", response)
        else:
            self.pub_service.publish_error(action, f"Chat service not implemented: {action}")
    
    def _handle_navigation(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle navigation.* actions"""
        try:
            if action == "navigation.menu.get":
                with self.db_service.get_session() as session:
                    # Get user from session
                    user_id = session_data.get('user_id') if session_data else None
                    
                    if user_id:
                        # Get user with role
                        user = session.query(User).filter(User.id == user_id).first()
                        
                        if user and user.role == UserRole.SUPERADMIN:
                            # Superadmin sees all pages
                            pages = session.query(Page).filter(Page.is_active == True).all()
                        else:
                            # Regular users see pages without permissions or pages they have access to
                            # For now, show pages without specific permissions
                            from models.page import page_permissions
                            pages_with_permissions = session.query(Page.id).join(page_permissions).distinct()
                            pages = session.query(Page).filter(
                                Page.is_active == True,
                                ~Page.id.in_(pages_with_permissions)
                            ).all()
                    else:
                        # No user session, show only public pages (none for now)
                        pages = []
                    
                    menu_items = []
                    for page in pages:
                        # Add icon based on page route
                        icon = "🏠"  # Default
                        if page.route == "/admin/theme-editor":
                            icon = "🎨"
                        elif page.route == "/test":
                            icon = "🧪"
                        elif page.route == "/":
                            icon = "🏠"
                        
                        menu_items.append({
                            "id": str(page.id),
                            "label": page.name,
                            "route": page.route,
                            "icon": icon,
                            "permissions": ["admin.theme.access"] if page.route == "/admin/theme-editor" else []
                        })
                    
                    self.pub_service.publish_response(action, {"menu": menu_items})
            else:
                self.pub_service.publish_error(action, f"Unknown navigation action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Navigation error: {e}")
            self.pub_service.publish_error(action, str(e))
    
    def _handle_user(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle user.* actions"""
        try:
            if action == "user.list":
                with self.db_service.get_session() as session:
                    users = session.query(User).all()
                    user_list = []
                    for user in users:
                        user_list.append({
                            "id": str(user.id),
                            "username": user.username,
                            "email": user.email,
                            "full_name": user.full_name,
                            "role": user.role.value,
                            "is_active": user.is_active,
                            "created_at": user.created_at.isoformat() if user.created_at else None
                        })
                    self.pub_service.publish_response(action, {"users": user_list})
            
            elif action == "user.get":
                user_id = payload.get("id")
                with self.db_service.get_session() as session:
                    user = session.query(User).filter(User.id == user_id).first()
                    if user:
                        user_data = {
                            "id": str(user.id),
                            "username": user.username,
                            "email": user.email,
                            "full_name": user.full_name,
                            "role": user.role.value,
                            "is_active": user.is_active,
                            "created_at": user.created_at.isoformat() if user.created_at else None
                        }
                        self.pub_service.publish_response(action, {"user": user_data})
                    else:
                        self.pub_service.publish_error(action, "User not found")
            
            elif action == "user.profile.get":
                self.pub_service.publish_response(action, {"user": user_info})
            
            else:
                self.pub_service.publish_error(action, f"Unknown user action: {action}")
        except Exception as e:
            print(f"[MESSAGE] User error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_group(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle group.* actions"""
        try:
            if action == "group.list":
                with self.db_service.get_session() as session:
                    groups = session.query(Group).all()
                    group_list = []
                    for group in groups:
                        group_list.append({
                            "id": str(group.id),
                            "name": group.name,
                            "description": group.description,
                            "is_active": group.is_active,
                            "created_at": group.created_at.isoformat() if group.created_at else None
                        })
                    self.pub_service.publish_response(action, {"groups": group_list})
            
            elif action == "group.get":
                group_id = payload.get("id")
                with self.db_service.get_session() as session:
                    group = session.query(Group).filter(Group.id == group_id).first()
                    if group:
                        group_data = {
                            "id": str(group.id),
                            "name": group.name,
                            "description": group.description,
                            "is_active": group.is_active,
                            "created_at": group.created_at.isoformat() if group.created_at else None
                        }
                        self.pub_service.publish_response(action, {"group": group_data})
                    else:
                        self.pub_service.publish_error(action, "Group not found")
            
            else:
                self.pub_service.publish_error(action, f"Unknown group action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Group error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_permission(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle permission.* actions"""
        try:
            if action == "permission.list":
                with self.db_service.get_session() as session:
                    permissions = session.query(Permission).all()
                    permission_list = []
                    for permission in permissions:
                        permission_list.append({
                            "id": str(permission.id),
                            "name": permission.name,
                            "description": permission.description,
                            "resource": permission.resource,
                            "action": permission.action,
                            "is_active": permission.is_active
                        })
                    self.pub_service.publish_response(action, {"permissions": permission_list})
            
            else:
                self.pub_service.publish_error(action, f"Unknown permission action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Permission error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_subscription(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle subscription.* actions"""
        try:
            if action == "subscription.list":
                with self.db_service.get_session() as session:
                    subscriptions = session.query(Subscription).all()
                    subscription_list = []
                    for subscription in subscriptions:
                        subscription_list.append({
                            "id": str(subscription.id),
                            "name": subscription.name,
                            "description": subscription.description,
                            "is_active": subscription.is_active,
                            "created_at": subscription.created_at.isoformat() if subscription.created_at else None
                        })
                    self.pub_service.publish_response(action, {"subscriptions": subscription_list})
            
            else:
                self.pub_service.publish_error(action, f"Unknown subscription action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Subscription error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_project(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle project.* actions"""
        try:
            if action == "project.list":
                with self.db_service.get_session() as session:
                    projects = session.query(Project).filter(Project.is_active == True).all()
                    project_list = []
                    for project in projects:
                        project_list.append({
                            "id": str(project.id),
                            "name": project.name,
                            "slug": project.slug,
                            "description": project.description,
                            "tenant_id": str(project.tenant_id),
                            "is_active": project.is_active,
                            "created_at": project.created_at.isoformat() if project.created_at else None
                        })
                    self.pub_service.publish_response(action, {"projects": project_list})
            
            elif action == "project.get":
                project_id = payload.get("id")
                with self.db_service.get_session() as session:
                    project = session.query(Project).filter(Project.id == project_id).first()
                    if project:
                        project_data = {
                            "id": str(project.id),
                            "name": project.name,
                            "slug": project.slug,
                            "description": project.description,
                            "tenant_id": str(project.tenant_id),
                            "is_active": project.is_active,
                            "created_at": project.created_at.isoformat() if project.created_at else None
                        }
                        self.pub_service.publish_response(action, {"project": project_data})
                    else:
                        self.pub_service.publish_error(action, "Project not found")
            
            else:
                self.pub_service.publish_error(action, f"Unknown project action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Project error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_tenant(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle tenant.* actions"""
        try:
            if action == "tenant.list":
                with self.db_service.get_session() as session:
                    tenants = session.query(Tenant).filter(Tenant.is_active == True).all()
                    tenant_list = []
                    for tenant in tenants:
                        tenant_list.append({
                            "id": str(tenant.id),
                            "name": tenant.name,
                            "slug": tenant.slug,
                            "description": tenant.description,
                            "is_active": tenant.is_active,
                            "created_at": tenant.created_at.isoformat() if tenant.created_at else None
                        })
                    self.pub_service.publish_response(action, {"tenants": tenant_list})
            
            else:
                self.pub_service.publish_error(action, f"Unknown tenant action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Tenant error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_partner(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle partner.* actions"""
        try:
            if action == "partner.list":
                with self.db_service.get_session() as session:
                    partners = session.query(Partner).filter(Partner.is_active == True).all()
                    partner_list = []
                    for partner in partners:
                        partner_list.append({
                            "id": str(partner.id),
                            "name": partner.name,
                            "slug": partner.slug,
                            "description": partner.description,
                            "is_active": partner.is_active,
                            "created_at": partner.created_at.isoformat() if partner.created_at else None
                        })
                    self.pub_service.publish_response(action, {"partners": partner_list})
            
            else:
                self.pub_service.publish_error(action, f"Unknown partner action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Partner error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_module(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle module.* actions"""
        try:
            if action == "module.list":
                with self.db_service.get_session() as session:
                    modules = session.query(Module).filter(Module.is_active == True).all()
                    module_list = []
                    for module in modules:
                        widgets = session.query(Widget).filter(
                            Widget.module_id == module.id,
                            Widget.is_active == True
                        ).all()
                        
                        widget_names = [f"{module.name}@{widget.name}" for widget in widgets]
                        
                        module_list.append({
                            "id": str(module.id),
                            "name": module.name,
                            "display_name": module.display_name,
                            "description": module.description,
                            "version": module.version,
                            "category": module.category,
                            "service_url": module.service_url,
                            "is_system": module.is_system,
                            "widgets": widget_names
                        })
                    self.pub_service.publish_response(action, {"modules": module_list})
            
            else:
                self.pub_service.publish_error(action, f"Unknown module action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Module error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_widget(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle widget.* actions"""
        try:
            if action == "widget.list":
                with self.db_service.get_session() as session:
                    widgets = session.query(Widget).filter(Widget.is_active == True).all()
                    widget_list = []
                    for widget in widgets:
                        module = session.query(Module).filter(Module.id == widget.module_id).first()
                        widget_list.append({
                            "id": str(widget.id),
                            "name": widget.name,
                            "display_name": widget.display_name,
                            "description": widget.description,
                            "component_path": widget.component_path,
                            "module_name": module.name if module else None,
                            "props_schema": widget.props_schema,
                            "default_config": widget.default_config
                        })
                    self.pub_service.publish_response(action, {"widgets": widget_list})
            
            elif action == "widget.registry":
                with self.db_service.get_session() as session:
                    modules = session.query(Module).filter(Module.is_active == True).all()
                    widget_packs = []
                    
                    for module in modules:
                        widgets = session.query(Widget).filter(
                            Widget.module_id == module.id,
                            Widget.is_active == True
                        ).all()
                        
                        components = {}
                        for widget in widgets:
                            components[widget.name] = {
                                "path": widget.component_path,
                                "props": widget.props_schema or {},
                                "config": widget.default_config or {}
                            }
                        
                        if components:
                            widget_packs.append({
                                "id": f"widget-pack/{module.name}/ui/{str(module.id)}/1.0.0",
                                "name": f"{module.display_name} Widget Pack",
                                "module": module.name,
                                "components": components
                            })
                    
                    self.pub_service.publish_response(action, {"widgetPacks": widget_packs})
            
            else:
                self.pub_service.publish_error(action, f"Unknown widget action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Widget error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_page(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle page.* actions"""
        try:
            if action == "page.list":
                with self.db_service.get_session() as session:
                    pages = session.query(Page).filter(Page.is_active == True).all()
                    page_list = []
                    for page in pages:
                        page_list.append({
                            "id": str(page.id),
                            "route": page.route,
                            "name": page.name,
                            "title": page.title,
                            "description": page.description,
                            "layout_config": page.layout_config,
                            "is_active": page.is_active
                        })
                    self.pub_service.publish_response(action, {"pages": page_list})
            
            elif action == "page.get":
                route = payload.get("route")
                with self.db_service.get_session() as session:
                    page = session.query(Page).filter(Page.route == route, Page.is_active == True).first()
                    if page:
                        page_data = {
                            "id": str(page.id),
                            "route": page.route,
                            "name": page.name,
                            "title": page.title,
                            "description": page.description,
                            "layout_config": page.layout_config,
                            "is_active": page.is_active
                        }
                        self.pub_service.publish_response(action, {"page": page_data})
                    else:
                        self.pub_service.publish_error(action, f"Page not found: {route}")
            
            else:
                self.pub_service.publish_error(action, f"Unknown page action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Page error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_dashboard(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle dashboard.* actions"""
        try:
            if action == "dashboard.stats.get":
                with self.db_service.get_session() as session:
                    user_count = session.query(User).count()
                    module_count = session.query(Module).filter(Module.is_active == True).count()
                    page_count = session.query(Page).filter(Page.is_active == True).count()
                    project_count = session.query(Project).filter(Project.is_active == True).count()
                    
                    stats = {
                        "users": user_count,
                        "modules": module_count,
                        "pages": page_count,
                        "projects": project_count
                    }
                    self.pub_service.publish_response(action, {"stats": stats})
            else:
                self.pub_service.publish_error(action, f"Unknown dashboard action: {action}")
        except Exception as e:
            print(f"[MESSAGE] Dashboard error: {e}")
            self.pub_service.publish_error(action, str(e))

    def _handle_theme(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle theme.* actions"""
        try:
            if action == "theme.list":
                themes = self.theme_service.list_themes(user_info)
                self.pub_service.publish_response(action, {"themes": themes})
            
            elif action == "theme.get":
                theme_id = payload.get("id")
                if not theme_id:
                    self.pub_service.publish_error(action, "Theme ID required")
                    return
                
                theme = self.theme_service.get_theme(theme_id, user_info)
                if theme:
                    self.pub_service.publish_response(action, {"theme": theme})
                else:
                    self.pub_service.publish_error(action, "Theme not found")
            
            elif action == "theme.create":
                theme_data = payload.get("theme")
                if not theme_data:
                    self.pub_service.publish_error(action, "Theme data required")
                    return
                
                theme_id = self.theme_service.create_theme(theme_data, user_info)
                self.pub_service.publish_response(action, {"theme_id": theme_id, "message": "Theme created successfully"})
            
            elif action == "theme.update":
                theme_id = payload.get("id")
                theme_data = payload.get("theme")
                if not theme_id or not theme_data:
                    self.pub_service.publish_error(action, "Theme ID and data required")
                    return
                
                success = self.theme_service.update_theme(theme_id, theme_data, user_info)
                if success:
                    self.pub_service.publish_response(action, {"message": "Theme updated successfully"})
                else:
                    self.pub_service.publish_error(action, "Failed to update theme")
            
            elif action == "theme.delete":
                theme_id = payload.get("id")
                if not theme_id:
                    self.pub_service.publish_error(action, "Theme ID required")
                    return
                
                success = self.theme_service.delete_theme(theme_id, user_info)
                if success:
                    self.pub_service.publish_response(action, {"message": "Theme deleted successfully"})
                else:
                    self.pub_service.publish_error(action, "Failed to delete theme")
            
            elif action == "theme.preferences.get":
                project_id = payload.get("project_id")
                preferences = self.theme_service.get_user_preferences(user_info, project_id)
                self.pub_service.publish_response(action, {"preferences": preferences})
            
            elif action == "theme.preferences.set":
                theme_id = payload.get("theme_id")
                project_id = payload.get("project_id")
                if not theme_id:
                    self.pub_service.publish_error(action, "Theme ID required")
                    return
                
                success = self.theme_service.set_user_theme_preference(theme_id, user_info, project_id)
                if success:
                    self.pub_service.publish_response(action, {"message": "Theme preference updated successfully"})
                else:
                    self.pub_service.publish_error(action, "Failed to update theme preference")
            
            elif action == "theme.export":
                theme_id = payload.get("id")
                if not theme_id:
                    self.pub_service.publish_error(action, "Theme ID required")
                    return
                
                export_data = self.theme_service.export_theme(theme_id, user_info)
                self.pub_service.publish_response(action, {"export": export_data})
            
            elif action == "theme.import":
                theme_data = payload.get("theme")
                if not theme_data:
                    self.pub_service.publish_error(action, "Theme data required")
                    return
                
                theme_id = self.theme_service.import_theme(theme_data, user_info)
                self.pub_service.publish_response(action, {"theme_id": theme_id, "message": "Theme imported successfully"})
            
            else:
                self.pub_service.publish_error(action, f"Unknown theme action: {action}")
                
        except Exception as e:
            print(f"[MESSAGE] Theme error: {e}")
            self.pub_service.publish_error(action, str(e))