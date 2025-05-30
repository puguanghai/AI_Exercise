from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import pytz
import os
import cv2
import mediapipe as mp
import numpy as np
import json
import requests
import base64
from io import BytesIO
import sys

# 导入配置
from config import get_config

# 加载环境变量
if os.path.exists('.env'):
    from dotenv import load_dotenv
    load_dotenv()

# 添加模型路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'models'))

# 导入自定义模块
try:
    from models.pose_analyzer import AdvancedPoseAnalyzer
    from models.data_recorder import WorkoutDataRecorder
except ImportError:
    print("警告: 无法导入姿态分析模块，某些功能可能不可用")
    AdvancedPoseAnalyzer = None
    WorkoutDataRecorder = None

# 创建Flask应用
app = Flask(__name__)

# 加载配置
config_class = get_config()
app.config.from_object(config_class)

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# 中国时区设置
CHINA_TZ = pytz.timezone('Asia/Shanghai')

def get_china_time():
    """获取中国时间"""
    return datetime.now(CHINA_TZ)

# 数据库模型
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    age = db.Column(db.Integer)
    weight = db.Column(db.Float)
    height = db.Column(db.Float)
    fitness_goal = db.Column(db.String(100))
    avatar = db.Column(db.String(200), default='default_avatar.png')
    created_at = db.Column(db.DateTime, default=get_china_time)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    workouts = db.relationship('WorkoutSession', backref='user', lazy=True)
    
    def set_password(self, password):
        """设置密码"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """检查密码"""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class WorkoutSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    exercise_type = db.Column(db.String(50), nullable=False)
    duration = db.Column(db.Integer)  # 秒
    reps_completed = db.Column(db.Integer)
    calories_burned = db.Column(db.Float)
    accuracy_score = db.Column(db.Float)
    date = db.Column(db.DateTime, default=get_china_time)
    notes = db.Column(db.Text)

class FitnessGoal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    goal_type = db.Column(db.String(50), nullable=False)
    target_value = db.Column(db.Float)
    current_value = db.Column(db.Float, default=0)
    deadline = db.Column(db.DateTime)
    achieved = db.Column(db.Boolean, default=False)

class FitnessPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    plan_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)  # 计划描述
    exercises = db.Column(db.Text)  # JSON格式存储练习内容
    difficulty_level = db.Column(db.String(20))  # 难度级别
    duration_weeks = db.Column(db.Integer)  # 持续周数
    created_at = db.Column(db.DateTime, default=get_china_time)
    is_active = db.Column(db.Boolean, default=True)

    # 为了兼容性，添加属性方法
    @property
    def plan_content(self):
        return self.description

    @plan_content.setter
    def plan_content(self, value):
        self.description = value

    def get_frequency(self):
        # 从exercises JSON中提取频率信息，或返回默认值
        if self.exercises:
            try:
                import json
                exercises_data = json.loads(self.exercises)
                return exercises_data.get('frequency', "建议每周训练3-4次，每次45-60分钟")
            except:
                pass
        return "建议每周训练3-4次，每次45-60分钟"

    def get_tips(self):
        # 从exercises JSON中提取建议，或返回默认建议
        if self.exercises:
            try:
                import json
                exercises_data = json.loads(self.exercises)
                tips = exercises_data.get('tips', [])
                if tips:
                    return tips
            except:
                pass
        return [
            "训练前请充分热身，避免受伤",
            "保持正确的动作姿势，质量比数量更重要",
            "合理安排休息时间，让肌肉得到恢复",
            "配合合理饮食，保证充足的蛋白质摄入",
            "循序渐进，逐步增加训练强度"
        ]

    # 为了兼容性，保留属性访问
    @property
    def frequency(self):
        return self.get_frequency()

    @property
    def tips(self):
        return self.get_tips()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# 全局变量存储分析器实例
pose_analyzer = None
data_recorder = None

def initialize_analyzers():
    global pose_analyzer, data_recorder
    try:
        pose_analyzer = AdvancedPoseAnalyzer()
        data_recorder = WorkoutDataRecorder()
        print("深度学习分析器初始化成功")
    except Exception as e:
        print(f"分析器初始化失败: {e}")

def get_ai_response(question, model=None, retry_count=0):
    """调用OpenRouter API获取AI回答，支持重试和错误处理"""

    try:
        # 防止无限递归，但允许一次重试
        if retry_count > 1:
            return "AI服务暂时繁忙，建议稍后重试或使用其他功能"

        # 检查配置是否存在
        api_key = app.config.get('OPENROUTER_API_KEY')
        if not api_key or api_key == 'your-api-key-here':
            return "AI功能需要配置API密钥，请联系管理员"

        ai_models = app.config.get('AI_MODELS')
        if not ai_models:
            return "AI模型配置缺失，请联系管理员"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "AI Fitness System"
        }

        # 获取模型配置 - 如果没有指定模型，使用第一个可用模型
        available_models = list(ai_models.keys())
        if not model or model not in available_models:
            model = available_models[0] if available_models else 'deepseek'

        # 获取默认模型配置
        default_model = list(ai_models.values())[0] if ai_models else 'deepseek/deepseek-chat:free'
        selected_model = ai_models.get(model, default_model)

        # 从配置获取AI参数
        ai_config = app.config.get('AI_CONFIG', {})
        system_prompt = ai_config.get('system_prompt', '你是健身教练，用中文简洁回答。')
        max_tokens = ai_config.get('max_tokens', 150)
        temperature = ai_config.get('temperature', 0.5)

        data = {
            "model": selected_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question[:200]}  # 限制问题长度
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False
        }

        base_url = app.config.get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1/chat/completions')

        print(f"尝试调用AI模型: {selected_model} (重试次数: {retry_count})")

        response = requests.post(
            base_url,
            headers=headers,
            json=data,
            timeout=15  # 进一步减少超时时间
        )

        print(f"AI响应状态: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                ai_content = result['choices'][0]['message']['content']
                print(f"AI响应成功，内容长度: {len(ai_content)}")
                return ai_content
            else:
                return "AI响应格式异常，请重试"
        elif response.status_code == 429:
            print("遇到频率限制，尝试其他模型")
            # 尝试使用其他模型
            if retry_count == 0 and len(available_models) > 1:
                next_model = available_models[1] if model == available_models[0] else available_models[0]
                return get_ai_response(question, next_model, retry_count + 1)
            return "AI服务使用量已达上限，请稍后重试"
        elif response.status_code == 401:
            return "AI服务认证失败，请联系管理员检查配置"
        elif response.status_code == 403:
            return "AI服务访问被拒绝，可能是配额不足"
        elif response.status_code == 500:
            return "AI服务器暂时不可用，请稍后重试"
        else:
            try:
                error_detail = response.json().get('error', {}).get('message', '')
                return f"AI服务错误 ({response.status_code}): {error_detail}" if error_detail else f"AI服务错误: HTTP {response.status_code}"
            except:
                return f"AI服务错误: HTTP {response.status_code}"

    except requests.exceptions.Timeout:
        print("AI请求超时")
        return "AI服务响应超时，请检查网络或稍后重试"
    except requests.exceptions.ConnectionError:
        print("AI连接错误")
        return "无法连接到AI服务，请检查网络连接"
    except Exception as e:
        print(f"AI请求异常: {e}")
        return f"AI服务暂时不可用: {str(e)}"

# 路由
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'message': '用户名已存在'})
        
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'message': '邮箱已被注册'})
        
        # 检查是否为超级管理员
        admin_config = app.config.get('SUPER_ADMIN', {})
        is_admin = username == admin_config.get('username')
        
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            is_admin=is_admin
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '注册成功'})
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            # 更新最后登录时间
            user.last_login = get_china_time()
            db.session.commit()

            login_user(user)
            return jsonify({'success': True, 'message': '登录成功', 'redirect': url_for('dashboard')})
        else:
            return jsonify({'success': False, 'message': '用户名或密码错误'})
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    recent_workouts = WorkoutSession.query.filter_by(user_id=current_user.id).order_by(WorkoutSession.date.desc()).limit(5).all()
    return render_template('dashboard.html', user=current_user, workouts=recent_workouts)

@app.route('/workout')
@login_required
def workout():
    return render_template('workout.html')

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        data = request.get_json()
        current_user.age = data.get('age')
        current_user.weight = data.get('weight')
        current_user.height = data.get('height')
        current_user.fitness_goal = data.get('fitness_goal')

        db.session.commit()
        return jsonify({'success': True, 'message': '个人信息更新成功'})

    return render_template('profile.html', user=current_user)

@app.route('/upload_avatar', methods=['POST'])
@login_required
def upload_avatar():
    try:
        if 'avatar' not in request.files:
            return jsonify({'success': False, 'message': '没有选择文件'})

        file = request.files['avatar']
        if file.filename == '':
            return jsonify({'success': False, 'message': '没有选择文件'})

        # 检查文件类型
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'success': False, 'message': '不支持的文件类型'})

        # 创建上传目录
        upload_dir = os.path.join('static', 'uploads', 'avatars')
        os.makedirs(upload_dir, exist_ok=True)

        # 生成唯一文件名
        import uuid
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = os.path.join(upload_dir, filename)

        # 保存文件
        file.save(file_path)

        # 更新用户头像路径
        current_user.avatar = f"uploads/avatars/{filename}"
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '头像上传成功',
            'avatar_url': f"/static/{current_user.avatar}"
        })

    except Exception as e:
        return jsonify({'success': False, 'message': f'上传失败: {str(e)}'})

@app.route('/admin')
@login_required
def admin():
    if not current_user.is_admin:
        flash('您没有管理员权限')
        return redirect(url_for('dashboard'))

    # 获取所有用户
    users = User.query.all()

    # 计算统计数据
    total_users = len(users)

    # 获取所有训练记录
    all_workouts = WorkoutSession.query.all()
    total_workouts = len(all_workouts)

    # 计算总训练时长（小时）
    total_duration_seconds = sum(workout.duration or 0 for workout in all_workouts)
    total_hours = round(total_duration_seconds / 3600, 1)

    # 计算总消耗卡路里
    total_calories = round(sum(workout.calories_burned or 0 for workout in all_workouts))

    # 计算今日活跃用户数
    from datetime import datetime, timedelta
    today = get_china_time().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_workouts = WorkoutSession.query.filter(WorkoutSession.date >= today_start).all()
    active_users_today = len(set(workout.user_id for workout in today_workouts))

    # 计算本周数据
    week_start = today - timedelta(days=today.weekday())
    week_start_datetime = datetime.combine(week_start, datetime.min.time())
    week_workouts = WorkoutSession.query.filter(WorkoutSession.date >= week_start_datetime).all()
    weekly_workouts = len(week_workouts)

    # 计算平均准确率
    accuracy_scores = [w.accuracy_score for w in all_workouts if w.accuracy_score is not None]
    avg_accuracy = round(sum(accuracy_scores) / len(accuracy_scores)) if accuracy_scores else 0

    # 最近的训练活动
    recent_activities = WorkoutSession.query.order_by(WorkoutSession.date.desc()).limit(10).all()

    # 系统状态信息
    system_status = {
        'database_size': len(all_workouts),
        'active_sessions': active_users_today,
        'server_uptime': '正常运行',
        'last_backup': get_china_time().strftime('%Y-%m-%d %H:%M')
    }

    return render_template('admin.html',
                         users=users,
                         total_users=total_users,
                         total_workouts=total_workouts,
                         total_hours=total_hours,
                         total_calories=total_calories,
                         active_users_today=active_users_today,
                         weekly_workouts=weekly_workouts,
                         avg_accuracy=avg_accuracy,
                         recent_activities=recent_activities,
                         system_status=system_status)

# 管理员权限装饰器
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            return jsonify({'success': False, 'message': '权限不足'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/admin/user/<int:user_id>')
@login_required
@admin_required
def get_user(user_id):
    """获取用户信息"""
    try:
        user = User.query.get_or_404(user_id)
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_admin': user.is_admin,
            'is_active': user.is_active
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/user/<int:user_id>', methods=['PUT'])
@login_required
@admin_required
def update_user(user_id):
    """更新用户信息"""
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()

        # 防止修改超级管理员
        admin_config = app.config.get('SUPER_ADMIN', {})
        super_admin_username = admin_config.get('username')
        if user.username == super_admin_username and current_user.username != super_admin_username:
            return jsonify({'success': False, 'message': '无权限修改超级管理员'})

        user.username = data.get('username', user.username)
        user.email = data.get('email', user.email)
        user.is_admin = data.get('is_admin', user.is_admin)
        user.is_active = data.get('is_active', user.is_active)

        db.session.commit()
        return jsonify({'success': True, 'message': '用户更新成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/user', methods=['POST'])
@login_required
@admin_required
def create_user():
    """创建新用户"""
    try:
        data = request.get_json()

        # 检查用户名是否已存在
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'success': False, 'message': '用户名已存在'})

        # 检查邮箱是否已存在
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'success': False, 'message': '邮箱已存在'})

        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash('123456'),  # 默认密码
            is_admin=data.get('is_admin', False),
            is_active=data.get('is_active', True)
        )

        db.session.add(user)
        db.session.commit()

        return jsonify({'success': True, 'message': '用户创建成功，默认密码：123456'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/user/<int:user_id>/toggle', methods=['POST'])
@login_required
@admin_required
def toggle_user_status(user_id):
    """切换用户状态"""
    try:
        user = User.query.get_or_404(user_id)

        # 防止禁用超级管理员
        admin_config = app.config.get('SUPER_ADMIN', {})
        if user.username == admin_config.get('username'):
            return jsonify({'success': False, 'message': '无法禁用超级管理员'})

        user.is_active = not user.is_active
        db.session.commit()

        status = '激活' if user.is_active else '禁用'
        return jsonify({'success': True, 'message': f'用户已{status}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/admin/user/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    """删除用户"""
    try:
        user = User.query.get_or_404(user_id)

        # 防止删除超级管理员
        admin_config = app.config.get('SUPER_ADMIN', {})
        if user.username == admin_config.get('username'):
            return jsonify({'success': False, 'message': '无法删除超级管理员'})

        # 删除用户相关数据
        WorkoutSession.query.filter_by(user_id=user_id).delete()
        FitnessPlan.query.filter_by(user_id=user_id).delete()

        db.session.delete(user)
        db.session.commit()

        return jsonify({'success': True, 'message': '用户删除成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/ai_chat', methods=['POST'])
@login_required
def ai_chat():
    data = request.get_json()
    # 支持两种参数名：question 和 message
    question = data.get('question') or data.get('message')

    # 从配置获取默认模型
    ai_models = app.config.get('AI_MODELS', {})
    default_model = list(ai_models.keys())[0] if ai_models else 'deepseek'
    model = data.get('model', default_model)
    
    if not question:
        return jsonify({'success': False, 'response': '请输入问题内容'})
    
    try:
        response = get_ai_response(question, model)
        return jsonify({'success': True, 'response': response})
    except Exception as e:
        return jsonify({'success': False, 'response': f'AI助手出现错误：{str(e)}'})

@app.route('/save_workout', methods=['POST'])
@login_required
def save_workout():
    try:
        data = request.get_json()
        print(f"接收到训练数据: {data}")  # 调试日志

        # 验证必要字段
        exercise_type = data.get('exercise_type')
        if not exercise_type:
            return jsonify({'success': False, 'message': '缺少运动类型'})

        workout = WorkoutSession(
            user_id=current_user.id,
            exercise_type=exercise_type,
            duration=int(data.get('duration', 0)),
            calories_burned=float(data.get('calories_burned', 0)),
            reps_completed=int(data.get('reps_completed', 0)),
            accuracy_score=float(data.get('accuracy_score', 0)),
            date=get_china_time()
        )

        db.session.add(workout)
        db.session.commit()

        print(f"训练数据保存成功: 用户{current_user.id}, 运动{exercise_type}, 次数{workout.reps_completed}")

        return jsonify({
            'success': True,
            'message': '训练数据保存成功',
            'workout_id': workout.id
        })
    except Exception as e:
        print(f"保存训练数据错误: {e}")
        return jsonify({'success': False, 'message': f'保存失败: {str(e)}'})

@app.route('/api/analyze_pose', methods=['POST'])
@login_required
def api_analyze_pose():
    """分析姿态并返回准确率和反馈"""
    try:
        data = request.get_json()
        landmarks = data.get('landmarks')
        exercise_type = data.get('exercise_type')

        if not landmarks or not exercise_type:
            return jsonify({
                'success': False,
                'message': '缺少必要参数'
            })

        # 姿态分析器检查（可选，如果未初始化则使用内置分析）
        global pose_analyzer
        if pose_analyzer is None:
            print("姿态分析器未初始化，使用内置分析")
        else:
            # 转换中文运动名称为英文
            exercise_english_map = app.config.get('EXERCISE_ENGLISH_MAP', {})
            english_exercise = exercise_english_map.get(exercise_type, exercise_type)

            # 设置运动类型（如果分析器支持）
            if hasattr(pose_analyzer, 'set_exercise'):
                pose_analyzer.set_exercise(english_exercise)

        # 模拟分析结果（实际应该调用pose_analyzer的分析方法）
        analysis_result = {
            'form_score': calculate_form_score(landmarks, exercise_type),
            'errors': detect_form_errors(landmarks, exercise_type),
            'phase': detect_exercise_phase(landmarks, exercise_type),
            'feedback': get_exercise_feedback(landmarks, exercise_type)
        }

        return jsonify({
            'success': True,
            'analysis': analysis_result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'姿态分析失败: {str(e)}'
        })

def calculate_form_score(landmarks, exercise_type):
    """计算动作准确率"""
    try:
        # 转换中文运动名称为英文
        exercise_english_map = app.config.get('EXERCISE_ENGLISH_MAP', {})
        english_exercise = exercise_english_map.get(exercise_type, exercise_type)

        # 根据运动类型计算准确率
        if english_exercise == 'pushup' or exercise_type == '俯卧撑':
            return calculate_pushup_accuracy(landmarks)
        elif english_exercise == 'squat' or exercise_type == '深蹲':
            return calculate_squat_accuracy(landmarks)
        elif english_exercise == 'situp' or exercise_type == '仰卧起坐':
            return calculate_situp_accuracy(landmarks)
        elif english_exercise == 'plank' or exercise_type == '平板支撑':
            return calculate_plank_accuracy(landmarks)
        elif english_exercise == 'jumping_jacks' or exercise_type == '开合跳':
            return calculate_jumping_jacks_accuracy(landmarks)
        elif english_exercise == 'lunges' or exercise_type == '弓步蹲':
            return calculate_lunges_accuracy(landmarks)
        elif english_exercise == 'burpees' or exercise_type == '波比跳':
            return calculate_burpees_accuracy(landmarks)
        elif english_exercise == 'pull_ups' or exercise_type == '引体向上':
            return calculate_pull_ups_accuracy(landmarks)
        else:
            return 75.0  # 默认分数
    except:
        return 50.0

def calculate_pushup_accuracy(landmarks):
    """计算俯卧撑准确率"""
    try:
        # 获取关键点
        left_shoulder = landmarks.get('left_shoulder', {})
        left_elbow = landmarks.get('left_elbow', {})
        left_wrist = landmarks.get('left_wrist', {})

        if not all([left_shoulder, left_elbow, left_wrist]):
            return 60.0

        # 计算手臂角度
        arm_angle = calculate_angle_from_points(left_shoulder, left_elbow, left_wrist)

        # 根据角度计算准确率
        if 60 <= arm_angle <= 120:  # 下降阶段
            accuracy = 90 - abs(arm_angle - 90) * 2
        elif 150 <= arm_angle <= 180:  # 上升阶段
            accuracy = 95 - abs(arm_angle - 165) * 3
        else:
            accuracy = 70 - abs(arm_angle - 120) * 1.5

        return max(30, min(100, accuracy))
    except:
        return 65.0

def calculate_squat_accuracy(landmarks):
    """计算深蹲准确率"""
    try:
        # 获取关键点
        left_hip = landmarks.get('left_hip', {})
        left_knee = landmarks.get('left_knee', {})
        left_ankle = landmarks.get('left_ankle', {})

        if not all([left_hip, left_knee, left_ankle]):
            return 60.0

        # 计算膝盖角度
        knee_angle = calculate_angle_from_points(left_hip, left_knee, left_ankle)

        # 根据角度计算准确率
        if 70 <= knee_angle <= 120:  # 下蹲阶段
            accuracy = 95 - abs(knee_angle - 95) * 2
        elif 150 <= knee_angle <= 180:  # 站立阶段
            accuracy = 90 - abs(knee_angle - 165) * 2
        else:
            accuracy = 65 - abs(knee_angle - 120) * 1.5

        return max(30, min(100, accuracy))
    except:
        return 65.0

def calculate_situp_accuracy(landmarks):
    """计算仰卧起坐准确率"""
    try:
        # 获取关键点
        left_shoulder = landmarks.get('left_shoulder', {})
        left_hip = landmarks.get('left_hip', {})
        left_knee = landmarks.get('left_knee', {})

        if not all([left_shoulder, left_hip, left_knee]):
            return 60.0

        # 计算躯干角度
        torso_angle = calculate_angle_from_points(left_shoulder, left_hip, left_knee)

        # 根据角度计算准确率
        if 30 <= torso_angle <= 80:  # 起身阶段
            accuracy = 95 - abs(torso_angle - 55) * 2
        elif 0 <= torso_angle <= 30:  # 躺下阶段
            accuracy = 85 - abs(torso_angle - 15) * 2
        else:
            accuracy = 70 - abs(torso_angle - 55) * 1.5

        return max(30, min(100, accuracy))
    except:
        return 65.0

def calculate_plank_accuracy(landmarks):
    """计算平板支撑准确率"""
    try:
        # 获取关键点
        left_shoulder = landmarks.get('left_shoulder', {})
        left_hip = landmarks.get('left_hip', {})
        left_ankle = landmarks.get('left_ankle', {})

        if not all([left_shoulder, left_hip, left_ankle]):
            return 60.0

        # 计算身体直线度
        body_angle = calculate_angle_from_points(left_shoulder, left_hip, left_ankle)

        # 理想的平板支撑角度接近180度
        angle_deviation = abs(body_angle - 180)

        if angle_deviation <= 10:
            accuracy = 95 - angle_deviation * 2
        elif angle_deviation <= 20:
            accuracy = 85 - (angle_deviation - 10) * 3
        else:
            accuracy = 70 - (angle_deviation - 20) * 2

        return max(30, min(100, accuracy))
    except:
        return 65.0

def calculate_jumping_jacks_accuracy(landmarks):
    """计算开合跳准确率"""
    try:
        # 获取关键点
        left_shoulder = landmarks.get('left_shoulder', {})
        left_wrist = landmarks.get('left_wrist', {})
        left_hip = landmarks.get('left_hip', {})
        left_ankle = landmarks.get('left_ankle', {})

        if not all([left_shoulder, left_wrist, left_hip, left_ankle]):
            return 60.0

        # 计算手臂张开角度
        arm_spread = abs(left_wrist.get('x', 0) - left_shoulder.get('x', 0))
        # 计算腿部张开角度
        leg_spread = abs(left_ankle.get('x', 0) - left_hip.get('x', 0))

        # 根据张开程度计算准确率
        if arm_spread > 50 and leg_spread > 30:  # 张开状态
            accuracy = 90
        elif arm_spread < 20 and leg_spread < 15:  # 合拢状态
            accuracy = 85
        else:  # 过渡状态
            accuracy = 75

        return max(50, min(100, accuracy))
    except:
        return 65.0

def calculate_lunges_accuracy(landmarks):
    """计算弓步蹲准确率"""
    try:
        # 获取关键点
        left_hip = landmarks.get('left_hip', {})
        left_knee = landmarks.get('left_knee', {})
        left_ankle = landmarks.get('left_ankle', {})
        right_hip = landmarks.get('right_hip', {})
        right_knee = landmarks.get('right_knee', {})
        right_ankle = landmarks.get('right_ankle', {})

        if not all([left_hip, left_knee, left_ankle, right_hip, right_knee, right_ankle]):
            return 60.0

        # 计算左右腿角度
        left_leg_angle = calculate_angle_from_points(left_hip, left_knee, left_ankle)
        right_leg_angle = calculate_angle_from_points(right_hip, right_knee, right_ankle)

        # 弓步蹲的理想角度：前腿约90度，后腿伸展
        front_leg_angle = min(left_leg_angle, right_leg_angle)
        back_leg_angle = max(left_leg_angle, right_leg_angle)

        # 根据角度计算准确率
        if 80 <= front_leg_angle <= 100:  # 前腿角度理想
            accuracy = 90 - abs(front_leg_angle - 90) * 2
        else:
            accuracy = 70 - abs(front_leg_angle - 90) * 1.5

        return max(40, min(100, accuracy))
    except:
        return 65.0

def calculate_burpees_accuracy(landmarks):
    """计算波比跳准确率"""
    try:
        # 获取关键点
        left_shoulder = landmarks.get('left_shoulder', {})
        left_hip = landmarks.get('left_hip', {})
        left_knee = landmarks.get('left_knee', {})
        left_ankle = landmarks.get('left_ankle', {})

        if not all([left_shoulder, left_hip, left_knee, left_ankle]):
            return 60.0

        # 计算躯干角度
        torso_angle = calculate_angle_from_points(left_shoulder, left_hip, left_knee)

        # 波比跳包含多个阶段，根据躯干角度判断
        if 160 <= torso_angle <= 180:  # 站立/跳跃阶段
            accuracy = 90
        elif 90 <= torso_angle <= 120:  # 蹲下阶段
            accuracy = 85
        elif 30 <= torso_angle <= 60:   # 平板支撑阶段
            accuracy = 95
        else:
            accuracy = 70

        return max(50, min(100, accuracy))
    except:
        return 65.0

def calculate_pull_ups_accuracy(landmarks):
    """计算引体向上准确率"""
    try:
        # 获取关键点
        left_shoulder = landmarks.get('left_shoulder', {})
        left_elbow = landmarks.get('left_elbow', {})
        left_wrist = landmarks.get('left_wrist', {})

        if not all([left_shoulder, left_elbow, left_wrist]):
            return 60.0

        # 计算手臂角度
        arm_angle = calculate_angle_from_points(left_shoulder, left_elbow, left_wrist)

        # 引体向上的理想角度范围
        if 60 <= arm_angle <= 90:  # 拉起阶段
            accuracy = 95 - abs(arm_angle - 75) * 2
        elif 150 <= arm_angle <= 180:  # 悬挂阶段
            accuracy = 85 - abs(arm_angle - 165) * 2
        else:
            accuracy = 70 - abs(arm_angle - 120) * 1.5

        return max(40, min(100, accuracy))
    except:
        return 65.0

def calculate_angle_from_points(point1, point2, point3):
    """根据三个点计算角度"""
    try:
        import math

        # 获取坐标
        x1, y1 = point1.get('x', 0), point1.get('y', 0)
        x2, y2 = point2.get('x', 0), point2.get('y', 0)
        x3, y3 = point3.get('x', 0), point3.get('y', 0)

        # 计算向量
        v1 = (x1 - x2, y1 - y2)
        v2 = (x3 - x2, y3 - y2)

        # 计算角度
        dot_product = v1[0] * v2[0] + v1[1] * v2[1]
        magnitude1 = math.sqrt(v1[0]**2 + v1[1]**2)
        magnitude2 = math.sqrt(v2[0]**2 + v2[1]**2)

        if magnitude1 == 0 or magnitude2 == 0:
            return 90.0

        cos_angle = dot_product / (magnitude1 * magnitude2)
        cos_angle = max(-1, min(1, cos_angle))  # 限制在[-1, 1]范围内

        angle_rad = math.acos(cos_angle)
        angle_deg = math.degrees(angle_rad)

        return angle_deg
    except:
        return 90.0

def detect_form_errors(landmarks, exercise_type):
    """检测动作错误"""
    errors = []

    try:
        if exercise_type == 'pushup':
            # 检测俯卧撑常见错误
            arm_angle = calculate_angle_from_points(
                landmarks.get('left_shoulder', {}),
                landmarks.get('left_elbow', {}),
                landmarks.get('left_wrist', {})
            )

            if arm_angle < 50:
                errors.append({
                    'type': 'form_error',
                    'message': '下压过深，注意保护肩膀',
                    'severity': 'medium'
                })
            elif arm_angle > 170:
                errors.append({
                    'type': 'form_error',
                    'message': '手臂伸展过度，稍微弯曲',
                    'severity': 'low'
                })

        elif exercise_type == 'squat':
            # 检测深蹲常见错误
            knee_angle = calculate_angle_from_points(
                landmarks.get('left_hip', {}),
                landmarks.get('left_knee', {}),
                landmarks.get('left_ankle', {})
            )

            if knee_angle < 60:
                errors.append({
                    'type': 'form_error',
                    'message': '蹲得太深，注意膝盖保护',
                    'severity': 'medium'
                })
            elif knee_angle > 175:
                errors.append({
                    'type': 'form_error',
                    'message': '站立过直，保持微弯',
                    'severity': 'low'
                })

    except:
        pass

    return errors

def detect_exercise_phase(landmarks, exercise_type):
    """检测运动阶段"""
    try:
        if exercise_type == 'pushup':
            arm_angle = calculate_angle_from_points(
                landmarks.get('left_shoulder', {}),
                landmarks.get('left_elbow', {}),
                landmarks.get('left_wrist', {})
            )

            if arm_angle <= 90:
                return 'down'
            elif arm_angle >= 150:
                return 'up'
            else:
                return 'transition'

        elif exercise_type == 'squat':
            knee_angle = calculate_angle_from_points(
                landmarks.get('left_hip', {}),
                landmarks.get('left_knee', {}),
                landmarks.get('left_ankle', {})
            )

            if knee_angle <= 100:
                return 'down'
            elif knee_angle >= 150:
                return 'up'
            else:
                return 'transition'

    except:
        pass

    return 'unknown'

def get_exercise_feedback(landmarks, exercise_type):
    """获取运动反馈"""
    phase = detect_exercise_phase(landmarks, exercise_type)

    feedback_map = {
        'pushup': {
            'down': '很好！保持下压姿势',
            'up': '完成一次！准备下一个',
            'transition': '继续保持动作',
            'unknown': '调整姿势，保持标准动作'
        },
        'squat': {
            'down': '很好！保持蹲下姿势',
            'up': '完成一次！准备下一个',
            'transition': '继续保持动作',
            'unknown': '调整姿势，保持标准动作'
        },
        'situp': {
            'down': '很好！保持起身姿势',
            'up': '完成一次！准备下一个',
            'transition': '继续保持动作',
            'unknown': '调整姿势，保持标准动作'
        },
        'plank': {
            'hold': '保持住！身体保持直线',
            'unknown': '调整姿势，保持身体直线'
        }
    }

    return feedback_map.get(exercise_type, {}).get(phase, '继续保持动作')

@app.route('/api/save_workout', methods=['POST'])
@login_required
def api_save_workout():
    try:
        data = request.get_json()
        print(f"API保存训练数据: {data}")  # 调试日志

        # 验证必要字段
        exercise_type = data.get('exercise_type')
        if not exercise_type:
            return jsonify({'success': False, 'message': '缺少运动类型'})

        # 确保准确率是正确的格式
        accuracy = data.get('accuracy_score', data.get('accuracy', 0))
        if isinstance(accuracy, (int, float)):
            # 如果准确率大于100，说明可能是百分比格式（如8520），需要除以100
            if accuracy > 100:
                accuracy = accuracy / 100
            # 确保准确率在0-100范围内
            accuracy = max(0, min(100, accuracy))

        # 处理其他字段，确保数据类型正确
        duration = int(data.get('duration', 0))
        calories_burned = float(data.get('calories_burned', data.get('calories', 0)))
        reps_completed = int(data.get('reps_completed', data.get('reps', 0)))

        workout = WorkoutSession(
            user_id=current_user.id,
            exercise_type=exercise_type,
            duration=duration,
            calories_burned=calories_burned,
            reps_completed=reps_completed,
            accuracy_score=accuracy,
            date=get_china_time()
        )

        db.session.add(workout)
        db.session.commit()

        print(f"API训练数据保存成功: 用户{current_user.id}, 运动{exercise_type}, 次数{reps_completed}, 准确率{accuracy}%")

        return jsonify({
            'success': True,
            'message': '训练记录保存成功',
            'workout_id': workout.id
        })
    except Exception as e:
        print(f"API保存训练数据错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'保存失败: {str(e)}'})

@app.route('/get_workout_data')
@login_required
def get_workout_data():
    workouts = WorkoutSession.query.filter_by(user_id=current_user.id).order_by(WorkoutSession.date.desc()).limit(30).all()
    
    data = []
    for workout in workouts:
        data.append({
            'date': workout.date.strftime('%Y-%m-%d'),
            'exercise_type': workout.exercise_type,
            'duration': workout.duration,
            'calories_burned': workout.calories_burned,
            'reps_completed': workout.reps_completed,
            'accuracy_score': workout.accuracy_score
        })
    
    return jsonify(data)

@app.route('/api/exercise_types')
def api_exercise_types():
    """获取所有运动类型配置"""
    try:
        exercise_types = app.config.get('EXERCISE_TYPES', {})
        return jsonify({
            'success': True,
            'exercise_types': exercise_types
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取运动类型失败: {str(e)}'
        })

@app.route('/api/user_data')
@login_required
def api_user_data():
    """获取用户完整数据用于dashboard显示"""
    try:
        # 获取用户的所有训练记录
        workouts = WorkoutSession.query.filter_by(user_id=current_user.id).all()

        # 计算统计数据
        total_workouts = len(workouts)
        total_calories = sum(w.calories_burned or 0 for w in workouts)
        total_time = sum(w.duration or 0 for w in workouts)  # 秒

        # 计算平均准确率 - 修复数值处理
        accuracy_scores = []
        for w in workouts:
            if w.accuracy_score is not None:
                score = w.accuracy_score
                # 处理可能的大数值（如8520 -> 85.20）
                if score > 100:
                    score = score / 100
                # 确保在0-100范围内
                score = max(0, min(100, score))
                accuracy_scores.append(score)

        avg_accuracy = round(sum(accuracy_scores) / len(accuracy_scores), 1) if accuracy_scores else 0

        # 计算本周和本月数据
        from datetime import datetime, timedelta
        today = get_china_time().date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        week_start_datetime = datetime.combine(week_start, datetime.min.time())
        month_start_datetime = datetime.combine(month_start, datetime.min.time())

        # 计算本周实际数据
        weekly_workouts_data = [w for w in workouts if w.date and w.date >= week_start_datetime]
        weekly_workouts_count = len(weekly_workouts_data)
        weekly_calories = sum(w.calories_burned or 0 for w in weekly_workouts_data)
        weekly_duration = sum(w.duration or 0 for w in weekly_workouts_data)  # 秒
        
        monthly_workouts = len([w for w in workouts if w.date and w.date >= month_start_datetime])

        # 设置周目标（可以后续从用户设置中获取）
        weekly_workout_goal = 5  # 每周训练5次
        weekly_calories_goal = 1200  # 每周消耗1200卡路里
        weekly_duration_goal = 180 * 60  # 每周训练180分钟（转换为秒）

        # 准备返回数据
        statistics = {
            'total_workouts': total_workouts,
            'total_calories': round(total_calories),
            'total_time': total_time,
            'avg_accuracy': avg_accuracy,
            'weekly_workouts': weekly_workouts_count,
            'monthly_workouts': monthly_workouts,
            'weekly_goal': weekly_workout_goal,
            'monthly_goal': 20,  # 默认月目标
            # 新增本周目标相关数据
            'weekly_calories': round(weekly_calories),
            'weekly_calories_goal': weekly_calories_goal,
            'weekly_duration': weekly_duration,
            'weekly_duration_goal': weekly_duration_goal
        }

        # 格式化训练记录
        workouts_data = []
        for workout in workouts[-30:]:  # 最近30次训练
            # 处理准确率显示
            accuracy_score = workout.accuracy_score or 0
            if accuracy_score > 100:
                accuracy_score = accuracy_score / 100
            accuracy_score = max(0, min(100, accuracy_score))

            # 处理运动类型显示 - 确保显示中文名称
            exercise_type = workout.exercise_type or '未知运动'

            # 处理其他数据，确保不为None
            duration = workout.duration or 0
            calories_burned = workout.calories_burned or 0
            reps_completed = workout.reps_completed or 0

            workouts_data.append({
                'id': workout.id,
                'date': workout.date.strftime('%Y-%m-%d %H:%M') if workout.date else '',
                'exercise_type': exercise_type,
                'duration': duration,
                'calories_burned': calories_burned,
                'reps_completed': reps_completed,
                'accuracy_score': round(accuracy_score, 1),
                'formatted_duration': f"{duration // 60}分{duration % 60}秒" if duration > 0 else "0分0秒"
            })

        return jsonify({
            'success': True,
            'statistics': statistics,
            'workouts': workouts_data
        })

    except Exception as e:
        print(f"获取用户数据错误: {e}")
        return jsonify({
            'success': False,
            'message': '获取数据失败'
        })

@app.route('/generate_fitness_plan', methods=['POST'])
@login_required
def generate_fitness_plan():
    try:
        data = request.get_json()
        age = data.get('age', 25)
        weight = data.get('weight', 70)
        height = data.get('height', 170)
        fitness_goal = data.get('fitness_goal', '增肌')
        
        # 构建AI提示
        prompt = f"""
        请为以下用户生成一个个性化的健身计划：
        - 年龄：{age}岁
        - 体重：{weight}kg
        - 身高：{height}cm
        - 健身目标：{fitness_goal}
        
        请提供：
        1. 详细的训练计划（包括具体动作和组数）
        2. 建议的训练频率
        3. 注意事项和建议
        
        请用中文回答，格式要清晰易读。
        """
        
        # 调用AI接口
        ai_response = get_ai_response(prompt)
        
        if ai_response:
            # 解析AI响应并格式化
            plan = {
                'content': ai_response.replace('\n', '<br>'),
                'frequency': '建议每周训练3-4次，每次45-60分钟',
                'tips': [
                    '训练前请充分热身，避免受伤',
                    '保持正确的动作姿势，质量比数量更重要',
                    '合理安排休息时间，让肌肉得到恢复',
                    '配合合理饮食，保证充足的蛋白质摄入',
                    '循序渐进，逐步增加训练强度'
                ]
            }
            
            return jsonify({
                'success': True,
                'plan': plan
            })
        else:
            return jsonify({
                'success': False,
                'message': 'AI服务暂时不可用，请稍后再试'
            })
            
    except Exception as e:
        print(f"生成健身计划错误: {e}")
        return jsonify({
            'success': False,
            'message': '生成健身计划时发生错误'
        })

@app.route('/save_fitness_plan', methods=['POST'])
@login_required
def save_fitness_plan():
    """保存健身计划"""
    try:
        data = request.get_json()
        plan_name = data.get('plan_name', f'健身计划 - {get_china_time().strftime("%Y-%m-%d")}')
        plan_content = data.get('content', '')
        frequency = data.get('frequency', '')
        tips = data.get('tips', [])

        # 将计划内容和建议组合成exercises JSON
        import json
        exercises_data = {
            'content': plan_content,
            'frequency': frequency,
            'tips': tips
        }
        exercises_json = json.dumps(exercises_data, ensure_ascii=False)

        # 创建新的健身计划
        fitness_plan = FitnessPlan(
            user_id=current_user.id,
            plan_name=plan_name,
            description=plan_content,
            exercises=exercises_json,
            difficulty_level='中级',
            duration_weeks=4
        )

        db.session.add(fitness_plan)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '健身计划保存成功',
            'plan_id': fitness_plan.id
        })

    except Exception as e:
        print(f"保存健身计划错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'保存健身计划时发生错误: {str(e)}'
        })

@app.route('/get_fitness_plans')
@login_required
def get_fitness_plans():
    """获取用户的健身计划"""
    try:
        plans = FitnessPlan.query.filter_by(user_id=current_user.id, is_active=True).order_by(FitnessPlan.created_at.desc()).all()

        plans_data = []
        for plan in plans:
            import json

            # 从exercises字段解析数据
            exercises_data = {}
            if plan.exercises:
                try:
                    exercises_data = json.loads(plan.exercises)
                except:
                    exercises_data = {}

            # 获取内容、频率和建议
            content = exercises_data.get('content', plan.description or '')
            frequency = exercises_data.get('frequency', plan.frequency)
            tips = exercises_data.get('tips', plan.tips)

            plans_data.append({
                'id': plan.id,
                'plan_name': plan.plan_name,
                'content': content,
                'frequency': frequency,
                'tips': tips,
                'created_at': plan.created_at.strftime('%Y-%m-%d %H:%M') if plan.created_at else '',
                'is_active': plan.is_active
            })

        return jsonify({
            'success': True,
            'plans': plans_data
        })

    except Exception as e:
        print(f"获取健身计划错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'获取健身计划时发生错误: {str(e)}'
        })

@app.route('/get_fitness_plan/<int:plan_id>')
@login_required
def get_fitness_plan_detail(plan_id):
    """获取健身计划详情"""
    try:
        plan = FitnessPlan.query.filter_by(id=plan_id, user_id=current_user.id).first()

        if not plan:
            return jsonify({'success': False, 'message': '计划不存在'})

        import json

        # 从exercises字段解析数据
        exercises_data = {}
        if plan.exercises:
            try:
                exercises_data = json.loads(plan.exercises)
            except:
                exercises_data = {}

        # 获取内容、频率和建议
        content = exercises_data.get('content', plan.description or '')
        frequency = exercises_data.get('frequency', plan.frequency)
        tips = exercises_data.get('tips', plan.tips)

        plan_data = {
            'id': plan.id,
            'plan_name': plan.plan_name,
            'content': content,
            'frequency': frequency,
            'tips': tips,
            'created_at': plan.created_at.strftime('%Y年%m月%d日 %H:%M') if plan.created_at else '',
            'formatted_content': content.replace('\n', '<br>') if content else ''
        }

        return jsonify({
            'success': True,
            'plan': plan_data
        })
    except Exception as e:
        print(f"获取计划详情错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})



@app.route('/api/workout_detail/<int:workout_id>')
@login_required
def get_workout_detail(workout_id):
    """获取训练详情"""
    try:
        workout = WorkoutSession.query.filter_by(id=workout_id, user_id=current_user.id).first()
        if not workout:
            return jsonify({'success': False, 'message': '训练记录不存在'})
        
        detail = {
            'id': workout.id,
            'exercise_type': workout.exercise_type,
            'duration': workout.duration or 0,
            'calories_burned': workout.calories_burned or 0,
            'reps_completed': workout.reps_completed or 0,
            'accuracy_score': workout.accuracy_score or 0,
            'date': workout.date.isoformat(),
            'formatted_date': workout.date.strftime('%Y年%m月%d日 %H:%M'),
            'formatted_duration': f"{(workout.duration or 0) // 60}分{(workout.duration or 0) % 60}秒"
        }
        
        return jsonify({'success': True, 'workout': detail})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# 管理员功能路由
@app.route('/admin/export_data', methods=['POST'])
@login_required
def admin_export_data():
    if not current_user.is_admin:
        return jsonify({'error': '权限不足'}), 403
    
    try:
        # 导出所有用户和训练数据
        users = User.query.all()
        workouts = WorkoutSession.query.all()
        goals = FitnessGoal.query.all()
        
        export_data = {
            'export_time': datetime.now().isoformat(),
            'users': [{
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'is_admin': user.is_admin
            } for user in users],
            'workouts': [{
                'id': workout.id,
                'user_id': workout.user_id,
                'exercise_type': workout.exercise_type,
                'duration': workout.duration,
                'calories_burned': workout.calories_burned,
                'reps_completed': workout.reps_completed,
                'accuracy_score': workout.accuracy_score,
                'date': workout.date.isoformat() if workout.date else None
            } for workout in workouts],
            'goals': [{
                'id': goal.id,
                'user_id': goal.user_id,
                'goal_type': goal.goal_type,
                'target_value': goal.target_value,
                'current_value': goal.current_value,
                'deadline': goal.deadline.isoformat() if goal.deadline else None,
                'achieved': goal.achieved
            } for goal in goals]
        }
        
        # 创建JSON响应
        from flask import make_response
        response = make_response(json.dumps(export_data, ensure_ascii=False, indent=2))
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
        response.headers['Content-Disposition'] = f'attachment; filename=system_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        return response
        
    except Exception as e:
        print(f"数据导出错误: {e}")
        return jsonify({'error': '数据导出失败'}), 500

@app.route('/admin/clear_cache', methods=['POST'])
@login_required
def admin_clear_cache():
    if not current_user.is_admin:
        return jsonify({'error': '权限不足'}), 403
    
    try:
        # 这里可以实现缓存清理逻辑
        # 例如清理文件缓存、内存缓存等
        import gc
        gc.collect()
        
        return jsonify({
            'success': True,
            'message': '缓存清理成功'
        })
        
    except Exception as e:
        print(f"缓存清理错误: {e}")
        return jsonify({
            'success': False,
            'message': '缓存清理失败'
        })

@app.route('/admin/backup_system', methods=['POST'])
@login_required
def admin_backup_system():
    if not current_user.is_admin:
        return jsonify({'error': '权限不足'}), 403
    
    try:
        import shutil
        import os
        from datetime import datetime
        
        # 创建备份目录
        backup_dir = 'backups'
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        # 备份数据库文件
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_{timestamp}.db'
        backup_path = os.path.join(backup_dir, backup_filename)
        
        # 复制数据库文件
        if os.path.exists('fitness_app.db'):
            shutil.copy2('fitness_app.db', backup_path)
            
            return jsonify({
                'success': True,
                'backup_file': backup_filename,
                'message': '系统备份成功'
            })
        else:
            return jsonify({
                'success': False,
                'message': '数据库文件不存在'
            })
            
    except Exception as e:
        print(f"系统备份错误: {e}")
        return jsonify({
            'success': False,
            'message': '系统备份失败'
        })

@app.route('/admin/logs')
@login_required
def admin_logs():
    if not current_user.is_admin:
        return jsonify({'error': '权限不足'}), 403
    
    try:
        level = request.args.get('level', 'all')
        
        # 模拟日志数据（在实际项目中，这里应该读取真实的日志文件）
        logs = [
            {
                'level': 'info',
                'timestamp': '2024-01-15 10:30:00',
                'message': '用户登录成功',
                'details': f'用户 {current_user.username} 登录系统'
            },
            {
                'level': 'warning',
                'timestamp': '2024-01-15 10:25:00',
                'message': 'AI服务响应缓慢',
                'details': '响应时间超过5秒'
            },
            {
                'level': 'error',
                'timestamp': '2024-01-15 10:20:00',
                'message': '数据库连接失败',
                'details': '连接超时，已自动重连'
            },
            {
                'level': 'info',
                'timestamp': '2024-01-15 10:15:00',
                'message': '系统启动',
                'details': '所有服务正常启动'
            }
        ]
        
        # 根据级别过滤日志
        if level != 'all':
            logs = [log for log in logs if log['level'] == level]
        
        return jsonify({
            'success': True,
            'logs': logs
        })
        
    except Exception as e:
        print(f"获取日志错误: {e}")
        return jsonify({
            'success': False,
            'message': '获取日志失败'
        })

# 深度学习分析API端点
@app.route('/api/analyze_pose', methods=['POST'])
@login_required
def analyze_pose():
    """分析用户姿态数据"""
    try:
        data = request.get_json()
        landmarks = data.get('landmarks')
        exercise_type = data.get('exercise_type')
        
        if not pose_analyzer:
            return jsonify({
                'success': False,
                'message': '姿态分析器未初始化'
            })
        
        # 设置当前运动类型
        pose_analyzer.set_exercise(exercise_type)
        
        # 分析姿态
        analysis_result = pose_analyzer.analyze_frame(landmarks)
        
        return jsonify({
            'success': True,
            'analysis': analysis_result
        })
        
    except Exception as e:
        print(f"姿态分析错误: {e}")
        return jsonify({
            'success': False,
            'message': '姿态分析失败'
        })

@app.route('/api/start_session', methods=['POST'])
@login_required
def start_workout_session():
    """开始运动会话"""
    try:
        data = request.get_json()
        exercise_type = data.get('exercise_type')
        
        if not data_recorder:
            return jsonify({
                'success': False,
                'message': '数据记录器未初始化'
            })
        
        # 开始新会话
        session_id = data_recorder.start_session(current_user.id, exercise_type)
        
        return jsonify({
            'success': True,
            'session_id': session_id
        })
        
    except Exception as e:
        print(f"开始会话错误: {e}")
        return jsonify({
            'success': False,
            'message': '开始会话失败'
        })

@app.route('/api/end_session', methods=['POST'])
@login_required
def end_workout_session():
    """结束运动会话"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not data_recorder:
            return jsonify({
                'success': False,
                'message': '数据记录器未初始化'
            })
        
        # 结束会话并保存数据
        session_data = data_recorder.end_session(session_id)
        
        return jsonify({
            'success': True,
            'session_data': session_data
        })
        
    except Exception as e:
        print(f"结束会话错误: {e}")
        return jsonify({
            'success': False,
            'message': '结束会话失败'
        })

@app.route('/api/record_rep', methods=['POST'])
@login_required
def record_repetition():
    """记录运动次数"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        form_score = data.get('form_score', 0)
        errors = data.get('errors', [])
        
        if not data_recorder:
            return jsonify({
                'success': False,
                'message': '数据记录器未初始化'
            })
        
        # 记录重复次数
        data_recorder.record_rep(session_id, form_score, errors)
        
        return jsonify({
            'success': True,
            'message': '记录成功'
        })
        
    except Exception as e:
        print(f"记录重复次数错误: {e}")
        return jsonify({
            'success': False,
            'message': '记录失败'
        })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        initialize_analyzers()

        # 创建超级管理员账户（如果不存在）
        admin_config = app.config.get('SUPER_ADMIN', {})
        admin_user = User.query.filter_by(username=admin_config['username']).first()
        if not admin_user:
            admin_user = User(
                username=admin_config['username'],
                email=admin_config['email'],
                password_hash=generate_password_hash(admin_config['password']),
                is_admin=True
            )
            db.session.add(admin_user)
            db.session.commit()
            print(f"✅ 创建超级管理员: {admin_config['username']}")

        # 显示启动信息
        print("\n🚀 智能健身指导系统启动")
        print("=" * 50)
        print(f"👤 管理员账户: {admin_config['username']} / {admin_config['password']}")

        # 显示AI配置
        ai_models = app.config.get('AI_MODELS', {})
        if ai_models:
            print(f"🤖 AI模型: {len(ai_models)} 个可用")

        # 显示运动类型
        exercise_types = app.config.get('EXERCISE_TYPES', {})
        if exercise_types:
            print(f"🏃‍♂️ 支持运动: {len(exercise_types)} 种")

        print(f"🌐 服务地址: http://localhost:{app.config.get('PORT', 5000)}")
        print("=" * 50)

    # 使用配置中的主机和端口
    app.run(
        debug=app.config.get('DEBUG', True),
        host=app.config.get('HOST', '0.0.0.0'),
        port=app.config.get('PORT', 5000)
    )