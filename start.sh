#!/bin/bash
#📌 说明：使用 eventlet 支持 WebSocket/长连接，超时设为180秒防止AI处理中断
gunicorn --worker-class eventlet -w 1 app:app --timeout 180