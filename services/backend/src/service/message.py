from typing import Dict, Any
import time
from datetime import datetime
from .pub import PubService
from .database import DatabaseService
from models import Module, Page, Widget, User, Group, Permission, Subscription, Project, Tenant, Partner
from models.user import UserRole
from models.page import PageModule, PageWidget, LayoutRegion

class MessageService:
    """Message routing service for unified /api/message endpoint"""
    
    def __init__(self):
        self.pub_service = PubService()
        self.db_service = DatabaseService()
        
        # Define routing table for direct message handlers
        self.direct_handlers = {
            'navigation': self._handle_navigation,
            'page': self._handle_page
        }
        
        # AMQP connection for complex workflows
        self.amqp_connection = None
        self._init_amqp()
    
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
        Route message to appropriate handler - direct or via AMQP
        
        Args:
            action: Action name (e.g. "navigation.items.get")
            payload: Message payload
            user_info: Authenticated user information
        """
        try:
            # Extract namespace from action (e.g. "navigation" from "navigation.items.get")
            namespace = action.split('.')[0]
            
            # Check if we have a direct handler
            if namespace in self.direct_handlers:
                print(f"[MESSAGE] Handling {action} directly")
                handler = self.direct_handlers[namespace]
                handler(action, payload, user_info)
            else:
                # No direct handler - send to AMQP for workflow processing
                print(f"[MESSAGE] Sending {action} to AMQP workflow")
                self._send_to_amqp(action, payload, user_info)
                
        except Exception as e:
            print(f"[MESSAGE] Error routing {action}: {e}")
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
                    # Get page with all its modules and widgets
                    page = session.query(Page).filter(Page.route == route, Page.is_active == True).first()
                    if page:
                        # Build layout config dynamically from database
                        layout_config = self._build_dynamic_layout_config(session, page.id)
                        
                        page_data = {
                            "id": str(page.id),
                            "route": page.route,
                            "name": page.name,
                            "title": page.title,
                            "description": page.description,
                            "layout_config": layout_config,
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
    
    def _build_dynamic_layout_config(self, session, page_id: str):
        """Build layout config dynamically from database structure"""
        
        # Get all page modules with their widgets
        page_modules = session.query(PageModule, Module).join(Module).filter(
            PageModule.page_id == page_id
        ).order_by(PageModule.display_order).all()
        
        # Build layout structure
        layout_regions = {}
        widget_registry = {}
        
        for page_module, module in page_modules:
            region = page_module.layout_region.value.lower()
            
            # Get widgets for this page module
            page_widgets = session.query(PageWidget, Widget).join(Widget).filter(
                PageWidget.page_module_id == page_module.id
            ).order_by(PageWidget.display_order).all()
            
            if region not in layout_regions:
                layout_regions[region] = []
            
            for page_widget, widget in page_widgets:
                widget_ref = f"{module.name}@{widget.name}"
                layout_regions[region].append(widget_ref)
                
                # Add to widget registry for frontend
                if module.name not in widget_registry:
                    widget_registry[module.name] = {}
                widget_registry[module.name][widget.name] = {
                    "id": str(widget.id),
                    "name": widget.name,
                    "component_path": widget.component_path or widget_ref
                }
        
        # Build bars config (determine which regions are active)
        bars = {
            "t": 2 if "top" in layout_regions and layout_regions["top"] else 0,
            "b": 2 if "bottom" in layout_regions and layout_regions["bottom"] else 0,
            "l": 2 if "left" in layout_regions and layout_regions["left"] else 0,
            "r": 2 if "right" in layout_regions and layout_regions["right"] else 0
        }
        
        # Build ports config
        ports = {}
        region_mapping = {"top": "t", "bottom": "b", "left": "l", "right": "r", "main": "m"}
        
        for region, widgets in layout_regions.items():
            port_key = region_mapping.get(region, region[0])
            ports[port_key] = widgets
        
        return {
            "bars": bars,
            "ports": ports,
            "widgets": widget_registry
        }
    
    def _init_amqp(self):
        """Initialize AMQP connection for workflow processing"""
        try:
            import pika
            import os
            
            # AMQP connection parameters
            amqp_url = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672/')
            
            # Try to connect to RabbitMQ
            connection = pika.BlockingConnection(pika.URLParameters(amqp_url))
            channel = connection.channel()
            
            # Declare exchange for workflows
            channel.exchange_declare(exchange='workflows', exchange_type='topic')
            
            self.amqp_connection = connection
            self.amqp_channel = channel
            
            print("[MESSAGE] AMQP connection established")
            
        except Exception as e:
            print(f"[MESSAGE] AMQP connection failed: {e}")
            self.amqp_connection = None
    
    def _send_to_amqp(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Send message to AMQP for workflow processing"""
        try:
            if not self.amqp_connection:
                print(f"[MESSAGE] No AMQP connection - cannot process {action}")
                self.pub_service.publish_error(action, "Workflow service unavailable")
                return
            
            import json
            
            # Create workflow message
            workflow_message = {
                "action": action,
                "payload": payload,
                "user_info": user_info,
                "timestamp": str(datetime.utcnow()),
                "correlation_id": f"{action}_{int(time.time())}"
            }
            
            # Send to workflows exchange with routing key based on action
            routing_key = action.replace('.', '_')
            
            self.amqp_channel.basic_publish(
                exchange='workflows',
                routing_key=routing_key,
                body=json.dumps(workflow_message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                    content_type='application/json'
                )
            )
            
            print(f"[MESSAGE] Sent {action} to AMQP workflow with routing key: {routing_key}")
            
        except Exception as e:
            print(f"[MESSAGE] Error sending to AMQP: {e}")
            self.pub_service.publish_error(action, f"Workflow processing failed: {str(e)}")
    
    def _handle_navigation(self, action: str, payload: Dict[str, Any], user_info: Dict[str, Any]):
        """Handle navigation.* actions directly"""
        try:
            if action == "navigation.items.get":
                # Load navigation items from database
                nav_items = self._get_navigation_items_from_db(user_info)
                
                # Send response via pub/sub
                self.pub_service.publish("navigation.items.response", {
                    "items": nav_items,
                    "context": payload.get("context", "unknown")
                })
                
                print(f"[MESSAGE] Navigation items sent: {len(nav_items)} items")
                
            else:
                self.pub_service.publish_error(action, f"Unknown navigation action: {action}")
                
        except Exception as e:
            print(f"[MESSAGE] Navigation error: {e}")
            self.pub_service.publish_error(action, str(e))
    
    def _get_navigation_items_from_db(self, user_info: Dict[str, Any]) -> list:
        """Load navigation items from database pages"""
        try:
            with self.db_service.get_session() as session:
                from models import Page, Module
                
                # Get all active pages that have corresponding modules
                pages = session.query(Page).filter(
                    Page.is_active == True
                ).order_by(Page.display_order, Page.name).all()
                
                nav_items = []
                for page in pages:
                    # Only include pages that have working modules
                    if self._page_has_working_module(session, page):
                        nav_item = {
                            "id": page.route.replace('/', '') or 'home',
                            "name": page.name,
                            "route": page.route,
                            "icon": self._get_icon_for_route(page.route),
                            "order": page.display_order or 0
                        }
                        
                        # Filter based on user role
                        if self._user_can_access_page(page, user_info):
                            nav_items.append(nav_item)
                
                # Add logout button at the end
                nav_items.append({
                    "id": "logout",
                    "name": "Logout",
                    "route": "/logout",
                    "icon": "🚪",
                    "order": 999
                })
                
                return nav_items
                
        except Exception as e:
            print(f"[MESSAGE] Error loading navigation from DB: {e}")
            # Fallback to basic items
            return [
                {"id": "home", "name": "Home", "route": "/", "icon": "🏠", "order": 1},
                {"id": "logout", "name": "Logout", "route": "/logout", "icon": "🚪", "order": 999}
            ]
    
    def _get_icon_for_route(self, route: str) -> str:
        """Get appropriate icon for route"""
        icon_map = {
            '/': '🏠',
            '/dashboard': '📊', 
            '/test': '🧪',
            '/admin/theme-editor': '🎨',
            '/theme-editor': '🎨',
            '/settings': '⚙️'
        }
        return icon_map.get(route, '📄')
    
    def _page_has_working_module(self, session, page) -> bool:
        """Check if page has a working module (not theme/test modules)"""
        # For now, only allow the home page (/) since we know it works
        # Other pages need proper module implementations
        return page.route == '/'
    
    def _user_can_access_page(self, page, user_info: Dict[str, Any]) -> bool:
        """Check if user can access this page"""
        user_role = user_info.get('role', 'USER')
        
        # Admin routes only for SUPERADMIN
        if '/admin/' in page.route and user_role != 'SUPERADMIN':
            return False
            
        # All other pages are accessible
        return True