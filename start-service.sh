#!/bin/bash
# WebMCP Adapter 服务启动脚本
# 
# 这个脚本会在后台启动 native host 作为独立服务
# 使用 launchd (macOS) 或 systemd (Linux) 来管理

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.webmcp-native-host.pid"
LOG_FILE="$SCRIPT_DIR/native-host.log"

case "$1" in
  start)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p "$PID" > /dev/null 2>&1; then
        echo "✓ Native host is already running (PID: $PID)"
        exit 0
      else
        echo "Removing stale PID file"
        rm "$PID_FILE"
      fi
    fi
    
    echo "Starting native host service..."
    cd "$SCRIPT_DIR"
    nohup node native-host/index.js --service >> "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    # 等待服务启动
    sleep 2
    
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "✓ Native host started successfully (PID: $PID)"
      echo "  Log file: $LOG_FILE"
      echo "  WebSocket: ws://localhost:3711"
    else
      echo "✗ Failed to start native host"
      rm "$PID_FILE"
      exit 1
    fi
    ;;
    
  stop)
    if [ ! -f "$PID_FILE" ]; then
      echo "Native host is not running"
      exit 0
    fi
    
    PID=$(cat "$PID_FILE")
    echo "Stopping native host (PID: $PID)..."
    
    if ps -p "$PID" > /dev/null 2>&1; then
      kill "$PID"
      sleep 1
      
      if ps -p "$PID" > /dev/null 2>&1; then
        echo "Force killing..."
        kill -9 "$PID"
      fi
      
      echo "✓ Native host stopped"
    else
      echo "Process not found, cleaning up PID file"
    fi
    
    rm "$PID_FILE"
    ;;
    
  restart)
    $0 stop
    sleep 1
    $0 start
    ;;
    
  status)
    if [ ! -f "$PID_FILE" ]; then
      echo "✗ Native host is not running"
      exit 1
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "✓ Native host is running (PID: $PID)"
      echo ""
      echo "Recent logs:"
      tail -20 "$LOG_FILE"
    else
      echo "✗ Native host is not running (stale PID file)"
      rm "$PID_FILE"
      exit 1
    fi
    ;;
    
  logs)
    if [ ! -f "$LOG_FILE" ]; then
      echo "No log file found"
      exit 1
    fi
    
    if [ "$2" = "-f" ]; then
      tail -f "$LOG_FILE"
    else
      tail -50 "$LOG_FILE"
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs [-f]}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the native host service"
    echo "  stop     - Stop the native host service"
    echo "  restart  - Restart the native host service"
    echo "  status   - Check if the service is running"
    echo "  logs     - Show recent logs (use -f to follow)"
    exit 1
    ;;
esac
