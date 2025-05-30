#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能健身指导系统 - Render.com 部署启动脚本
AI Fitness Guidance System - Render.com Deployment Script
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 设置环境变量
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('FLASK_DEBUG', 'False')
os.environ.setdefault('FLASK_HOST', '0.0.0.0')
os.environ.setdefault('FLASK_PORT', '10000')

# 确保必要目录存在
instance_dir = project_root / 'instance'
instance_dir.mkdir(exist_ok=True)

upload_dir = project_root / 'static' / 'uploads'
upload_dir.mkdir(parents=True, exist_ok=True)

avatar_dir = upload_dir / 'avatars'
avatar_dir.mkdir(exist_ok=True)

logs_dir = project_root / 'logs'
logs_dir.mkdir(exist_ok=True)

print("🚀 启动AI智能健身指导系统 (Render部署)")
print(f"📁 项目目录: {project_root}")
print(f"🗄️ 数据库目录: {instance_dir}")
print(f"📤 上传目录: {upload_dir}")
print(f"📝 日志目录: {logs_dir}")

# 导入并启动Flask应用
try:
    from app import app, init_app_data
    
    # 初始化应用数据
    with app.app_context():
        init_app_data()
    
    # 获取端口
    port = int(os.environ.get('PORT', 10000))
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    
    print(f"🌐 服务地址: http://{host}:{port}")
    print("✅ 应用启动成功！")
    
    # 启动应用
    app.run(
        host=host,
        port=port,
        debug=False,
        threaded=True
    )
    
except Exception as e:
    print(f"❌ 应用启动失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)