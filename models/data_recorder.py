import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional
import os

class WorkoutDataRecorder:
    """运动数据记录器 - 准确统计和保存运动数据"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'fitness_app.db')
        self.db_path = db_path
        self.current_session = None
        self.session_data = {
            'reps': 0,
            'errors': [],
            'form_scores': [],
            'duration': 0,
            'calories_burned': 0,
            'start_time': None,
            'end_time': None
        }
        
    def start_session(self, user_id: int, exercise_type: str) -> str:
        """开始运动会话"""
        session_id = f"{user_id}_{exercise_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        self.current_session = {
            'session_id': session_id,
            'user_id': user_id,
            'exercise_type': exercise_type,
            'start_time': datetime.now(),
            'reps': 0,
            'errors': [],
            'form_scores': [],
            'total_score': 0,
            'calories_burned': 0,
            'analysis_data': []
        }
        
        return session_id
        
    def record_rep(self, analysis_data: Dict):
        """记录一次动作"""
        if not self.current_session:
            return
            
        self.current_session['reps'] += 1
        
        # 记录形态评分
        form_score = analysis_data.get('form_score', 0)
        self.current_session['form_scores'].append(form_score)
        
        # 记录错误
        errors = analysis_data.get('errors', [])
        for error in errors:
            self.current_session['errors'].append({
                'rep_number': self.current_session['reps'],
                'error_type': error.get('type'),
                'message': error.get('message'),
                'severity': error.get('severity'),
                'timestamp': datetime.now().isoformat()
            })
            
        # 记录详细分析数据
        self.current_session['analysis_data'].append({
            'rep_number': self.current_session['reps'],
            'timestamp': datetime.now().isoformat(),
            'analysis': analysis_data
        })
        
        # 计算卡路里消耗
        self._calculate_calories()
        
    def record_error(self, error_data: Dict):
        """记录实时错误"""
        if not self.current_session:
            return
            
        self.current_session['errors'].append({
            'rep_number': self.current_session['reps'],
            'error_type': error_data.get('type'),
            'message': error_data.get('message'),
            'severity': error_data.get('severity'),
            'timestamp': datetime.now().isoformat()
        })
        
    def end_session(self) -> Dict:
        """结束运动会话并保存数据"""
        if not self.current_session:
            return {'error': '没有活动的运动会话'}
            
        # 计算会话统计
        end_time = datetime.now()
        duration = (end_time - self.current_session['start_time']).total_seconds()
        
        # 计算平均评分
        avg_score = 0
        if self.current_session['form_scores']:
            avg_score = sum(self.current_session['form_scores']) / len(self.current_session['form_scores'])
            
        # 统计错误类型
        error_stats = self._calculate_error_stats()
        
        session_summary = {
            'session_id': self.current_session['session_id'],
            'user_id': self.current_session['user_id'],
            'exercise_type': self.current_session['exercise_type'],
            'start_time': self.current_session['start_time'].isoformat(),
            'end_time': end_time.isoformat(),
            'duration': duration,
            'reps': self.current_session['reps'],
            'avg_form_score': avg_score,
            'total_errors': len(self.current_session['errors']),
            'error_stats': error_stats,
            'calories_burned': self.current_session['calories_burned'],
            'performance_grade': self._calculate_performance_grade(avg_score, error_stats)
        }
        
        # 保存到数据库
        self._save_to_database(session_summary)
        
        # 重置会话
        self.current_session = None
        
        return session_summary
        
    def _calculate_calories(self):
        """计算卡路里消耗"""
        if not self.current_session:
            return
            
        # 基于运动类型和次数的卡路里计算
        exercise_calories = {
            'pushup': 0.5,      # 每次0.5卡路里
            'squat': 0.4,       # 每次0.4卡路里
            'situp': 0.3,       # 每次0.3卡路里
            'plank': 0.1,       # 每秒0.1卡路里
            'jumping_jacks': 0.6,
            'lunges': 0.4,
            'burpees': 1.0,
            'pull_ups': 0.8
        }
        
        exercise_type = self.current_session['exercise_type']
        base_calories = exercise_calories.get(exercise_type, 0.3)
        
        if exercise_type == 'plank':
            # 平板支撑按时间计算
            duration = (datetime.now() - self.current_session['start_time']).total_seconds()
            self.current_session['calories_burned'] = duration * base_calories
        else:
            # 其他运动按次数计算
            self.current_session['calories_burned'] = self.current_session['reps'] * base_calories
            
    def _calculate_error_stats(self) -> Dict:
        """计算错误统计"""
        error_types = {}
        severity_counts = {'high': 0, 'medium': 0, 'low': 0}
        
        for error in self.current_session['errors']:
            error_type = error.get('error_type', 'unknown')
            severity = error.get('severity', 'low')
            
            error_types[error_type] = error_types.get(error_type, 0) + 1
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
        return {
            'error_types': error_types,
            'severity_counts': severity_counts,
            'error_rate': len(self.current_session['errors']) / max(1, self.current_session['reps'])
        }
        
    def _calculate_performance_grade(self, avg_score: float, error_stats: Dict) -> str:
        """计算表现等级"""
        error_rate = error_stats.get('error_rate', 0)
        
        if avg_score >= 90 and error_rate < 0.1:
            return 'A+'
        elif avg_score >= 85 and error_rate < 0.2:
            return 'A'
        elif avg_score >= 80 and error_rate < 0.3:
            return 'B+'
        elif avg_score >= 75 and error_rate < 0.4:
            return 'B'
        elif avg_score >= 70 and error_rate < 0.5:
            return 'C+'
        elif avg_score >= 65:
            return 'C'
        else:
            return 'D'
            
    def _save_to_database(self, session_summary: Dict):
        """保存会话数据到数据库"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 创建表（如果不存在）
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS workout_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE,
                    user_id INTEGER,
                    exercise_type TEXT,
                    start_time TEXT,
                    end_time TEXT,
                    duration REAL,
                    reps INTEGER,
                    avg_form_score REAL,
                    total_errors INTEGER,
                    error_stats TEXT,
                    calories_burned REAL,
                    performance_grade TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 插入会话数据
            cursor.execute('''
                INSERT OR REPLACE INTO workout_sessions 
                (session_id, user_id, exercise_type, start_time, end_time, duration, 
                 reps, avg_form_score, total_errors, error_stats, calories_burned, performance_grade)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                session_summary['session_id'],
                session_summary['user_id'],
                session_summary['exercise_type'],
                session_summary['start_time'],
                session_summary['end_time'],
                session_summary['duration'],
                session_summary['reps'],
                session_summary['avg_form_score'],
                session_summary['total_errors'],
                json.dumps(session_summary['error_stats']),
                session_summary['calories_burned'],
                session_summary['performance_grade']
            ))
            
            # 保存详细错误数据
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS workout_errors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    rep_number INTEGER,
                    error_type TEXT,
                    message TEXT,
                    severity TEXT,
                    timestamp TEXT,
                    FOREIGN KEY (session_id) REFERENCES workout_sessions (session_id)
                )
            ''')
            
            for error in self.current_session['errors']:
                cursor.execute('''
                    INSERT INTO workout_errors 
                    (session_id, rep_number, error_type, message, severity, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    session_summary['session_id'],
                    error.get('rep_number', 0),
                    error.get('error_type', ''),
                    error.get('message', ''),
                    error.get('severity', ''),
                    error.get('timestamp', '')
                ))
                
            # 保存详细分析数据
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS workout_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    rep_number INTEGER,
                    timestamp TEXT,
                    analysis_data TEXT,
                    FOREIGN KEY (session_id) REFERENCES workout_sessions (session_id)
                )
            ''')
            
            for analysis in self.current_session['analysis_data']:
                cursor.execute('''
                    INSERT INTO workout_analysis 
                    (session_id, rep_number, timestamp, analysis_data)
                    VALUES (?, ?, ?, ?)
                ''', (
                    session_summary['session_id'],
                    analysis.get('rep_number', 0),
                    analysis.get('timestamp', ''),
                    json.dumps(analysis.get('analysis', {}))
                ))
                
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"数据库保存错误: {e}")
            
    def get_user_stats(self, user_id: int, days: int = 30) -> Dict:
        """获取用户统计数据"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 获取最近的会话数据
            cursor.execute('''
                SELECT exercise_type, reps, avg_form_score, calories_burned, performance_grade, start_time
                FROM workout_sessions 
                WHERE user_id = ? AND start_time >= datetime('now', '-{} days')
                ORDER BY start_time DESC
            '''.format(days), (user_id,))
            
            sessions = cursor.fetchall()
            
            if not sessions:
                return {'message': '没有找到运动记录'}
                
            # 统计数据
            total_reps = sum(session[1] for session in sessions)
            total_calories = sum(session[3] for session in sessions)
            avg_score = sum(session[2] for session in sessions) / len(sessions)
            
            exercise_counts = {}
            for session in sessions:
                exercise_type = session[0]
                exercise_counts[exercise_type] = exercise_counts.get(exercise_type, 0) + session[1]
                
            conn.close()
            
            return {
                'total_sessions': len(sessions),
                'total_reps': total_reps,
                'total_calories': total_calories,
                'avg_form_score': avg_score,
                'exercise_breakdown': exercise_counts,
                'recent_sessions': sessions[:10]  # 最近10次会话
            }
            
        except Exception as e:
            return {'error': f'获取统计数据失败: {e}'}
            
    def get_session_details(self, session_id: str) -> Dict:
        """获取会话详细信息"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 获取会话基本信息
            cursor.execute('''
                SELECT * FROM workout_sessions WHERE session_id = ?
            ''', (session_id,))
            
            session = cursor.fetchone()
            if not session:
                return {'error': '会话不存在'}
                
            # 获取错误详情
            cursor.execute('''
                SELECT * FROM workout_errors WHERE session_id = ?
            ''', (session_id,))
            
            errors = cursor.fetchall()
            
            # 获取分析数据
            cursor.execute('''
                SELECT * FROM workout_analysis WHERE session_id = ?
            ''', (session_id,))
            
            analysis_data = cursor.fetchall()
            
            conn.close()
            
            return {
                'session_info': session,
                'errors': errors,
                'analysis_data': analysis_data
            }
            
        except Exception as e:
            return {'error': f'获取会话详情失败: {e}'}