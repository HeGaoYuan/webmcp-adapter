"""Convert bridge tools to OpenAI function-calling schema format.

Tool names from adapters use dots (e.g. mail.163.com.search_emails) which
violates OpenAI's ^[a-zA-Z0-9_-]+$ pattern. We sanitize by replacing dots
with double underscores, and reverse the mapping when dispatching calls.
"""
from bridge_client import BridgeClient

# System tools always available
SYSTEM_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "open_browser",
            "description": "Open Chrome browser and navigate to a URL",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full URL to open (http/https)"}
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "capture_screenshot",
            "description": "Take a screenshot of the current browser tab. Returns a JPEG image.",
            "parameters": {
                "type": "object",
                "properties": {
                    "fullPage": {
                        "type": "boolean",
                        "description": "Capture full page including scroll area (default: false)",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_downloads",
            "description": "List files in ~/Downloads directory, sorted by modification time (newest first)",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {"type": "string", "description": "Filter files by name keyword (optional)"},
                    "limit": {"type": "integer", "description": "Max number of files to return (default 50)"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_wework_files",
            "description": "List files managed by WeWork in ~/.wework/files/",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Subdirectory/category name (e.g. 'jd', 'gmail'). Leave empty for all files."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "move_to_wework",
            "description": "Move a file from ~/Downloads to ~/.wework/files/{category}/",
            "parameters": {
                "type": "object",
                "properties": {
                    "filename": {"type": "string", "description": "Filename in ~/Downloads (e.g. 'invoice.pdf')"},
                    "category": {"type": "string", "description": "Target category/subdirectory (e.g. 'jd', 'gmail'). Leave empty for root."},
                },
                "required": ["filename"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file_text",
            "description": "Read text content of a file (txt, md, csv, json, pdf). Use to analyze file contents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Absolute file path"},
                    "max_chars": {"type": "integer", "description": "Max characters to read (default 8000)"},
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_wework_file",
            "description": "Delete a file from ~/.wework/files/",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Absolute path of the file to delete"},
                },
                "required": ["path"],
            },
        },
    },
]

_SYSTEM_TOOL_NAMES = {t["function"]["name"] for t in SYSTEM_TOOLS}


def sanitize_name(name: str) -> str:
    """Replace dots with __ to satisfy OpenAI naming rules."""
    return name.replace(".", "__")


def restore_name(sanitized: str) -> str:
    """Reverse sanitize_name."""
    return sanitized.replace("__", ".")


def _bridge_tool_to_openai(tool: dict) -> dict:
    params = tool.get("inputSchema") or tool.get("parameters") or {
        "type": "object",
        "properties": {},
        "required": [],
    }
    return {
        "type": "function",
        "function": {
            "name": sanitize_name(tool["name"]),
            "description": tool.get("description", ""),
            "parameters": params,
        },
    }


def build_tool_schemas(bridge: BridgeClient) -> list[dict]:
    bridge_tools = [_bridge_tool_to_openai(t) for t in bridge.get_all_tools()]
    return SYSTEM_TOOLS + bridge_tools


def resolve_tool_name(sanitized: str) -> str:
    """Convert sanitized name back to original bridge tool name."""
    if sanitized in _SYSTEM_TOOL_NAMES:
        return sanitized
    return restore_name(sanitized)
