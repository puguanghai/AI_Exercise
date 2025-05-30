#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库调试脚本
"""

import sqlite3
import os

def check_database():
    """检查数据库"""
    db_path = 'instance/fitness_app_dev.db'
    
    if not os.path.exists(db_path):
        print(f"❌ 数据库文件不存在: {db_path}")
        return
    
    print(f"✅ 数据库文件存在: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 获取所有表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"📊 数据库表: {[t[0] for t in tables]}")
        
        # 检查fitness_plan表结构
        cursor.execute("PRAGMA table_info(fitness_plan)")
        columns = cursor.fetchall()
        print("\n🏗️  fitness_plan表结构:")
        for col in columns:
            print(f"   {col[1]} ({col[2]}) - {'NOT NULL' if col[3] else 'NULL'}")
        
        # 检查数据
        cursor.execute("SELECT COUNT(*) FROM fitness_plan")
        count = cursor.fetchone()[0]
        print(f"\n📈 fitness_plan表记录数: {count}")
        
        # 检查用户数据
        cursor.execute("SELECT COUNT(*) FROM user")
        user_count = cursor.fetchone()[0]
        print(f"👥 用户数: {user_count}")
        
        if user_count > 0:
            cursor.execute("SELECT id, username FROM user LIMIT 3")
            users = cursor.fetchall()
            print("用户列表:")
            for user in users:
                print(f"   ID: {user[0]}, 用户名: {user[1]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ 数据库检查失败: {e}")

def test_fitness_plan_operations():
    """测试健身计划操作"""
    print("\n🧪 测试健身计划操作...")
    
    try:
        from app import app, db, FitnessPlan, User
        
        with app.app_context():
            # 获取第一个用户
            user = User.query.first()
            if not user:
                print("❌ 没有用户数据")
                return
            
            print(f"✅ 找到用户: {user.username} (ID: {user.id})")
            
            # 尝试创建健身计划
            test_plan = FitnessPlan(
                user_id=user.id,
                plan_name="测试计划",
                plan_content="这是一个测试计划内容",
                frequency="每周3次",
                tips='["建议1", "建议2"]'
            )
            
            db.session.add(test_plan)
            db.session.commit()
            
            print(f"✅ 健身计划创建成功，ID: {test_plan.id}")
            
            # 查询计划
            plans = FitnessPlan.query.filter_by(user_id=user.id).all()
            print(f"✅ 用户健身计划数量: {len(plans)}")
            
            for plan in plans:
                print(f"   计划: {plan.plan_name} (ID: {plan.id})")
            
            # 删除测试计划
            db.session.delete(test_plan)
            db.session.commit()
            print("✅ 测试计划已删除")
            
    except Exception as e:
        print(f"❌ 健身计划操作测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🔍 数据库调试")
    print("=" * 40)
    
    check_database()
    test_fitness_plan_operations()
