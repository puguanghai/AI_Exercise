#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能健身指导系统状态检查脚本
检查系统各项功能是否正常工作
"""

import os
import sys
import sqlite3
import requests
from datetime import datetime

def print_header():
    """打印检查标题"""
    print("🔍 智能健身指导系统状态检查")
    print("=" * 50)
    print(f"检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

def check_files():
    """检查关键文件是否存在"""
    print("\n📁 检查关键文件...")
    
    critical_files = [
        'app.py',
        'start_system.py',
        'requirements.txt',
        'README.md'
    ]
    
    important_dirs = [
        'static',
        'templates', 
        'models'
    ]
    
    all_good = True
    
    for file in critical_files:
        if os.path.exists(file):
            size = os.path.getsize(file)
            print(f"✅ {file} ({size} bytes)")
        else:
            print(f"❌ {file} - 文件缺失")
            all_good = False
    
    for dir_name in important_dirs:
        if os.path.exists(dir_name) and os.path.isdir(dir_name):
            file_count = len([f for f in os.listdir(dir_name) if os.path.isfile(os.path.join(dir_name, f))])
            print(f"✅ {dir_name}/ ({file_count} 个文件)")
        else:
            print(f"❌ {dir_name}/ - 目录缺失")
            all_good = False
    
    return all_good

def check_database():
    """检查数据库状态"""
    print("\n🗄️  检查数据库状态...")
    
    db_path = 'fitness_system.db'
    if not os.path.exists(db_path):
        print("❌ 数据库文件不存在")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['user', 'workout_session', 'fitness_goal']
        
        for table in expected_tables:
            if table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"✅ 表 {table} ({count} 条记录)")
            else:
                print(f"❌ 表 {table} - 不存在")
                return False
        
        conn.close()
        print("✅ 数据库状态正常")
        return True
        
    except Exception as e:
        print(f"❌ 数据库检查失败: {str(e)}")
        return False

def check_dependencies():
    """检查Python依赖"""
    print("\n📦 检查Python依赖...")
    
    required_modules = [
        'flask',
        'flask_sqlalchemy',
        'flask_login',
        'werkzeug',
        'requests'
    ]
    
    optional_modules = [
        'cv2',
        'numpy',
        'mediapipe'
    ]
    
    all_required = True
    
    for module in required_modules:
        try:
            __import__(module)
            print(f"✅ {module}")
        except ImportError:
            print(f"❌ {module} - 必需模块缺失")
            all_required = False
    
    for module in optional_modules:
        try:
            __import__(module)
            print(f"✅ {module} (可选)")
        except ImportError:
            print(f"⚠️  {module} - 可选模块缺失")
    
    return all_required

def check_ai_config():
    """检查AI配置"""
    print("\n🤖 检查AI配置...")
    
    try:
        from app import OPENROUTER_API_KEY, AI_MODELS
        
        if OPENROUTER_API_KEY and OPENROUTER_API_KEY.startswith('sk-or-v1-'):
            print("✅ OpenRouter API密钥已配置")
        else:
            print("❌ OpenRouter API密钥配置错误")
            return False
        
        if AI_MODELS and len(AI_MODELS) > 0:
            print(f"✅ AI模型配置 ({len(AI_MODELS)} 个模型)")
            for key, model in AI_MODELS.items():
                print(f"   - {key}: {model}")
        else:
            print("❌ AI模型配置缺失")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ AI配置检查失败: {str(e)}")
        return False

def check_static_resources():
    """检查静态资源"""
    print("\n🎨 检查静态资源...")
    
    static_dirs = {
        'static/css': ['style.css'],
        'static/js': ['main.js', 'pose-detection.js'],
        'static/images': []
    }
    
    all_good = True
    
    for dir_path, required_files in static_dirs.items():
        if os.path.exists(dir_path):
            existing_files = os.listdir(dir_path)
            print(f"✅ {dir_path} ({len(existing_files)} 个文件)")
            
            for required_file in required_files:
                if required_file in existing_files:
                    file_path = os.path.join(dir_path, required_file)
                    size = os.path.getsize(file_path)
                    print(f"   ✅ {required_file} ({size} bytes)")
                else:
                    print(f"   ❌ {required_file} - 缺失")
                    all_good = False
        else:
            print(f"❌ {dir_path} - 目录不存在")
            all_good = False
    
    return all_good

def check_templates():
    """检查模板文件"""
    print("\n📄 检查模板文件...")
    
    required_templates = [
        'base.html',
        'index.html',
        'login.html',
        'register.html',
        'dashboard.html',
        'workout.html',
        'admin.html'
    ]
    
    all_good = True
    
    for template in required_templates:
        template_path = os.path.join('templates', template)
        if os.path.exists(template_path):
            size = os.path.getsize(template_path)
            print(f"✅ {template} ({size} bytes)")
        else:
            print(f"❌ {template} - 缺失")
            all_good = False
    
    return all_good

def generate_report():
    """生成检查报告"""
    print("\n📊 系统状态报告")
    print("=" * 50)
    
    checks = [
        ("关键文件", check_files()),
        ("数据库", check_database()),
        ("Python依赖", check_dependencies()),
        ("AI配置", check_ai_config()),
        ("静态资源", check_static_resources()),
        ("模板文件", check_templates())
    ]
    
    passed = sum(1 for _, result in checks if result)
    total = len(checks)
    
    print(f"\n总检查项: {total}")
    print(f"通过: {passed} ✅")
    print(f"失败: {total - passed} ❌")
    print(f"通过率: {(passed/total*100):.1f}%")
    
    if passed == total:
        print("\n🎉 系统状态良好，可以正常运行！")
        print("💡 建议运行 'python start_system.py' 启动系统")
    else:
        print("\n⚠️  系统存在问题，需要修复以下项目:")
        for name, result in checks:
            if not result:
                print(f"   - {name}")
        print("\n💡 建议:")
        print("   1. 检查缺失的文件和目录")
        print("   2. 安装缺失的依赖包: pip install -r requirements.txt")
        print("   3. 运行 'python start_system.py' 初始化数据库")

def main():
    """主函数"""
    print_header()
    generate_report()
    
    print(f"\n📝 详细日志已保存到控制台")
    print("🔧 如需技术支持，请提供以上检查结果")

if __name__ == "__main__":
    main()
