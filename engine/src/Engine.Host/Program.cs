using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Force HTTP (no HTTPS dev cert needed for WS testing)
        builder.WebHost.UseUrls("http://localhost:5055");

        var app = builder.Build();

        app.UseWebSockets();

        var clients = new List<WebSocket>();

        app.MapGet("/", () => "Engine.Host running. Use /ws for WebSocket.");

        app.Map("/ws", async context =>
        {
            Console.WriteLine($"[WS] Incoming request: {context.Request.Method} {context.Request.Path} IsWebSocketRequest={context.WebSockets.IsWebSocketRequest}");

            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = 400;
                await context.Response.WriteAsync("Expected WebSocket request.");

                Console.WriteLine("[WS] Not a WebSocket request. Returning 400.");

                return;
            }

            using var ws = await context.WebSockets.AcceptWebSocketAsync();
            clients.Add(ws);

            await SendJson(ws, new
            {
                type = "status",
                connected = true,
                listening = false,
                message = "Connected to Engine.Host"
            });

            var buffer = new byte[16 * 1024];

            try
            {
                while (ws.State == WebSocketState.Open)
                {
                    WebSocketReceiveResult result;

                    try
                    {
                        result = await ws.ReceiveAsync(buffer, CancellationToken.None);
                    }
                    catch (WebSocketException ex)
                    {
                        // Common in dev when the browser refreshes / StrictMode remounts.
                        Console.WriteLine($"[WS] ReceiveAsync WebSocketException: {ex.Message}");
                        break;
                    }

                    if (result.MessageType == WebSocketMessageType.Close)
                        break;

                    var json = Encoding.UTF8.GetString(buffer, 0, result.Count);

                    try
                    {
                        using var doc = JsonDocument.Parse(json);
                        var type = doc.RootElement.GetProperty("type").GetString();

                        if (type == "cmd_test_phrase")
                        {
                            var text = doc.RootElement.GetProperty("text").GetString() ?? "";
                            await Broadcast(clients, new { type = "final_transcript", text });
                        }
                        else if (type == "cmd_start_listening")
                        {
                            await Broadcast(clients, new { type = "status", listening = true });
                        }
                        else if (type == "cmd_stop_listening")
                        {
                            await Broadcast(clients, new { type = "status", listening = false });
                        }
                        else
                        {
                            await SendJson(ws, new { type = "error", message = $"Unknown command: {type}" });
                        }
                    }
                    catch
                    {
                        await SendJson(ws, new { type = "error", message = "Invalid JSON command" });
                    }
                }
            }
            finally
            {
                clients.Remove(ws);
                try
                {
                    if (ws.State == WebSocketState.Open)
                    {
                        await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
                    }
                }
                catch
                {
                    // Ignore close handshake issues
                }
            }
        });

        app.Run();
    }

    private static async Task SendJson(WebSocket ws, object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var bytes = Encoding.UTF8.GetBytes(json);

        await ws.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
    }

    private static async Task Broadcast(List<WebSocket> clients, object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var bytes = Encoding.UTF8.GetBytes(json);

        foreach (var c in clients.ToArray())
        {
            if (c.State != WebSocketState.Open) continue;
            await c.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }
}