import asyncio
import json
import websockets


class WebSocketServer:
    def __init__(self, host: str, port: int, api_key: str):
        self.host = host
        self.port = port
        self.api_key = api_key
        self.connected_clients = set()
        self.progress_state = {"percent": 0}

    async def handler(self, websocket):
        """
        Handle incoming WebSocket connections from the frontend.
        Clients receive JSON messages from backend services.
        """
        query = {}
        if "?" in websocket.path:
            try:
                query = dict(qc.split("=", 1) for qc in websocket.path.split("?")[1].split("&"))
            except Exception:
                query = {}

        if query.get("api_key") != self.api_key:
            await websocket.close(code=4001, reason="unauthorized")
            return

        self.connected_clients.add(websocket)
        # Don't send initial progress state - only send real messages
        try:
            async for _ in websocket:
                # push-only server: ignore client messages
                pass
        finally:
            self.connected_clients.remove(websocket)

    async def broadcast_progress(self, percent: int):
        """Send progress update to all connected clients."""
        if percent != self.progress_state["percent"]:
            self.progress_state["percent"] = percent
            message = json.dumps({"percent": percent})
            if self.connected_clients:
                await asyncio.gather(
                    *(ws.send(message) for ws in self.connected_clients if ws.open)
                )

    async def broadcast_message(self, action: str, payload: dict):
        """Send general message to all connected clients."""
        message = json.dumps({"a": action, "p": payload})
        if self.connected_clients:
            await asyncio.gather(
                *(ws.send(message) for ws in self.connected_clients if ws.open)
            )
            print(f"[WS] Broadcasted message: {action} to {len(self.connected_clients)} clients")

    async def api_server(self, reader, writer):
        """
        Lightweight internal API for backend services.
        Accepts JSON lines like: 
        - {"percent": 42, "api_key": "..."}  (progress updates)
        - {"a": "navigation.items.response", "p": {...}, "api_key": "..."}  (general messages)
        """
        data = await reader.readline()
        try:
            msg = json.loads(data.decode("utf-8"))
            if msg.get("api_key") != self.api_key:
                writer.close()
                return
            
            # Handle progress updates (legacy)
            if "percent" in msg:
                percent = int(msg.get("percent", 0))
                await self.broadcast_progress(percent)
            
            # Handle general messages (new)
            elif "a" in msg and "p" in msg:
                action = msg["a"]
                payload = msg["p"]
                await self.broadcast_message(action, payload)
                
        except Exception as e:
            print(f"[WS] Error processing message: {e}")
        finally:
            writer.close()

    async def run(self):
        ws_server = await websockets.serve(self.handler, self.host, self.port)
        print(f"[WS] Listening on ws://{self.host}:{self.port}/progress")
        server = await asyncio.start_server(self.api_server, self.host, self.port + 1)
        async with ws_server, server:
            await asyncio.gather(ws_server.wait_closed(), server.serve_forever())
