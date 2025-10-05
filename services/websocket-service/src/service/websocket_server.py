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
        Clients receive JSON progress updates from the analyzer.
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
        # Send initial state
        await websocket.send(json.dumps(self.progress_state))
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

    async def api_server(self, reader, writer):
        """
        Lightweight internal API for the Analyzer service.
        Accepts JSON lines like: {"percent": 42, "api_key": "..."}
        """
        data = await reader.readline()
        try:
            msg = json.loads(data.decode("utf-8"))
            if msg.get("api_key") != self.api_key:
                writer.close()
                return
            percent = int(msg.get("percent", 0))
            await self.broadcast_progress(percent)
        except Exception:
            pass
        finally:
            writer.close()

    async def run(self):
        ws_server = await websockets.serve(self.handler, self.host, self.port)
        print(f"[WS] Listening on ws://{self.host}:{self.port}/progress")
        server = await asyncio.start_server(self.api_server, self.host, self.port + 1)
        async with ws_server, server:
            await asyncio.gather(ws_server.wait_closed(), server.serve_forever())
