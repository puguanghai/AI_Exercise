#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能健身指导系统 - 系统重置脚本
System Reset Script for AI Fitness Guidance System
"""

import os
import sys
import shutil
from datetime import datetime

def clean_databases():
    """清理所有数据库文件"""
    print("🗑️  清理数据库文件...")
    
    # 可能的数据库文件位置
    db_files = [
        'fitness_app.db',
        'fitness_app_dev.db', 
        'fitness_system.db',
        'instance/fitness_app.db',
        'instance/fitness_app_dev.db'
    ]
    
    removed_files = []
    for db_file in db_files:
        if os.path.exists(db_file):
            os.remove(db_file)
            removed_files.append(db_file)
            print(f"   ✅ 删除: {db_file}")
    
    if not removed_files:
        print("   ℹ️  没有找到数据库文件")
    else:
        print(f"   🎯 共删除 {len(removed_files)} 个数据库文件")
    
    return len(removed_files)

def clean_instance_directory():
    """清理instance目录"""
    print("\n📁 清理instance目录...")
    
    if os.path.exists('instance'):
        try:
            shutil.rmtree('instance')
            print("   ✅ 删除instance目录")
        except Exception as e:
            print(f"   ❌ 删除instance目录失败: {e}")
    else:
        print("   ℹ️  instance目录不存在")

def check_env_file():
    """检查.env文件"""
    print("\n🔧 检查配置文件...")
    
    if not os.path.exists('.env'):
        if os.path.exists('.env.example'):
            shutil.copy('.env.example', '.env')
            print("   ✅ 从.env.example创建.env文件")
        else:
            print("   ❌ .env.example文件不存在")
            return False
    else:
        print("   ✅ .env文件存在")
    
    return True

def verify_configuration():
    """验证配置"""
    print("\n🔍 验证配置...")
    
    try:
        from config import get_config
        config = get_config()
        
        # 检查管理员配置
        admin_config = getattr(config, 'SUPER_ADMIN', {})
        if admin_config:
            print(f"   👤 管理员: {admin_config.get('username', '未设置')}")
            print(f"   📧 邮箱: {admin_config.get('email', '未设置')}")
        else:
            print("   ❌ 管理员配置缺失")
            return False
        
        # 检查AI配置
        ai_models = getattr(config, 'AI_MODELS', {})
        if ai_models:
            print(f"   🤖 AI模型: {len(ai_models)} 个")
        else:
            print("   ❌ AI模型配置缺失")
        
        # 检查运动类型
        exercise_types = getattr(config, 'EXERCISE_TYPES', {})
        if exercise_types:
            print(f"   🏃‍♂️ 运动类型: {len(exercise_types)} 种")
        else:
            print("   ❌ 运动类型配置缺失")
        
        return True
        
    except Exception as e:
        print(f"   ❌ 配置验证失败: {e}")
        return False

def initialize_database():
    """初始化数据库"""
    print("\n📊 初始化数据库...")
    
    try:
        from init_database import init_database
        success = init_database(create_sample=True)
        
        if success:
            print("   ✅ 数据库初始化成功")
            return True
        else:
            print("   ❌ 数据库初始化失败")
            return False
            
    except Exception as e:
        print(f"   ❌ 数据库初始化异常: {e}")
        return False

def test_system():
    """测试系统"""
    print("\n🧪 测试系统...")
    
    try:
        from app import app
        
        with app.app_context():
            # 测试配置加载
            admin_config = app.config.get('SUPER_ADMIN', {})
            if admin_config:
                print(f"   ✅ 管理员配置: {admin_config.get('username')}")
            
            # 测试数据库连接
            from app import db, User
            user_count = User.query.count()
            print(f"   ✅ 数据库连接: {user_count} 个用户")
            
            # 测试AI配置
            ai_models = app.config.get('AI_MODELS', {})
            if ai_models:
                print(f"   ✅ AI配置: {len(ai_models)} 个模型")
            
            return True
            
    except Exception as e:
        print(f"   ❌ 系统测试失败: {e}")
        return False

def show_final_info():
    """显示最终信息"""
    print("\n" + "=" * 60)
    print("🎉 系统重置完成!")
    print("=" * 60)
    
    try:
        from config import get_config
        config = get_config()
        
        # 显示管理员信息
        admin_config = getattr(config, 'SUPER_ADMIN', {})
        if admin_config:
            print(f"👤 管理员账户: {admin_config.get('username', '蒲光海')}")
            print(f"🔑 管理员密码: {admin_config.get('password', 'admin123')}")
            print(f"📧 管理员邮箱: {admin_config.get('email', 'admin@fitness.com')}")
        
        # 显示AI配置
        api_key = getattr(config, 'OPENROUTER_API_KEY', '')
        if api_key and api_key != 'your-api-key-here':
            print(f"🤖 AI服务: 已配置 ({api_key[:10]}...)")
        else:
            print("⚠️  AI服务: 未配置API密钥")
        
        # 显示运动类型
        exercise_types = getattr(config, 'EXERCISE_TYPES', {})
        if exercise_types:
            print(f"🏃‍♂️ 支持运动: {len(exercise_types)} 种")
        
        print(f"🌐 服务地址: http://localhost:{getattr(config, 'PORT', 5000)}")
        
    except Exception as e:
        print(f"❌ 获取配置信息失败: {e}")
    
    print("\n📋 下一步操作:")
    print("1. 检查.env文件中的配置")
    print("2. 运行: python quick_start.py")
    print("3. 访问: http://localhost:5000")
    print("4. 使用管理员账户登录")

def main():
    """主函数"""
    print("🔄 智能健身指导系统 - 系统重置")
    print("=" * 60)
    print(f"重置时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 确认重置
    print("⚠️  此操作将删除所有数据库文件并重新初始化系统")
    confirm = input("确定要继续吗? (y/N): ")
    
    if confirm.lower() != 'y':
        print("❌ 取消重置操作")
        return
    
    success_count = 0
    total_steps = 6
    
    # 1. 清理数据库文件
    if clean_databases() >= 0:
        success_count += 1
    
    # 2. 清理instance目录
    clean_instance_directory()
    success_count += 1
    
    # 3. 检查.env文件
    if check_env_file():
        success_count += 1
    
    # 4. 验证配置
    if verify_configuration():
        success_count += 1
    
    # 5. 初始化数据库
    if initialize_database():
        success_count += 1
    
    # 6. 测试系统
    if test_system():
        success_count += 1
    
    # 显示结果
    print("\n" + "=" * 60)
    print("🔄 重置结果")
    print("=" * 60)
    print(f"总步骤: {total_steps}")
    print(f"成功: {success_count} ✅")
    print(f"失败: {total_steps - success_count} ❌")
    print(f"成功率: {(success_count/total_steps*100):.1f}%")
    
    if success_count == total_steps:
        show_final_info()
    else:
        print("\n❌ 重置过程中出现问题")
        print("建议:")
        print("1. 检查.env文件配置")
        print("2. 确保所有依赖包已安装")
        print("3. 运行: python fix_issues.py")

if __name__ == "__main__":
    main()
