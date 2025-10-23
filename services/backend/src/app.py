import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger
from service.auth import AuthService
from service.message import MessageService
from service.pub import PubService
from service.migration import MigrationService

app = Flask(__name__)

# Enable CORS for frontend communication
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8080", "http://127.0.0.1:8080"], 
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

# Swagger configuration
swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "Context Machine Backend API",
        "description": "Lightweight API Gateway for Context Machine Frontend",
        "version": "1.0.0"
    },
    "basePath": "/",
    "schemes": ["http"],
    "securityDefinitions": {
        "BearerAuth": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Bearer token authentication"
        }
    },
    "security": [{"BearerAuth": []}]
}

swagger = Swagger(app, template=swagger_template)

# Initialize services
auth_service = AuthService()
message_service = MessageService()
pub_service = PubService()

@app.route('/api/health')
def health():
    """
    Health check endpoint
    ---
    tags:
      - System
    responses:
      200:
        description: Service is healthy
        schema:
          type: object
          properties:
            status:
              type: string
              example: ok
    """
    return {'status': 'ok'}

@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    User login
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: credentials
        description: Login credentials
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              example: admin
            password:
              type: string
              example: admin123
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            token:
              type: string
            user:
              type: object
            config:
              type: object
      401:
        description: Invalid credentials
      400:
        description: Bad request
    """
    try:
        data = request.json
        if not data or not data.get('username') or not data.get('password'):
            return {'error': 'Username and password required'}, 400
        
        result = auth_service.login(data['username'], data['password'])
        
        if result:
            return result
        else:
            return {'error': 'Invalid credentials'}, 401
            
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """
    Forgot password request (no auth required)
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: forgot_data
        description: Forgot password data
        required: true
        schema:
          type: object
          required:
            - username
          properties:
            username:
              type: string
              example: admin
    responses:
      200:
        description: Password reset email sent
        schema:
          type: object
          properties:
            message:
              type: string
              example: Password reset instructions sent
      400:
        description: Bad request
      404:
        description: User not found
    """
    try:
        data = request.json
        if not data or not data.get('username'):
            return {'error': 'Username required'}, 400
        
        result = auth_service.forgot_password(data['username'])
        
        if result:
            return {'message': 'Password reset instructions sent'}, 200
        else:
            return {'error': 'User not found'}, 404
            
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """
    User registration
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: user_data
        description: Registration data
        required: true
        schema:
          type: object
          required:
            - username
            - email
            - password
          properties:
            username:
              type: string
              example: newuser
            email:
              type: string
              example: user@example.com
            password:
              type: string
              example: password123
            full_name:
              type: string
              example: John Doe
    responses:
      201:
        description: Registration successful
        schema:
          type: object
          properties:
            message:
              type: string
            user_id:
              type: string
      400:
        description: Bad request or user already exists
      500:
        description: Internal server error
    """
    try:
        data = request.json
        if not data or not all(k in data for k in ['username', 'email', 'password']):
            return {'error': 'Username, email and password required'}, 400
        
        result = auth_service.register(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            full_name=data.get('full_name')
        )
        
        if result:
            return {'message': 'Registration successful', 'user_id': result}, 201
        else:
            return {'error': 'Registration failed'}, 400
            
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/api/config', methods=['GET'])
def get_public_config():
    """
    Get public configuration (no auth required)
    ---
    tags:
      - Configuration
    parameters:
      - in: query
        name: origin
        type: string
        description: Frontend origin URL
        example: http://localhost:5173
    responses:
      200:
        description: Public configuration
        schema:
          type: object
          properties:
            project:
              type: object
              properties:
                name:
                  type: string
                  example: Context Machine
                theme:
                  type: object
            widgetPacks:
              type: array
              items:
                type: object
            pages:
              type: object
              properties:
                login:
                  type: object
    """
    try:
        origin = request.args.get('origin', 'http://localhost:5173')
        
        # Get public config from message service
        config = message_service.get_public_config(origin)
        
        return config
        
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/api/message', methods=['POST'])
def handle_message():
    """
    Unified message endpoint
    ---
    tags:
      - Messages
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: messages
        description: Array of messages to process
        required: true
        schema:
          type: array
          items:
            type: object
            required:
              - a
              - p
            properties:
              a:
                type: string
                description: Action name (e.g. "chat.send")
                example: "discovery.module.list"
              p:
                type: object
                description: Action payload
                example: {}
    responses:
      200:
        description: Messages processed
        schema:
          type: object
          properties:
            status:
              type: string
              example: processed
      401:
        description: Unauthorized
      400:
        description: Bad request
    """
    try:
        # Validate JWT token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return {'error': 'Authorization header required'}, 401
        
        token = auth_header.split(' ')[1]
        user_info = auth_service.validate_token(token)
        
        if not user_info:
            return {'error': 'Invalid token'}, 401
        
        # Process messages
        messages = request.json
        if not isinstance(messages, list):
            return {'error': 'Messages must be an array'}, 400
        
        for message in messages:
            if not isinstance(message, dict) or 'a' not in message or 'p' not in message:
                return {'error': 'Invalid message format'}, 400
            
            # Route message to appropriate service
            message_service.route_message(message['a'], message['p'], user_info)
        
        return {'status': 'processed'}
        
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/openapi.json')
def openapi_spec():
    """
    OpenAPI specification
    ---
    tags:
      - System
    responses:
      200:
        description: OpenAPI specification
    """
    spec = swagger.get_apispecs()
    return jsonify(spec)

if __name__ == '__main__':
    # Setup database on startup
    try:
        migration_service = MigrationService()
        migration_service.setup_database()
        print("[APP] Database setup complete")
    except Exception as e:
        print(f"[APP] Database setup failed: {e}")
    
    # Start Flask app
    port = int(os.getenv('BACKEND_PORT', 3006))
    app.run(host='0.0.0.0', port=port, debug=True)