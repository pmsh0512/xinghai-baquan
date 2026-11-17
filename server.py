import asyncio
import websockets
import http.server
import socketserver
import threading
import json
import socket
import os

# ================= 配置 =================
PORT_HTTP = int(input("请输入网址端口号："))
PORT_WS = int(input("请输入ws端口号："))
# =======================================

# 房间管理结构：
# { room_id: {
#     "host": ws, "host_pid": str, "host_name": str,
#     "name": str, "started": bool,
#     "clients": { ws: player_id }
# } }
rooms = {}


def room_public(rid, r):
    ids = []
    if r.get("host_pid"):
        ids.append(r["host_pid"])
    for pid in r["clients"].values():
        if pid:
            ids.append(pid)
    return {
        "id": rid,
        "name": r.get("name") or rid,
        "host": r.get("host_name") or "",
        "ids": ids,
        "count": len(ids),
        "started": bool(r.get("started")),
    }


async def send_json(websocket, obj):
    try:
        await websocket.send(json.dumps(obj, ensure_ascii=False))
    except Exception:
        pass


async def ws_handler(websocket, path=None):
    room_id = None
    role = None
    player_id = None
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
            except Exception:
                continue
            t = data.get("t")

            # 0. 大厅：拉取房间列表（无需先 join）
            if t == "listRooms":
                room_list = [room_public(rid, r) for rid, r in rooms.items() if r.get("host")]
                await send_json(websocket, {"t": "rooms", "rooms": room_list})
                continue

            # 1. 处理入房请求
            if t == "join":
                room_id = data.get("roomId")
                role = data.get("role") or "client"
                player_id = data.get("playerId") or data.get("_sender") or ""
                name = data.get("name") or ""
                room_name = data.get("roomName") or ""
                if not room_id:
                    continue

                if room_id not in rooms:
                    rooms[room_id] = {
                        "host": None, "host_pid": "", "host_name": "",
                        "name": room_id, "started": False, "clients": {},
                    }
                r = rooms[room_id]

                if role == "host":
                    r["host"] = websocket
                    r["host_pid"] = player_id or "p1"
                    r["host_name"] = name or r["host_pid"]
                    if room_name:
                        r["name"] = room_name
                    elif r["name"] == room_id and name:
                        r["name"] = name
                    r["started"] = False
                    print(f"[房间 {room_id}] 房主已连接（{r['name']}）")
                else:
                    r["clients"][websocket] = player_id
                    print(f"[房间 {room_id}] 客户端 {player_id} 已连接，当前人数: {len(r['clients'])}")
                continue

            # 2. 房主更新房间元数据（房名 / 是否已开局）
            if t == "roomMeta" and role == "host" and room_id in rooms:
                r = rooms[room_id]
                if data.get("name"):
                    r["name"] = data["name"]
                if "started" in data:
                    r["started"] = bool(data["started"])
                continue

            # 3. 消息转发
            if room_id in rooms:
                r = rooms[room_id]
                if role == "host":
                    target = data.get("to")
                    if target:
                        # 定向发送（增量快照按玩家下发等）
                        for c, cid in list(r["clients"].items()):
                            if cid == target:
                                try:
                                    await c.send(message)
                                except Exception:
                                    pass
                    else:
                        # 房主发给所有客户端（快照、状态同步等）
                        for c in list(r["clients"].keys()):
                            try:
                                await c.send(message)
                            except Exception:
                                pass
                elif role == "client":
                    # 客户端发给房主（操作指令、加入握手等）
                    host = r.get("host")
                    if host:
                        try:
                            await host.send(message)
                        except Exception:
                            pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        # 断开清理
        if room_id and room_id in rooms:
            r = rooms[room_id]
            if role == "host":
                r["host"] = None
                print(f"[房间 {room_id}] 房主已断开")
                for c in list(r["clients"].keys()):
                    await send_json(c, {"t": "hostLeft"})
                    try:
                        await c.close()
                    except Exception:
                        pass
                r["clients"].clear()
            else:
                r["clients"].pop(websocket, None)
                print(f"[房间 {room_id}] 客户端已断开，当前人数: {len(r['clients'])}")
            # 如果房间空了就删掉
            if not r["host"] and not r["clients"]:
                del rooms[room_id]


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # 局域网内频繁迭代，统一禁用缓存，避免浏览器继续用旧脚本
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        # 允许其他端口的页面读取本服务器的端口配置（端口扫描发现用）
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        # 把本次实际使用的端口告诉网页，前端据此自动生成 WS 地址
        path = self.path.split("?")[0]
        if path in ("/net-config.js", "/net-config.json"):
            cfg = {"httpPort": PORT_HTTP, "wsPort": PORT_WS}
            if path == "/net-config.js":
                body = ("window.__NET_CFG = " + json.dumps(cfg) + ";").encode("utf-8")
                ctype = "application/javascript; charset=utf-8"
            else:
                body = json.dumps(cfg).encode("utf-8")
                ctype = "application/json; charset=utf-8"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


async def main():
    # 启动 HTTP 静态文件服务（后台线程运行）
    handler = NoCacheHandler
    httpd = ThreadingHTTPServer(("", PORT_HTTP), handler)
    t = threading.Thread(target=httpd.serve_forever)
    t.daemon = True
    t.start()

    # 自动获取局域网 IP
    hostname = socket.gethostname()
    try:
        ips = socket.gethostbyname_ex(hostname)[2]
    except Exception:
        ips = []
    local_ips = [ip for ip in ips if not ip.startswith("127.")]

    print("=" * 60)
    print("星海霸权 局域网服务器已启动")
    print(f"本机访问: http://localhost:{PORT_HTTP}")
    for ip in local_ips:
        print(f"局域网访问: http://{ip}:{PORT_HTTP}")
        print(f"WS 地址填: ws://{ip}:{PORT_WS}")
    print("=" * 60)
    print("按 Ctrl+C 退出服务器。\n")

    # 启动 WebSocket 服务器
    async with websockets.serve(ws_handler, "0.0.0.0", PORT_WS):
        await asyncio.Future()  # 永久运行


if __name__ == "__main__":
    pwd=""
    while(pwd!="B768539sk"):
        pwd=input("Please enter password")
    os.system("cls")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n服务器已关闭。")
