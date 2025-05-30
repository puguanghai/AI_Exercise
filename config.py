#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能健身指导系统 - 配置文件
Configuration file for AI Fitness Guidance System
"""

import os
from datetime import timedelta

class Config:
    """基础配置类"""
    
    # ==================== 基础系统配置 ====================
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-change-this-in-production'
    
    # 数据库配置
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///fitness_app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Flask配置
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.environ.get('FLASK_HOST', '0.0.0.0')
    PORT = int(os.environ.get('FLASK_PORT', 5000))
    
    # ==================== 超级管理员配置 ====================
    SUPER_ADMIN = {
        'username': os.environ.get('ADMIN_USERNAME'),
        'email': os.environ.get('ADMIN_EMAIL'),
        'password': os.environ.get('ADMIN_PASSWORD'),
        'display_name': os.environ.get('ADMIN_DISPLAY_NAME')
    }
    
    # ==================== AI服务配置 ====================
    # OpenRouter API配置
    OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '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')
    OPENROUTER_BASE_URL = os.environ.get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1/chat/completions')
    
    # AI模型配置
    AI_MODELS = {
        'deepseek': os.environ.get('AI_MODEL_DEEPSEEK', 'deepseek/deepseek-chat:free'),
        'gemini': os.environ.get('AI_MODEL_GEMINI', 'google/gemini-2.0-flash-exp:free'),
        'deepseek_v3': os.environ.get('AI_MODEL_DEEPSEEK_V3', 'deepseek/deepseek-chat-v3-0324:free')
    }
    
    # AI服务配置
    AI_CONFIG = {
        'max_tokens': int(os.environ.get('AI_MAX_TOKENS', 1000)),
        'temperature': float(os.environ.get('AI_TEMPERATURE', 0.7)),
        'timeout': int(os.environ.get('AI_TIMEOUT', 30)),
        'system_prompt': os.environ.get('AI_SYSTEM_PROMPT', 
            '你是一个专业的健身教练和营养师，能够为用户提供专业的健身建议、营养指导和运动计划。请用中文回答。')
    }
    
    # ==================== 文件上传配置 ====================
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'static/uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    ALLOWED_EXTENSIONS = {
        'images': {'png', 'jpg', 'jpeg', 'gif', 'webp'},
        'documents': {'pdf', 'doc', 'docx', 'txt'}
    }
    
    # ==================== 运动检测配置 ====================
    EXERCISE_CONFIG = {
        'detection_confidence': float(os.environ.get('DETECTION_CONFIDENCE', 0.5)),
        'tracking_confidence': float(os.environ.get('TRACKING_CONFIDENCE', 0.5)),
        'min_detection_confidence': float(os.environ.get('MIN_DETECTION_CONFIDENCE', 0.3)),
        'frame_rate': int(os.environ.get('FRAME_RATE', 30)),
        'video_width': int(os.environ.get('VIDEO_WIDTH', 640)),
        'video_height': int(os.environ.get('VIDEO_HEIGHT', 480))
    }
    
    # 运动类型配置
    EXERCISE_TYPES = {
        '俯卧撑': {
            'name': '俯卧撑',
            'english': 'pushup',
            'description': '锻炼胸肌、三头肌和核心肌群',
            'icon': 'fas fa-dumbbell',
            'calories_per_rep': 0.5
        },
        '深蹲': {
            'name': '深蹲',
            'english': 'squat',
            'description': '强化腿部肌肉和臀部力量',
            'icon': 'fas fa-running',
            'calories_per_rep': 0.4
        },
        '仰卧起坐': {
            'name': '仰卧起坐',
            'english': 'situp',
            'description': '增强腹部核心肌群力量',
            'icon': 'fas fa-heartbeat',
            'calories_per_rep': 0.3
        },
        '平板支撑': {
            'name': '平板支撑',
            'english': 'plank',
            'description': '全面锻炼核心稳定性',
            'icon': 'fas fa-chart-line',
            'calories_per_second': 0.1
        },
        '开合跳': {
            'name': '开合跳',
            'english': 'jumping_jacks',
            'description': '全身有氧运动，提高心肺功能',
            'icon': 'fas fa-bolt',
            'calories_per_rep': 0.6
        },
        '弓步蹲': {
            'name': '弓步蹲',
            'english': 'lunges',
            'description': '锻炼腿部肌肉和平衡能力',
            'icon': 'fas fa-walking',
            'calories_per_rep': 0.4
        },
        '波比跳': {
            'name': '波比跳',
            'english': 'burpees',
            'description': '高强度全身训练动作',
            'icon': 'fas fa-fire',
            'calories_per_rep': 1.2
        },
        '引体向上': {
            'name': '引体向上',
            'english': 'pull_ups',
            'description': '锻炼背部和手臂肌肉',
            'icon': 'fas fa-trophy',
            'calories_per_rep': 0.8
        }
    }

    # 英文到中文的映射
    EXERCISE_NAME_MAP = {
        'pushup': '俯卧撑',
        'squat': '深蹲',
        'situp': '仰卧起坐',
        'plank': '平板支撑',
        'jumping_jacks': '开合跳',
        'lunges': '弓步蹲',
        'burpees': '波比跳',
        'pull_ups': '引体向上'
    }

    # 中文到英文的映射
    EXERCISE_ENGLISH_MAP = {
        '俯卧撑': 'pushup',
        '深蹲': 'squat',
        '仰卧起坐': 'situp',
        '平板支撑': 'plank',
        '开合跳': 'jumping_jacks',
        '弓步蹲': 'lunges',
        '波比跳': 'burpees',
        '引体向上': 'pull_ups'
    }

    # 运动阈值配置
    EXERCISE_THRESHOLDS = {
        'pushup': {
            'down': int(os.environ.get('PUSHUP_DOWN_THRESHOLD', 70)),
            'up': int(os.environ.get('PUSHUP_UP_THRESHOLD', 140)),
            'sensitivity': os.environ.get('PUSHUP_SENSITIVITY', 'high')
        },
        'squat': {
            'down': int(os.environ.get('SQUAT_DOWN_THRESHOLD', 80)),
            'up': int(os.environ.get('SQUAT_UP_THRESHOLD', 160)),
            'sensitivity': os.environ.get('SQUAT_SENSITIVITY', 'high')
        },
        'situp': {
            'down': int(os.environ.get('SITUP_DOWN_THRESHOLD', 60)),
            'up': int(os.environ.get('SITUP_UP_THRESHOLD', 120)),
            'sensitivity': os.environ.get('SITUP_SENSITIVITY', 'high')
        },
        'plank': {
            'min_angle': int(os.environ.get('PLANK_MIN_ANGLE', 160)),
            'max_angle': int(os.environ.get('PLANK_MAX_ANGLE', 180)),
            'sensitivity': os.environ.get('PLANK_SENSITIVITY', 'high')
        },
        'jumping_jacks': {
            'arm_threshold': int(os.environ.get('JUMPING_JACKS_ARM_THRESHOLD', 120)),
            'leg_threshold': int(os.environ.get('JUMPING_JACKS_LEG_THRESHOLD', 60)),
            'sensitivity': os.environ.get('JUMPING_JACKS_SENSITIVITY', 'high')
        },
        'lunges': {
            'down': int(os.environ.get('LUNGE_DOWN_THRESHOLD', 90)),
            'up': int(os.environ.get('LUNGE_UP_THRESHOLD', 170)),
            'sensitivity': os.environ.get('LUNGE_SENSITIVITY', 'high')
        },
        'burpees': {
            'squat_threshold': int(os.environ.get('BURPEES_SQUAT_THRESHOLD', 90)),
            'plank_threshold': int(os.environ.get('BURPEES_PLANK_THRESHOLD', 160)),
            'jump_threshold': int(os.environ.get('BURPEES_JUMP_THRESHOLD', 150)),
            'sensitivity': os.environ.get('BURPEES_SENSITIVITY', 'high')
        },
        'pull_ups': {
            'down': int(os.environ.get('PULLUP_DOWN_THRESHOLD', 100)),
            'up': int(os.environ.get('PULLUP_UP_THRESHOLD', 150)),
            'sensitivity': os.environ.get('PULLUP_SENSITIVITY', 'high')
        }
    }
    
    # ==================== 安全配置 ====================
    # 会话配置
    PERMANENT_SESSION_LIFETIME = timedelta(
        days=int(os.environ.get('SESSION_LIFETIME_DAYS', 7))
    )
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # CSRF保护
    WTF_CSRF_ENABLED = os.environ.get('WTF_CSRF_ENABLED', 'True').lower() == 'true'
    WTF_CSRF_TIME_LIMIT = int(os.environ.get('WTF_CSRF_TIME_LIMIT', 3600))
    
    # ==================== 日志配置 ====================
    LOG_CONFIG = {
        'level': os.environ.get('LOG_LEVEL', 'INFO'),
        'file': os.environ.get('LOG_FILE', 'logs/fitness_app.log'),
        'max_size': int(os.environ.get('LOG_MAX_SIZE', 10 * 1024 * 1024)),  # 10MB
        'backup_count': int(os.environ.get('LOG_BACKUP_COUNT', 5)),
        'format': os.environ.get('LOG_FORMAT', 
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    }
    
    # ==================== 缓存配置 ====================
    CACHE_CONFIG = {
        'type': os.environ.get('CACHE_TYPE', 'simple'),
        'default_timeout': int(os.environ.get('CACHE_DEFAULT_TIMEOUT', 300)),
        'redis_url': os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    }
    
    # ==================== 邮件配置 ====================
    MAIL_CONFIG = {
        'server': os.environ.get('MAIL_SERVER', 'smtp.gmail.com'),
        'port': int(os.environ.get('MAIL_PORT', 587)),
        'use_tls': os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true',
        'username': os.environ.get('MAIL_USERNAME', ''),
        'password': os.environ.get('MAIL_PASSWORD', ''),
        'default_sender': os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@fitness.com')
    }
    
    # ==================== 备份配置 ====================
    BACKUP_CONFIG = {
        'enabled': os.environ.get('BACKUP_ENABLED', 'True').lower() == 'true',
        'directory': os.environ.get('BACKUP_DIRECTORY', 'backups'),
        'max_backups': int(os.environ.get('BACKUP_MAX_COUNT', 10)),
        'schedule': os.environ.get('BACKUP_SCHEDULE', 'daily'),  # daily, weekly, monthly
        'compress': os.environ.get('BACKUP_COMPRESS', 'True').lower() == 'true'
    }
    
    # ==================== 开发配置 ====================
    @staticmethod
    def init_app(app):
        """初始化应用配置"""
        pass

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or 'sqlite:///fitness_app_dev.db'

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # 生产环境特定配置
        import logging
        from logging.handlers import RotatingFileHandler
        
        if not app.debug:
            # 配置日志
            if not os.path.exists('logs'):
                os.mkdir('logs')
            file_handler = RotatingFileHandler(
                cls.LOG_CONFIG['file'],
                maxBytes=cls.LOG_CONFIG['max_size'],
                backupCount=cls.LOG_CONFIG['backup_count']
            )
            file_handler.setFormatter(logging.Formatter(cls.LOG_CONFIG['format']))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            app.logger.setLevel(logging.INFO)
            app.logger.info('Fitness App startup')

class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

# 配置字典
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

# 获取当前配置
def get_config():
    """获取当前环境配置"""
    env = os.environ.get('FLASK_ENV', 'development')
    return config.get(env, config['default'])
