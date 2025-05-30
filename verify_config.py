#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能健身指导系统 - 配置验证脚本
Configuration Verification Script for AI Fitness Guidance System
"""

import os
import sys
from datetime import datetime

def verify_config():
    """验证配置是否正确加载"""
    print("🔧 智能健身指导系统 - 配置验证")
    print("=" * 60)
    
    try:
        # 检查.env文件
        if os.path.exists('.env'):
            print("✅ .env文件存在")
        else:
            print("❌ .env文件不存在")
            if os.path.exists('.env.example'):
                print("💡 建议运行: cp .env.example .env")
            return False
        
        # 加载配置
        from config import get_config
        config = get_config()
        
        print("\n📋 配置信息验证:")
        print("-" * 40)
        
        # 验证基础配置
        print("🔐 基础配置:")
        if hasattr(config, 'SECRET_KEY'):
            print(f"   SECRET_KEY: {'已设置' if config.SECRET_KEY else '未设置'}")
        
        if hasattr(config, 'SQLALCHEMY_DATABASE_URI'):
            print(f"   数据库URI: {config.SQLALCHEMY_DATABASE_URI}")
        
        # 验证管理员配置
        print("\n👤 超级管理员配置:")
        admin_config = getattr(config, 'SUPER_ADMIN', {})
        if admin_config:
            print(f"   用户名: {admin_config.get('username', '未设置')}")
            print(f"   邮箱: {admin_config.get('email', '未设置')}")
            print(f"   密码: {'已设置' if admin_config.get('password') else '未设置'}")
            print(f"   显示名: {admin_config.get('display_name', '未设置')}")
        else:
            print("   ❌ 管理员配置缺失")
        
        # 验证AI配置
        print("\n🤖 AI服务配置:")
        if hasattr(config, 'OPENROUTER_API_KEY'):
            api_key = config.OPENROUTER_API_KEY
            if api_key and api_key != 'your-api-key-here':
                print(f"   API密钥: 已设置 ({api_key[:10]}...)")
            else:
                print("   ❌ API密钥未设置或使用默认值")
        
        ai_models = getattr(config, 'AI_MODELS', {})
        if ai_models:
            print(f"   支持模型: {len(ai_models)} 个")
            for key, model in ai_models.items():
                print(f"     - {key}: {model}")
        else:
            print("   ❌ AI模型配置缺失")
        
        ai_config = getattr(config, 'AI_CONFIG', {})
        if ai_config:
            print(f"   最大令牌: {ai_config.get('max_tokens', '未设置')}")
            print(f"   温度参数: {ai_config.get('temperature', '未设置')}")
            print(f"   超时时间: {ai_config.get('timeout', '未设置')}秒")
        
        # 验证运动类型配置
        print("\n🏃‍♂️ 运动类型配置:")
        exercise_types = getattr(config, 'EXERCISE_TYPES', {})
        if exercise_types:
            print(f"   支持运动: {len(exercise_types)} 种")
            for key, exercise in exercise_types.items():
                name = exercise.get('name', key)
                desc = exercise.get('description', '无描述')
                print(f"     - {name}: {desc}")
        else:
            print("   ❌ 运动类型配置缺失")
        
        # 验证运动阈值配置
        print("\n⚙️ 运动阈值配置:")
        exercise_thresholds = getattr(config, 'EXERCISE_THRESHOLDS', {})
        if exercise_thresholds:
            print(f"   配置运动: {len(exercise_thresholds)} 种")
            for exercise, thresholds in exercise_thresholds.items():
                print(f"     - {exercise}: {thresholds}")
        else:
            print("   ❌ 运动阈值配置缺失")
        
        # 验证服务器配置
        print("\n🌐 服务器配置:")
        print(f"   主机: {getattr(config, 'HOST', '未设置')}")
        print(f"   端口: {getattr(config, 'PORT', '未设置')}")
        print(f"   调试模式: {getattr(config, 'DEBUG', '未设置')}")
        
        print("\n" + "=" * 60)
        print("✅ 配置验证完成")
        
        # 测试配置加载
        print("\n🧪 测试配置加载:")
        try:
            from app import app
            with app.app_context():
                # 测试管理员配置
                admin_test = app.config.get('SUPER_ADMIN', {})
                if admin_test:
                    print(f"✅ 应用中管理员配置: {admin_test.get('username', '未知')}")
                
                # 测试AI配置
                ai_test = app.config.get('AI_MODELS', {})
                if ai_test:
                    print(f"✅ 应用中AI模型: {len(ai_test)} 个")
                
                # 测试运动配置
                exercise_test = app.config.get('EXERCISE_TYPES', {})
                if exercise_test:
                    print(f"✅ 应用中运动类型: {len(exercise_test)} 种")
                
                print("✅ 配置在应用中正确加载")
                
        except Exception as e:
            print(f"❌ 应用配置加载失败: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 配置验证失败: {e}")
        return False

def test_environment_variables():
    """测试环境变量"""
    print("\n🌍 环境变量检查:")
    print("-" * 40)
    
    important_vars = [
        'ADMIN_USERNAME',
        'ADMIN_PASSWORD', 
        'ADMIN_EMAIL',
        'OPENROUTER_API_KEY',
        'AI_MODEL_DEEPSEEK',
        'DATABASE_URL',
        'FLASK_HOST',
        'FLASK_PORT'
    ]
    
    for var in important_vars:
        value = os.environ.get(var)
        if value:
            if 'PASSWORD' in var or 'KEY' in var:
                print(f"   {var}: 已设置 ({'*' * 8})")
            else:
                print(f"   {var}: {value}")
        else:
            print(f"   {var}: 未设置")

def show_config_relationship():
    """显示配置文件关系说明"""
    print("\n📋 配置文件关系说明:")
    print("=" * 50)
    print("1. .env文件:")
    print("   - 存储实际的配置值（环境变量）")
    print("   - 包含敏感信息如API密钥、密码等")
    print("   - 不应提交到版本控制系统")
    print("")
    print("2. config.py文件:")
    print("   - Python配置类，定义配置结构")
    print("   - 从环境变量读取配置值")
    print("   - 提供配置的默认值和验证")
    print("   - 可以提交到版本控制系统")
    print("")
    print("3. 配置优先级:")
    print("   - 环境变量(.env) > config.py默认值")
    print("   - 修改配置请编辑.env文件")
    print("=" * 50)

def show_config_template():
    """显示配置模板"""
    print("\n📝 配置模板示例:")
    print("-" * 40)
    print("""
# 复制以下内容到 .env 文件中并修改相应值:

# 超级管理员配置
ADMIN_USERNAME=你的管理员用户名
ADMIN_PASSWORD=你的管理员密码
ADMIN_EMAIL=你的邮箱@example.com
ADMIN_DISPLAY_NAME=系统管理员

# AI服务配置
OPENROUTER_API_KEY=你的OpenRouter_API密钥
AI_MODEL_DEEPSEEK=deepseek/deepseek-chat:free
AI_MODEL_GEMINI=google/gemini-2.0-flash-exp:free

# 数据库配置
DATABASE_URL=sqlite:///fitness_app.db

# 服务器配置
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=true
""")

def main():
    """主函数"""
    # 显示配置文件关系
    show_config_relationship()

    # 验证配置
    success = verify_config()

    # 测试环境变量
    test_environment_variables()

    if not success:
        show_config_template()
        print("\n💡 修复建议:")
        print("1. 确保 .env 文件存在")
        print("2. 检查配置文件语法")
        print("3. 设置必要的环境变量")
        print("4. 参考上面的配置模板")
    else:
        print("\n🎉 配置验证成功！")
        print("现在可以运行: python quick_start.py")

if __name__ == "__main__":
    main()
