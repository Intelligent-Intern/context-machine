import asyncio
import os
from service.websocket_server import WebSocketServer

def main():
    api_key = os.getenv("API_KEY", "changeme")
    host = os.getenv("WS_HOST", "0.0.0.0")
    port = int(os.getenv("WS_PORT", "3010"))

    print(f"[WS] Starting WebSocket service on ws://{host}:{port} (internal push on {port + 1})")

    server = WebSocketServer(host=host, port=port, api_key=api_key)
    asyncio.run(server.run())

if __name__ == "__main__":
    main()
