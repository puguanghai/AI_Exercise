#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能健身指导系统 - 数据库初始化脚本
Database Initialization Script for AI Fitness Guidance System
"""

import os
import sys
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
import pytz

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import get_config
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# 中国时区
CHINA_TZ = pytz.timezone('Asia/Shanghai')

def get_china_time():
    """获取中国时间"""
    return datetime.now(CHINA_TZ)

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    config_class = get_config()
    app.config.from_object(config_class)
    
    # 加载环境变量
    if os.path.exists('.env'):
        from dotenv import load_dotenv
        load_dotenv()
        # 重新加载配置以获取环境变量
        app.config.from_object(config_class)
    
    return app



def init_database(create_sample=True):
    """初始化数据库"""
    print("🚀 开始初始化数据库...")
    
    try:
        # 直接导入app和数据库实例
        from app import app, db, User, WorkoutSession, FitnessGoal, FitnessPlan
        
        with app.app_context():
            # 创建所有表
            print("📊 创建数据库表...")
            db.create_all()
            print("✅ 数据库表创建完成")
            
            # 创建必要的目录
            directories = [
                'static/uploads',
                'static/uploads/avatars',
                'logs',
                'backups'
            ]
            
            for directory in directories:
                if not os.path.exists(directory):
                    os.makedirs(directory)
                    print(f"📁 创建目录: {directory}")
            
            # 创建管理员用户
            admin_config = app.config.get('SUPER_ADMIN', {})
            if admin_config and admin_config.get('username'):
                existing_admin = User.query.filter_by(username=admin_config['username']).first()
                if not existing_admin:
                    admin_user = User(
                        username=admin_config['username'],
                        email=admin_config['email'],
                        is_admin=True,
                        created_at=get_china_time()
                    )
                    admin_user.set_password(admin_config['password'])
                    db.session.add(admin_user)
                    db.session.commit()
                    print(f"✅ 创建超级管理员: {admin_config['username']}")
                else:
                    print(f"ℹ️  超级管理员已存在: {admin_config['username']}")
            
            # 创建示例数据
            if create_sample:
                print("📝 创建示例用户...")
                sample_users = [
                    {'username': '张三', 'email': 'zhangsan@example.com', 'password': '123456'},
                    {'username': '李四', 'email': 'lisi@example.com', 'password': '123456'},
                    {'username': '王五', 'email': 'wangwu@example.com', 'password': '123456'}
                ]
                
                for user_data in sample_users:
                    existing_user = User.query.filter_by(username=user_data['username']).first()
                    if not existing_user:
                        user = User(
                            username=user_data['username'],
                            email=user_data['email'],
                            created_at=get_china_time()
                        )
                        user.set_password(user_data['password'])
                        db.session.add(user)
                        print(f"✅ 创建示例用户: {user_data['username']}")
                
                db.session.commit()
            
            print("🎉 数据库初始化完成!")
            print("\n📋 初始化信息:")
            print(f"   数据库文件: {app.config['SQLALCHEMY_DATABASE_URI']}")

            # 显示管理员信息
            if admin_config:
                print(f"   超级管理员: {admin_config.get('username')}")
                print(f"   管理员密码: {admin_config.get('password')}")
                print(f"   管理员邮箱: {admin_config.get('email')}")

            # 显示AI配置信息
            ai_models = app.config.get('AI_MODELS', {})
            if ai_models:
                print(f"   AI模型数量: {len(ai_models)} 个")
                for key, model in ai_models.items():
                    print(f"     - {key}: {model}")

            # 显示运动类型信息
            exercise_types = app.config.get('EXERCISE_TYPES', {})
            if exercise_types:
                print(f"   支持运动: {len(exercise_types)} 种")
                for key, exercise in exercise_types.items():
                    print(f"     - {exercise.get('name', key)}")
            
            if create_sample:
                print("\n👥 示例用户账户:")
                print("   用户名: 张三, 密码: 123456")
                print("   用户名: 李四, 密码: 123456") 
                print("   用户名: 王五, 密码: 123456")
            
            print("\n🔧 下一步:")
            print("   1. 复制 .env.example 为 .env 并配置您的设置")
            print("   2. 运行 python app.py 启动应用")
            print("   3. 访问 http://localhost:5000 开始使用")
            
            return True
    
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='初始化智能健身指导系统数据库')
    parser.add_argument('--no-sample', action='store_true', help='不创建示例数据')
    parser.add_argument('--reset', action='store_true', help='重置数据库（删除所有数据）')
    
    args = parser.parse_args()
    
    if args.reset:
        confirm = input("⚠️  确定要重置数据库吗？这将删除所有数据！(y/N): ")
        if confirm.lower() == 'y':
            # 删除数据库文件
            db_files = ['fitness_app.db', 'fitness_app_dev.db']
            for db_file in db_files:
                if os.path.exists(db_file):
                    os.remove(db_file)
                    print(f"🗑️  删除数据库文件: {db_file}")
            
            init_database(create_sample=not args.no_sample)
        else:
            print("❌ 取消重置操作")
    else:
        init_database(create_sample=not args.no_sample)
