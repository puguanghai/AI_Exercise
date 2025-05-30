#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能健身指导系统 - 快速启动脚本
Quick Start Script for AI Fitness Guidance System
"""

import os
import sys
import subprocess
import time

def check_environment():
    """检查环境配置"""
    print("🔍 检查环境配置...")

    # 检查.env文件
    if not os.path.exists('.env'):
        if os.path.exists('.env.example'):
            print("⚠️  .env文件不存在，正在从.env.example创建...")
            import shutil
            shutil.copy('.env.example', '.env')
            print("✅ .env文件已创建，请根据需要修改配置")
        else:
            print("❌ .env.example文件不存在")
            return False
    else:
        print("✅ .env文件存在")

    return True

def check_dependencies():
    """检查依赖包"""
    print("\n🔍 检查依赖包...")

    required_packages = [
        'flask',
        'flask-sqlalchemy',
        'flask-login',
        'werkzeug',
        'opencv-python',
        'mediapipe',
        'numpy',
        'requests',
        'pytz',
        'python-dotenv'
    ]

    missing_packages = []

    for package in required_packages:
        try:
            if package == 'python-dotenv':
                import dotenv
            elif package == 'opencv-python':
                import cv2
            elif package == 'flask-sqlalchemy':
                import flask_sqlalchemy
            elif package == 'flask-login':
                import flask_login
            else:
                __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")

    if missing_packages:
        print(f"\n⚠️  缺少以下依赖包: {', '.join(missing_packages)}")
        print("请运行以下命令安装:")
        print(f"pip install {' '.join(missing_packages)}")
        return False

    print("✅ 所有依赖包已安装")
    return True

def check_database():
    """检查数据库"""
    print("\n📊 检查数据库...")

    # 加载配置
    from config import get_config
    config = get_config()

    # 检查数据库文件（如果是SQLite）
    if 'sqlite' in config.SQLALCHEMY_DATABASE_URI:
        db_file = config.SQLALCHEMY_DATABASE_URI.replace('sqlite:///', '')

        # 检查多个可能的数据库位置
        possible_db_paths = [
            db_file,
            f'instance/{db_file}',
            f'instance/{os.path.basename(db_file)}'
        ]

        db_found = False
        actual_db_path = None

        for db_path in possible_db_paths:
            if os.path.exists(db_path):
                db_found = True
                actual_db_path = db_path
                break

        if db_found:
            print(f"✅ 数据库文件存在: {actual_db_path}")

            # 检查数据库是否有数据
            try:
                from app import app, User
                with app.app_context():
                    user_count = User.query.count()
                    if user_count > 0:
                        print(f"✅ 数据库连接正常，包含 {user_count} 个用户")
                        return True
                    else:
                        print("⚠️  数据库为空，需要初始化数据")
                        # 数据库存在但为空，直接初始化
                        try:
                            from init_database import init_database
                            success = init_database(create_sample=True)
                            if success:
                                print("✅ 数据库初始化成功")
                                return True
                            else:
                                print("❌ 数据库初始化失败")
                                return False
                        except Exception as e:
                            print(f"❌ 数据库初始化失败: {e}")
                            return False
            except Exception as e:
                print(f"⚠️  数据库连接异常: {e}")
                print("尝试重新初始化数据库...")
                try:
                    from init_database import init_database
                    success = init_database(create_sample=True)
                    if success:
                        print("✅ 数据库重新初始化成功")
                        return True
                    else:
                        print("❌ 数据库重新初始化失败")
                        return False
                except Exception as e2:
                    print(f"❌ 数据库重新初始化失败: {e2}")
                    return False
        else:
            print(f"❌ 数据库文件不存在: {db_file}")
            print("请运行以下命令初始化数据库:")
            print("python init_database.py")

            # 询问是否自动初始化
            response = input("是否现在初始化数据库? (y/N): ")
            if response.lower() == 'y':
                try:
                    from init_database import init_database
                    success = init_database(create_sample=True)
                    if success:
                        print("✅ 数据库初始化成功")
                        return True
                    else:
                        print("❌ 数据库初始化失败")
                        return False
                except Exception as e:
                    print(f"❌ 数据库初始化失败: {e}")
                    return False
            else:
                return False
    else:
        print("✅ 使用外部数据库")
        try:
            from app import app, User
            with app.app_context():
                user_count = User.query.count()
                print(f"✅ 数据库连接正常，包含 {user_count} 个用户")
                return True
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            return False

def create_directories():
    """创建必要的目录"""
    print("\n📁 检查目录结构...")

    directories = [
        'static/uploads',
        'static/uploads/avatars',
        'logs',
        'backups'
    ]

    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"✅ 创建目录: {directory}")
        else:
            print(f"✅ 目录存在: {directory}")

def start_application():
    """启动应用"""
    print("\n🚀 启动智能健身指导系统...")

    try:
        # 导入并运行应用
        from app import app

        # 获取配置
        host = app.config.get('HOST', '0.0.0.0')
        port = app.config.get('PORT', 5000)
        debug = app.config.get('DEBUG', True)

        print("✅ 应用启动成功!")
        print(f"📱 访问地址: http://localhost:{port}")

        # 显示管理员信息
        admin_config = app.config.get('SUPER_ADMIN', {})
        if admin_config:
            print(f"👤 管理员账户: {admin_config.get('username')} / {admin_config.get('password')}")

        # 显示AI配置信息
        ai_models = app.config.get('AI_MODELS', {})
        if ai_models:
            print(f"🤖 AI模型: {len(ai_models)} 个可用")
            default_model = list(ai_models.keys())[0] if ai_models else None
            if default_model:
                print(f"   默认模型: {ai_models.get(default_model)}")

        # 显示运动类型信息
        exercise_types = app.config.get('EXERCISE_TYPES', {})
        if exercise_types:
            print(f"🏃‍♂️ 支持运动: {len(exercise_types)} 种")

        print("🔧 按 Ctrl+C 停止服务")
        print("=" * 50)

        app.run(debug=debug, host=host, port=port)

    except KeyboardInterrupt:
        print("\n👋 应用已停止")
    except Exception as e:
        print(f"❌ 启动失败: {e}")
        print("请检查配置文件和依赖包")

def show_help():
    """显示帮助信息"""
    print("\n📋 使用说明:")
    print("1. 首次使用请运行: python init_database.py")
    print("2. 配置.env文件中的API密钥和其他设置")
    print("3. 运行: python quick_start.py 启动应用")
    print("4. 访问: http://localhost:5000")
    print("\n🔧 其他命令:")
    print("- python init_database.py --reset  # 重置数据库")
    print("- python init_database.py --no-sample  # 不创建示例数据")

def main():
    """主函数"""
    print("🎯 智能健身指导系统 - 快速启动")
    print("=" * 50)

    # 检查命令行参数
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h']:
        show_help()
        return

    # 检查环境配置
    if not check_environment():
        return

    # 检查依赖
    if not check_dependencies():
        return

    # 创建目录
    create_directories()

    # 检查数据库
    if not check_database():
        return

    # 启动应用
    start_application()

if __name__ == "__main__":
    main()
