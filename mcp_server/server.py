import os

from dotenv import load_dotenv

load_dotenv()

from mcp.server.fastmcp import FastMCP

import tools

MCP_HOST = os.getenv("MCP_HOST", "0.0.0.0")
MCP_PORT = int(os.getenv("MCP_PORT", "8100"))

mcp = FastMCP("order-app", host=MCP_HOST, port=MCP_PORT)

mcp.tool()(tools.search_products)
mcp.tool()(tools.search_clients)
mcp.tool()(tools.create_draft_order)
mcp.tool()(tools.list_draft_orders)
mcp.tool()(tools.update_draft_order)

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
