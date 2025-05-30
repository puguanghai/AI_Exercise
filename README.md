# 🏋️‍♂️ 智能健身指导系统

一个基于AI视觉技术的智能健身指导系统，能够实时分析用户的健身动作，提供个性化的训练建议和数据跟踪。该系统使用最新的计算机视觉和人工智能技术，为用户提供专业级的健身指导体验。

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3+-green.svg)](https://flask.palletsprojects.com)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10+-orange.svg)](https://mediapipe.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📚 目录
- [功能特色](#-功能特色)
- [环境要求](#-环境要求)
- [快速开始](#-快速开始)
- [系统配置](#-系统配置)
- [使用指南](#-使用指南)
- [项目架构](#-项目架构)
- [安全特性](#-安全特性)
- [更新日志](#-更新日志)
- [部署说明](#-部署说明)
- [常见问题解答](#-常见问题解答)

## 🎯 功能特色

### 核心功能
- **🔍 实时动作识别**: 利用MediaPipe技术实时分析健身动作
- **👤 个性化计划**: AI根据用户数据制定专属健身计划
- **📊 数据跟踪分析**: 详细记录和分析训练数据
- **🤖 AI智能助手**: 24小时在线健身顾问，支持多种AI模型
- **🏃‍♂️ 多样化运动**: 支持俯卧撑、深蹲、仰卧起坐等多种动作
- **📱 便捷易用**: 无需下载APP，网页即可使用，支持移动端

### 支持的运动类型（8种完整运动）
- 💪 **俯卧撑 (Push-ups)**
  - 功能：锻炼胸肌、三头肌和核心肌群
  - 计数标准：系统自动识别下降和上升动作
  - 动作要领：保持身体平直，肘部贴近身体
  
- 🦵 **深蹲 (Squats)**
  - 功能：强化腿部肌肉和臀部力量
  - 计数标准：膝盖弯曲达到指定角度
  - 动作要领：保持背部挺直，膝盖不超过脚尖

- 🏃 **仰卧起坐 (Sit-ups)**
  - 功能：增强腹部核心肌群力量
  - 计数标准：上身抬起到指定高度
  - 动作要领：保持颈部自然，避免拉伤

- 🧘 **平板支撑 (Plank)**
  - 功能：全面锻炼核心稳定性
  - 计时标准：保持正确姿势的持续时间
  - 动作要领：全身绷直，保持呼吸均匀

- ⚡ **开合跳 (Jumping Jacks)**
  - 功能：全身有氧运动，提高心肺功能
  - 计数标准：手臂和腿部开合到位
  - 动作要领：动作协调，保持节奏

- 🚶 **弓步蹲 (Lunges)**
  - 功能：锻炼腿部肌肉和平衡能力
  - 计数标准：后腿下蹲到指定深度
  - 动作要领：前后腿成90度角

- 🔥 **波比跳 (Burpees)**
  - 功能：高强度全身训练动作
  - 计数标准：完成下蹲-支撑-跳跃组合
  - 动作要领：流畅衔接各个动作

- 🏆 **引体向上 (Pull-ups)**
  - 功能：锻炼背部和手臂肌肉
  - 计数标准：下巴超过横杆高度
  - 动作要领：控制速度，全程发力
### 数据分析
- 📈 运动次数统计和趋势分析
- 🔥 卡路里消耗计算
- 🎯 动作准确率评估
- ⏱️ 训练时长记录
- 📊 个人进度跟踪和可视化

## 🚀 快速开始

### 方法一：一键启动（推荐）

```bash
# 1. 快速启动（自动检查依赖和初始化）
python quick_start.py
```

### 方法二：手动安装

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 初始化数据库
python init_database.py

# 3. 启动应用
python app.py
```

### 访问系统
打开浏览器访问: **http://localhost:5000**

## ⚙️ 系统配置

### 1. 基础配置
配置文件位置：项目根目录下的 `.env` 文件

1. **创建配置文件**
```bash
# 复制示例配置文件
cp .env.example .env
```

2. **必要配置项**
```bash
# 管理员账户配置
ADMIN_USERNAME=小明                   # 管理员用户名
ADMIN_EMAIL=admin@fitness.com           # 管理员邮箱
ADMIN_PASSWORD=123456                # 管理员密码
ADMIN_DISPLAY_NAME=系统管理员            # 显示名称

# 服务器配置
FLASK_HOST=0.0.0.0                     # 服务器地址
FLASK_PORT=5000                        # 服务器端口
FLASK_ENV=development                  # 运行环境
FLASK_DEBUG=true                       # 调试模式

# AI服务配置
OPENROUTER_API_KEY=your-api-key-here   # OpenRouter API密钥
AI_MAX_TOKENS=1000                     # 最大响应长度
AI_TEMPERATURE=0.7                     # AI响应随机度(0-1)
AI_TIMEOUT=30                         # 请求超时时间

# ==================== AI服务配置 ====================
# 设置您的OpenRouter API密钥
OPENROUTER_API_KEY=your-api-key-here    # 替换为您的真实API密钥

# AI模型配置 - 支持多种模型
AI_MODEL_DEEPSEEK=deepseek/deepseek-chat:free
AI_MODEL_GEMINI=google/gemini-2.0-flash-exp:free
AI_MODEL_DEEPSEEK_V3=deepseek/deepseek-chat-v3-0324:free

# AI服务参数
AI_MAX_TOKENS=1000                      # 最大回复长度
AI_TEMPERATURE=0.7                      # 回复创造性(0-1)
AI_TIMEOUT=30                          # 请求超时时间(秒)

# ==================== 数据库配置 ====================
DATABASE_URL=sqlite:///fitness_app.db   # SQLite数据库
# DATABASE_URL=mysql://user:pass@host/db  # MySQL数据库
# DATABASE_URL=postgresql://user:pass@host/db  # PostgreSQL数据库

# ==================== 服务器配置 ====================
FLASK_HOST=0.0.0.0                     # 服务器地址
FLASK_PORT=5000                        # 服务器端口
FLASK_DEBUG=true                       # 调试模式
FLASK_ENV=development                  # 运行环境

# ==================== 8种运动阈值配置 ====================
# 俯卧撑参数
PUSHUP_DOWN_THRESHOLD=70
PUSHUP_UP_THRESHOLD=140

# 深蹲参数
SQUAT_DOWN_THRESHOLD=80
SQUAT_UP_THRESHOLD=160

# 仰卧起坐参数
SITUP_DOWN_THRESHOLD=60
SITUP_UP_THRESHOLD=120

# 平板支撑参数
PLANK_MIN_ANGLE=160
PLANK_MAX_ANGLE=180

# 开合跳参数
JUMPING_JACKS_ARM_THRESHOLD=120
JUMPING_JACKS_LEG_THRESHOLD=60

# 弓步蹲参数
LUNGE_DOWN_THRESHOLD=90
LUNGE_UP_THRESHOLD=170

# 波比跳参数
BURPEES_SQUAT_THRESHOLD=90
BURPEES_PLANK_THRESHOLD=160

# 引体向上参数
PULLUP_DOWN_THRESHOLD=100
PULLUP_UP_THRESHOLD=150
```

### 配置说明
- **管理员配置**: 修改后重启系统即可使用新的管理员账户
- **AI配置**: 需要有效的OpenRouter API密钥才能使用AI功能
- **运动阈值**: 可根据实际需要调整各运动的检测敏感度

### 默认账户
- **超级管理员**: 小明 / 123456
- **示例用户**: 张三 / 123456, 李四 / 123456, 王五 / 123456

## 🎮 使用指南

### 1. 👤 用户注册/登录
- 新用户注册账户，设置用户名和密码
- 已有用户直接登录系统

### 2. ⚙️ 个人资料设置
- 完善身高、体重、年龄等基本信息
- 设置健身目标（减重/增肌/塑形）
- 上传个人头像

### 3. 🏋️‍♂️ 开始训练
- 在训练页面选择运动类型
- 允许浏览器访问摄像头权限
- 按照屏幕提示进行标准动作
- 系统实时分析动作并自动计数
- 查看实时反馈和准确率

### 4. 📊 数据分析
- 查看训练历史记录和统计图表
- 分析个人进步趋势
- 对比不同时期的表现
- 导出训练数据报告

### 5. 🤖 AI助手交互
- 点击右下角AI助手图标
- 询问健身、营养、训练相关问题
- 获得专业的个性化建议
- 支持拖拽和全屏模式

### 6. 🛠️ 管理功能（管理员）
- 用户管理：查看、编辑、删除用户
- 数据统计：系统使用情况分析
- 系统维护：备份、日志查看
- 数据导出：批量导出系统数据

## 🏗️ 技术架构

### 后端技术栈
- **🐍 Flask 2.3+**: 轻量级Web框架
- **🗄️ SQLAlchemy**: 数据库ORM，支持SQLite/MySQL/PostgreSQL
- **🤖 MediaPipe 0.10+**: Google的姿态检测框架
- **👁️ OpenCV 4.8+**: 计算机视觉库
- **🧠 TensorFlow 2.13+**: 深度学习框架
- **🔑 Flask-Login**: 用户认证管理
- **⚙️ Python-dotenv**: 环境变量管理

### 前端技术栈
- **🎨 Bootstrap 5**: 响应式UI框架
- **📊 Chart.js**: 数据可视化
- **⚡ JavaScript ES6+**: 现代交互逻辑
- **📹 WebRTC**: 摄像头访问
- **🎭 FontAwesome**: 图标库

### AI服务集成
- **🔗 OpenRouter API**: 多模型AI服务聚合
- **🤖 DeepSeek**: 高性能对话模型
- **💎 Google Gemini**: 多模态AI模型
- **🔄 可扩展**: 支持添加更多AI服务

## � 项目结构

```
AI_Exercise/
├── 📄 config.py              # 配置管理
├── 🗃️ init_database.py       # 数据库初始化
├── 🚀 quick_start.py         # 快速启动脚本
├── 🌐 app.py                 # 主应用文件
├── 📋 requirements.txt       # 依赖包列表
├── 🔧 .env.example          # 环境变量示例
├── 🤖 models/               # AI模型目录
│   ├── pose_analyzer.py     # 姿态分析器
│   └── data_recorder.py     # 数据记录器
├── 🎨 static/               # 静态资源
│   ├── css/style.css        # 样式文件
│   ├── js/                  # JavaScript文件
│   └── uploads/             # 文件上传目录
├── 📄 templates/            # HTML模板
│   ├── base.html            # 基础模板
│   ├── index.html           # 首页
│   ├── dashboard.html       # 用户仪表盘
│   ├── workout.html         # 训练页面
│   ├── profile.html         # 个人资料
│   └── admin.html           # 管理面板
├── 📊 logs/                 # 日志目录
├── 💾 backups/              # 备份目录
└── 🗄️ fitness_app.db        # SQLite数据库
```

## 🔌 API接口

### 用户认证
```http
POST /login          # 用户登录
POST /register       # 用户注册
GET  /logout         # 用户登出
```

### 训练数据
```http
POST /save_workout        # 保存训练数据
GET  /get_workout_data    # 获取训练历史
GET  /api/user_data       # 获取用户统计
GET  /api/workout_detail  # 获取训练详情
```

### AI助手
```http
POST /ai_chat        # AI对话接口
```

### 管理功能
```http
GET  /admin                    # 管理面板
GET  /admin/user/<id>          # 获取用户信息
PUT  /admin/user/<id>          # 更新用户信息
POST /admin/user               # 创建用户
DELETE /admin/user/<id>        # 删除用户
POST /admin/export_data        # 导出数据
POST /admin/backup_system      # 系统备份
```

## 🛠️ 开发指南

### 数据库初始化

```bash
# 重置数据库
python reset_system.py --reset

# 仅创建表结构，不添加示例数据
python init_database.py --no-sample
```

### 环境配置

```bash
# 开发环境
export FLASK_ENV=development
python quick_start.py

# 生产环境
export FLASK_ENV=production
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🔒 安全特性

- **🔐 密码哈希**: 使用Werkzeug安全哈希
- **🛡️ CSRF保护**: 防止跨站请求伪造
- **👥 权限控制**: 基于角色的访问控制
- **� 操作日志**: 记录关键操作
- **🔒 会话管理**: 安全的用户会话

## 🤝 贡献指南

1. 🍴 Fork 项目
2. 🌿 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 💾 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 📤 推送到分支 (`git push origin feature/AmazingFeature`)
5. 🔄 开启 Pull Request

## 📝 更新日志

### v2.0.0 (2025-05-30)
- ✨ **全新功能**
  - 新增8种标准健身动作识别
  - AI助手支持多模型选择
  - 实时动作评分系统
  - 个性化训练计划生成

- 🔧 **系统重构**
  - 统一配置管理系统
  - 独立的数据库初始化工具
  - 一键式系统维护脚本
  - 完整的系统监控功能

- 🎨 **界面优化**
  - 全新的响应式设计
  - 优化移动端体验
  - 改进视觉反馈效果
  - 增强用户交互体验

- 📊 **数据分析**
  - 详细的训练数据统计
  - 可视化进度追踪
  - 智能训练建议
  - 数据导出功能

- 🛠️ **开发优化**
  - 规范化代码结构
  - 完善开发文档
  - 增加单元测试
  - 优化部署流程

### v1.0.0 (2025-05-15)
- 🎯 基础功能上线
  - 实现基础动作识别
  - 简单的用户管理
  - 基础数据记录
  - 简单的AI对话

### 🔮 v2.1.0 (开发中)
- 计划功能
  - 社交系统和排行榜
  - 更多运动类型支持
  - 训练计划推送
  - 数据分析增强

## 🙏 致谢

### 开源项目
- [MediaPipe](https://mediapipe.dev/) - 提供先进的计算机视觉解决方案
- [Flask](https://flask.palletsprojects.com/) - 轻量级Web框架
- [TensorFlow](https://tensorflow.org/) - 强大的深度学习框架
- [Bootstrap](https://getbootstrap.com/) - 优秀的前端框架
- [Chart.js](https://www.chartjs.org/) - 数据可视化库

### 特别感谢
- 感谢所有测试和反馈问题的用户
- 感谢提供建议和改进意见的健身教练
- 感谢帮助完善文档的贡献者


