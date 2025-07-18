#!/usr/bin/env python3
"""
MCP Client for AI Service
A command-line tool to interact with the MCP Bridge Server

Usage:
    mcp <command> [options]
    mcp tool <tool_name> [--param value] [--json '{"key": "value"}']
    mcp list [--category financial|documents|system]
    mcp info <tool_name>
    mcp capabilities
"""

import os
import sys
import json
import argparse
import requests
from typing import Dict, Any, Optional
from datetime import datetime
from urllib.parse import urljoin


class MCPClient:
    def __init__(self, base_url: str = None, auth_token: str = None, api_key: str = None):
        self.base_url = base_url or self._discover_service()
        self.auth_token = auth_token or os.environ.get('MCP_AUTH_TOKEN')
        self.api_key = api_key or os.environ.get('MCP_API_KEY')
        self.session = requests.Session()
        
        # Set authentication headers
        if self.auth_token:
            self.session.headers['Authorization'] = f'Bearer {self.auth_token}'
        elif self.api_key:
            self.session.headers['x-api-key'] = self.api_key
    
    def _discover_service(self) -> str:
        """Auto-discover MCP service URL based on environment"""
        # Check environment variable first
        if os.environ.get('MCP_ENDPOINT'):
            return os.environ['MCP_ENDPOINT']
        
        # Check if running in Docker
        if os.path.exists('/.dockerenv'):
            return 'http://mcp-bridge:8080'
        
        # Default to production URL
        return 'https://mcp.anaxi.net'
    
    def _request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to MCP server"""
        url = urljoin(self.base_url, path)
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            if response.status_code == 401:
                print("❌ Authentication required. Set MCP_AUTH_TOKEN or MCP_API_KEY environment variable.")
                sys.exit(1)
            elif response.status_code == 429:
                print("❌ Rate limit exceeded. Please try again later.")
                sys.exit(1)
            else:
                error_data = response.json().get('error', {})
                print(f"❌ Error: {error_data.get('message', str(e))}")
                sys.exit(1)
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to MCP server at {self.base_url}")
            print("💡 Check if the server is running and accessible")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")
            sys.exit(1)
    
    def execute_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with given parameters"""
        return self._request('POST', f'/mcp/tools/{tool_name}/execute', json=params)
    
    def list_tools(self, category: Optional[str] = None) -> list:
        """List available tools"""
        params = {'category': category} if category else {}
        response = self._request('GET', '/mcp/tools', params=params)
        return response.get('tools', [])
    
    def get_tool_info(self, tool_name: str) -> Dict[str, Any]:
        """Get detailed information about a tool"""
        return self._request('GET', f'/mcp/tools/{tool_name}')
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Get server capabilities"""
        return self._request('GET', '/mcp/capabilities')
    
    def get_info(self) -> Dict[str, Any]:
        """Get server information"""
        return self._request('GET', '/mcp/info')


def parse_tool_params(args: list) -> Dict[str, Any]:
    """Parse tool parameters from command line arguments"""
    params = {}
    i = 0
    
    while i < len(args):
        arg = args[i]
        
        if arg == '--json':
            # Handle JSON parameter
            if i + 1 < len(args):
                try:
                    json_data = json.loads(args[i + 1])
                    params.update(json_data)
                    i += 2
                except json.JSONDecodeError:
                    print(f"❌ Invalid JSON: {args[i + 1]}")
                    sys.exit(1)
            else:
                print("❌ --json requires a value")
                sys.exit(1)
        elif arg.startswith('--'):
            # Handle key-value parameter
            key = arg[2:]
            if i + 1 < len(args) and not args[i + 1].startswith('--'):
                value = args[i + 1]
                # Try to parse as number or boolean
                if value.lower() in ('true', 'false'):
                    params[key] = value.lower() == 'true'
                else:
                    try:
                        params[key] = int(value)
                    except ValueError:
                        try:
                            params[key] = float(value)
                        except ValueError:
                            params[key] = value
                i += 2
            else:
                # Boolean flag
                params[key] = True
                i += 1
        else:
            i += 1
    
    return params


def format_result(result: Dict[str, Any]) -> str:
    """Format tool execution result for display"""
    if result.get('success'):
        output = "✅ Success\n"
        if result.get('data'):
            output += json.dumps(result['data'], indent=2, default=str)
    else:
        output = f"❌ Failed: {result.get('error', 'Unknown error')}"
    
    if result.get('metadata'):
        output += f"\n\n📊 Metadata:\n"
        output += f"  Duration: {result['metadata'].get('duration', 'N/A')}ms\n"
        output += f"  Cached: {result['metadata'].get('cached', False)}"
    
    return output


def main():
    parser = argparse.ArgumentParser(
        description='MCP Client for AI Service',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Tool execution command
    tool_parser = subparsers.add_parser('tool', help='Execute a tool')
    tool_parser.add_argument('tool_name', help='Name of the tool to execute')
    tool_parser.add_argument('params', nargs='*', help='Tool parameters')
    
    # List tools command
    list_parser = subparsers.add_parser('list', help='List available tools')
    list_parser.add_argument('--category', choices=['financial', 'documents', 'system'],
                           help='Filter by category')
    
    # Tool info command
    info_parser = subparsers.add_parser('info', help='Get tool information')
    info_parser.add_argument('tool_name', help='Name of the tool')
    
    # Capabilities command
    subparsers.add_parser('capabilities', help='Get server capabilities')
    
    # Server info command
    subparsers.add_parser('server', help='Get server information')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize client
    client = MCPClient()
    
    try:
        if args.command == 'tool':
            # Execute tool
            params = parse_tool_params(args.params)
            print(f"🔧 Executing tool: {args.tool_name}")
            if params:
                print(f"📋 Parameters: {json.dumps(params, indent=2)}")
            
            result = client.execute_tool(args.tool_name, params)
            print("\n" + format_result(result))
        
        elif args.command == 'list':
            # List tools
            tools = client.list_tools(args.category)
            if args.category:
                print(f"🔧 Tools in category '{args.category}':\n")
            else:
                print("🔧 Available tools:\n")
            
            for tool in tools:
                auth_indicator = "🔐" if tool.get('requiresAuth') else "🔓"
                print(f"{auth_indicator} {tool['name']}")
                print(f"   {tool['description']}")
                print(f"   Category: {tool['category']}\n")
        
        elif args.command == 'info':
            # Get tool info
            info = client.get_tool_info(args.tool_name)
            print(f"🔧 Tool: {info['name']}")
            print(f"📝 Description: {info['description']}")
            print(f"📁 Category: {info['category']}")
            print(f"🔐 Requires Auth: {info['requiresAuth']}")
            
            if info.get('rateLimit'):
                print(f"⏱️  Rate Limit: {info['rateLimit']['maxPerMinute']}/min, {info['rateLimit']['maxPerHour']}/hour")
            
            print(f"\n📋 Input Schema:")
            print(json.dumps(info['inputSchema'], indent=2))
        
        elif args.command == 'capabilities':
            # Get capabilities
            caps = client.get_capabilities()
            print(f"🚀 MCP Server: {caps['name']} v{caps['version']}")
            print(f"📝 {caps['description']}")
            print(f"\n✨ Features: {', '.join(caps['features'])}")
            print(f"\n🔧 Tools: {len(caps['tools'])} available")
            
            # Group tools by category
            by_category = {}
            for tool in caps['tools']:
                cat = tool['category']
                if cat not in by_category:
                    by_category[cat] = []
                by_category[cat].append(tool['name'])
            
            for cat, tools in by_category.items():
                print(f"\n  {cat}: {', '.join(tools)}")
        
        elif args.command == 'server':
            # Get server info
            info = client.get_info()
            print(f"🚀 {info['name']} v{info['version']}")
            print(f"📝 {info['description']}")
            print(f"🌍 Environment: {info['environment']}")
            print(f"⏱️  Uptime: {info['uptime']:.0f} seconds")
            print(f"\n📊 Tool Statistics:")
            stats = info['stats']
            print(f"  Total tools: {stats['total']}")
            print(f"  Requiring auth: {stats['requiresAuth']}")
            print(f"  With rate limits: {stats['withRateLimit']}")
            print(f"\n  By category:")
            for cat, count in stats['byCategory'].items():
                print(f"    {cat}: {count}")
        
    except KeyboardInterrupt:
        print("\n👋 Interrupted by user")
        sys.exit(0)


if __name__ == '__main__':
    main()