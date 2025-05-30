import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
from typing import Dict, List, Tuple, Optional
import math
import json
from datetime import datetime

class AdvancedPoseAnalyzer:
    """高级姿态分析器 - 使用深度学习进行精确动作检测"""
    
    def __init__(self):
        # 初始化MediaPipe
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # 初始化姿态检测器
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,  # 使用最高精度模型
            enable_segmentation=True,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # 运动标准参数
        self.exercise_standards = {
            'pushup': {
                'arm_angle_down': (60, 120),  # 下降时手臂角度范围（放宽）
                'arm_angle_up': (150, 180),   # 上升时手臂角度范围（放宽）
                'body_alignment_threshold': 25,  # 身体直线度阈值（放宽）
                'hip_shoulder_angle': (150, 180),  # 髋肩角度（放宽）
                'min_depth': 0.2,  # 最小下降幅度（降低）
            },
            'squat': {
                'knee_angle_down': (60, 120),  # 下蹲时膝盖角度（放宽）
                'knee_angle_up': (150, 180),   # 站立时膝盖角度（放宽）
                'back_angle': (70, 110),       # 背部角度（放宽）
                'knee_foot_alignment': 30,     # 膝盖脚踝对齐度（放宽）
                'min_depth': 0.3,  # 最小下蹲幅度（降低）
            },
            'situp': {
                'torso_angle_down': (0, 40),   # 躺下时躯干角度（放宽）
                'torso_angle_up': (35, 100),    # 起身时躯干角度（放宽）
                'leg_stability': 20,           # 腿部稳定性（放宽）
                'neck_alignment': 25,          # 颈部对齐（放宽）
            },
            'plank': {
                'body_line_threshold': 20,     # 身体直线度（放宽）
                'hip_height_variance': 0.1,  # 髋部高度变化（放宽）
                'shoulder_stability': 10,      # 肩部稳定性（放宽）
                'hold_time_min': 5,          # 最小保持时间（降低）
            }
        }
        
        # 错误检测阈值
        self.error_thresholds = {
            'angle_deviation': 15,      # 角度偏差阈值
            'alignment_deviation': 20,  # 对齐偏差阈值
            'stability_threshold': 0.1, # 稳定性阈值
            'consistency_frames': 5     # 连续帧数要求
        }
        
        # 状态跟踪
        self.current_exercise = None
        self.exercise_state = 'ready'
        self.rep_count = 0
        self.error_history = []
        self.frame_buffer = []
        self.last_analysis = None
        
    def set_exercise(self, exercise_type: str):
        """设置当前运动类型"""
        self.current_exercise = exercise_type
        self.exercise_state = 'ready'
        self.rep_count = 0
        self.error_history = []
        self.frame_buffer = []
        
    def analyze_frame(self, frame: np.ndarray) -> Dict:
        """分析单帧图像"""
        if self.current_exercise is None:
            return {'error': '未设置运动类型'}
            
        # 转换颜色空间
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # 姿态检测
        results = self.pose.process(rgb_frame)
        
        if not results.pose_landmarks:
            return {'error': '未检测到人体姿态'}
            
        # 提取关键点
        landmarks = self._extract_landmarks(results.pose_landmarks)
        
        # 运动特定分析
        analysis = self._analyze_exercise_specific(landmarks)
        
        # 错误检测
        errors = self._detect_errors(landmarks, analysis)
        
        # 绘制检测结果
        annotated_frame = self._draw_analysis(frame, results, analysis, errors)
        
        # 更新状态
        self._update_exercise_state(analysis)
        
        result = {
            'landmarks': landmarks,
            'analysis': analysis,
            'errors': errors,
            'annotated_frame': annotated_frame,
            'rep_count': self.rep_count,
            'exercise_state': self.exercise_state,
            'timestamp': datetime.now().isoformat()
        }
        
        self.last_analysis = result
        return result
        
    def _extract_landmarks(self, pose_landmarks) -> Dict:
        """提取关键点坐标"""
        landmarks = {}
        
        # 定义关键点映射
        keypoint_map = {
            'nose': self.mp_pose.PoseLandmark.NOSE,
            'left_shoulder': self.mp_pose.PoseLandmark.LEFT_SHOULDER,
            'right_shoulder': self.mp_pose.PoseLandmark.RIGHT_SHOULDER,
            'left_elbow': self.mp_pose.PoseLandmark.LEFT_ELBOW,
            'right_elbow': self.mp_pose.PoseLandmark.RIGHT_ELBOW,
            'left_wrist': self.mp_pose.PoseLandmark.LEFT_WRIST,
            'right_wrist': self.mp_pose.PoseLandmark.RIGHT_WRIST,
            'left_hip': self.mp_pose.PoseLandmark.LEFT_HIP,
            'right_hip': self.mp_pose.PoseLandmark.RIGHT_HIP,
            'left_knee': self.mp_pose.PoseLandmark.LEFT_KNEE,
            'right_knee': self.mp_pose.PoseLandmark.RIGHT_KNEE,
            'left_ankle': self.mp_pose.PoseLandmark.LEFT_ANKLE,
            'right_ankle': self.mp_pose.PoseLandmark.RIGHT_ANKLE
        }
        
        for name, landmark_id in keypoint_map.items():
            landmark = pose_landmarks.landmark[landmark_id]
            landmarks[name] = {
                'x': landmark.x,
                'y': landmark.y,
                'z': landmark.z,
                'visibility': landmark.visibility
            }
            
        return landmarks
        
    def _analyze_exercise_specific(self, landmarks: Dict) -> Dict:
        """运动特定分析"""
        if self.current_exercise == 'pushup':
            return self._analyze_pushup(landmarks)
        elif self.current_exercise == 'squat':
            return self._analyze_squat(landmarks)
        elif self.current_exercise == 'situp':
            return self._analyze_situp(landmarks)
        elif self.current_exercise == 'plank':
            return self._analyze_plank(landmarks)
        else:
            return {'error': f'不支持的运动类型: {self.current_exercise}'}
            
    def _analyze_pushup(self, landmarks: Dict) -> Dict:
        """俯卧撑分析"""
        # 计算手臂角度
        left_arm_angle = self._calculate_angle(
            landmarks['left_shoulder'], landmarks['left_elbow'], landmarks['left_wrist']
        )
        right_arm_angle = self._calculate_angle(
            landmarks['right_shoulder'], landmarks['right_elbow'], landmarks['right_wrist']
        )
        
        # 计算身体直线度
        body_alignment = self._calculate_body_alignment(
            landmarks['left_shoulder'], landmarks['left_hip'], landmarks['left_ankle']
        )
        
        # 计算髋肩角度
        hip_shoulder_angle = self._calculate_angle(
            landmarks['left_hip'], landmarks['left_shoulder'], landmarks['right_shoulder']
        )
        
        # 判断动作阶段
        avg_arm_angle = (left_arm_angle + right_arm_angle) / 2
        standards = self.exercise_standards['pushup']
        
        if avg_arm_angle < standards['arm_angle_down'][1]:
            phase = 'down'
        elif avg_arm_angle > standards['arm_angle_up'][0]:
            phase = 'up'
        else:
            phase = 'transition'
            
        return {
            'left_arm_angle': left_arm_angle,
            'right_arm_angle': right_arm_angle,
            'avg_arm_angle': avg_arm_angle,
            'body_alignment': body_alignment,
            'hip_shoulder_angle': hip_shoulder_angle,
            'phase': phase,
            'form_score': self._calculate_pushup_score(left_arm_angle, right_arm_angle, body_alignment)
        }
        
    def _analyze_squat(self, landmarks: Dict) -> Dict:
        """深蹲分析"""
        # 计算膝盖角度
        left_knee_angle = self._calculate_angle(
            landmarks['left_hip'], landmarks['left_knee'], landmarks['left_ankle']
        )
        right_knee_angle = self._calculate_angle(
            landmarks['right_hip'], landmarks['right_knee'], landmarks['right_ankle']
        )
        
        # 计算背部角度
        back_angle = self._calculate_angle(
            landmarks['left_shoulder'], landmarks['left_hip'], landmarks['left_knee']
        )
        
        # 膝盖脚踝对齐
        knee_alignment = self._calculate_knee_alignment(landmarks)
        
        # 判断动作阶段
        avg_knee_angle = (left_knee_angle + right_knee_angle) / 2
        standards = self.exercise_standards['squat']
        
        if avg_knee_angle < standards['knee_angle_down'][1]:
            phase = 'down'
        elif avg_knee_angle > standards['knee_angle_up'][0]:
            phase = 'up'
        else:
            phase = 'transition'
            
        return {
            'left_knee_angle': left_knee_angle,
            'right_knee_angle': right_knee_angle,
            'avg_knee_angle': avg_knee_angle,
            'back_angle': back_angle,
            'knee_alignment': knee_alignment,
            'phase': phase,
            'form_score': self._calculate_squat_score(left_knee_angle, right_knee_angle, back_angle, knee_alignment)
        }
        
    def _analyze_situp(self, landmarks: Dict) -> Dict:
        """仰卧起坐分析"""
        # 计算躯干角度
        torso_angle = self._calculate_angle(
            landmarks['left_hip'], landmarks['left_shoulder'], landmarks['nose']
        )
        
        # 腿部稳定性
        leg_stability = self._calculate_leg_stability(landmarks)
        
        # 颈部对齐
        neck_alignment = self._calculate_neck_alignment(landmarks)
        
        # 判断动作阶段
        standards = self.exercise_standards['situp']
        
        if torso_angle < standards['torso_angle_down'][1]:
            phase = 'down'
        elif torso_angle > standards['torso_angle_up'][0]:
            phase = 'up'
        else:
            phase = 'transition'
            
        return {
            'torso_angle': torso_angle,
            'leg_stability': leg_stability,
            'neck_alignment': neck_alignment,
            'phase': phase,
            'form_score': self._calculate_situp_score(torso_angle, leg_stability, neck_alignment)
        }
        
    def _analyze_plank(self, landmarks: Dict) -> Dict:
        """平板支撑分析"""
        # 身体直线度
        body_line = self._calculate_plank_alignment(landmarks)
        
        # 髋部高度稳定性
        hip_stability = self._calculate_hip_stability(landmarks)
        
        # 肩部稳定性
        shoulder_stability = self._calculate_shoulder_stability(landmarks)
        
        return {
            'body_line': body_line,
            'hip_stability': hip_stability,
            'shoulder_stability': shoulder_stability,
            'phase': 'hold',
            'form_score': self._calculate_plank_score(body_line, hip_stability, shoulder_stability)
        }
        
    def _calculate_angle(self, point1: Dict, point2: Dict, point3: Dict) -> float:
        """计算三点角度"""
        # 向量计算
        v1 = np.array([point1['x'] - point2['x'], point1['y'] - point2['y']])
        v2 = np.array([point3['x'] - point2['x'], point3['y'] - point2['y']])
        
        # 计算角度
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        angle = np.arccos(cos_angle) * 180 / np.pi
        
        return angle
        
    def _calculate_body_alignment(self, shoulder: Dict, hip: Dict, ankle: Dict) -> float:
        """计算身体直线度"""
        # 计算肩膀到脚踝的直线与肩膀到髋部的角度偏差
        shoulder_ankle = np.array([ankle['x'] - shoulder['x'], ankle['y'] - shoulder['y']])
        shoulder_hip = np.array([hip['x'] - shoulder['x'], hip['y'] - shoulder['y']])
        
        cos_angle = np.dot(shoulder_ankle, shoulder_hip) / (np.linalg.norm(shoulder_ankle) * np.linalg.norm(shoulder_hip))
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        angle = np.arccos(cos_angle) * 180 / np.pi
        
        return 180 - angle  # 返回偏离直线的角度
        
    def _detect_errors(self, landmarks: Dict, analysis: Dict) -> List[Dict]:
        """检测动作错误"""
        errors = []
        
        if self.current_exercise == 'pushup':
            errors.extend(self._detect_pushup_errors(analysis))
        elif self.current_exercise == 'squat':
            errors.extend(self._detect_squat_errors(analysis))
        elif self.current_exercise == 'situp':
            errors.extend(self._detect_situp_errors(analysis))
        elif self.current_exercise == 'plank':
            errors.extend(self._detect_plank_errors(analysis))
            
        return errors
        
    def _detect_pushup_errors(self, analysis: Dict) -> List[Dict]:
        """检测俯卧撑错误"""
        errors = []
        standards = self.exercise_standards['pushup']
        
        # 检查手臂角度
        if analysis['phase'] == 'down':
            if analysis['avg_arm_angle'] > standards['arm_angle_down'][1]:
                errors.append({
                    'type': 'insufficient_depth',
                    'message': '下降深度不够，手臂弯曲角度过大',
                    'severity': 'medium',
                    'suggestion': '继续下降直到胸部接近地面'
                })
                
        # 检查身体对齐
        if analysis['body_alignment'] > standards['body_alignment_threshold']:
            errors.append({
                'type': 'body_misalignment',
                'message': '身体不够直，注意保持一条直线',
                'severity': 'high',
                'suggestion': '收紧核心，保持头、肩、髋、踝在一条直线上'
            })
            
        # 检查手臂不对称
        arm_diff = abs(analysis['left_arm_angle'] - analysis['right_arm_angle'])
        if arm_diff > 15:
            errors.append({
                'type': 'asymmetric_arms',
                'message': '两臂动作不对称',
                'severity': 'medium',
                'suggestion': '保持两臂同步，均匀发力'
            })
            
        return errors
        
    def _detect_squat_errors(self, analysis: Dict) -> List[Dict]:
        """检测深蹲错误"""
        errors = []
        standards = self.exercise_standards['squat']
        
        # 检查膝盖角度
        if analysis['phase'] == 'down':
            if analysis['avg_knee_angle'] > standards['knee_angle_down'][1]:
                errors.append({
                    'type': 'insufficient_depth',
                    'message': '下蹲深度不够',
                    'severity': 'medium',
                    'suggestion': '继续下蹲直到大腿与地面平行'
                })
                
        # 检查背部角度
        if analysis['back_angle'] < standards['back_angle'][0]:
            errors.append({
                'type': 'forward_lean',
                'message': '身体过度前倾',
                'severity': 'high',
                'suggestion': '保持胸部挺起，背部挺直'
            })
            
        # 检查膝盖对齐
        if analysis['knee_alignment'] > standards['knee_foot_alignment']:
            errors.append({
                'type': 'knee_misalignment',
                'message': '膝盖内扣或外展',
                'severity': 'high',
                'suggestion': '保持膝盖与脚尖方向一致'
            })
            
        return errors
        
    def _draw_analysis(self, frame: np.ndarray, results, analysis: Dict, errors: List[Dict]) -> np.ndarray:
        """绘制分析结果"""
        annotated_frame = frame.copy()
        
        # 绘制姿态骨架
        if results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                annotated_frame,
                results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
            )
            
        # 绘制分析信息
        self._draw_exercise_info(annotated_frame, analysis)
        
        # 绘制错误提示
        self._draw_errors(annotated_frame, errors)
        
        # 绘制状态信息
        self._draw_status_info(annotated_frame, analysis)
        
        return annotated_frame
        
    def _draw_exercise_info(self, frame: np.ndarray, analysis: Dict):
        """绘制运动信息"""
        height, width = frame.shape[:2]
        
        # 绘制角度信息
        if self.current_exercise == 'pushup':
            cv2.putText(frame, f"Left Arm: {analysis.get('left_arm_angle', 0):.1f}°", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f"Right Arm: {analysis.get('right_arm_angle', 0):.1f}°", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f"Body Align: {analysis.get('body_alignment', 0):.1f}°", 
                       (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                       
        elif self.current_exercise == 'squat':
            cv2.putText(frame, f"Left Knee: {analysis.get('left_knee_angle', 0):.1f}°", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f"Right Knee: {analysis.get('right_knee_angle', 0):.1f}°", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f"Back Angle: {analysis.get('back_angle', 0):.1f}°", 
                       (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                       
        # 绘制动作阶段
        phase_color = (0, 255, 255) if analysis.get('phase') == 'down' else (255, 255, 0)
        cv2.putText(frame, f"Phase: {analysis.get('phase', 'unknown')}", 
                   (10, height - 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, phase_color, 2)
                   
        # 绘制形态评分
        score = analysis.get('form_score', 0)
        score_color = (0, 255, 0) if score > 80 else (0, 255, 255) if score > 60 else (0, 0, 255)
        cv2.putText(frame, f"Form Score: {score:.1f}%", 
                   (10, height - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, score_color, 2)
                   
    def _draw_errors(self, frame: np.ndarray, errors: List[Dict]):
        """绘制错误提示"""
        height, width = frame.shape[:2]
        
        for i, error in enumerate(errors[:3]):  # 最多显示3个错误
            severity_color = {
                'high': (0, 0, 255),    # 红色
                'medium': (0, 165, 255), # 橙色
                'low': (0, 255, 255)     # 黄色
            }.get(error['severity'], (255, 255, 255))
            
            y_pos = height - 150 + i * 30
            cv2.putText(frame, f"⚠ {error['message']}", 
                       (width - 400, y_pos), cv2.FONT_HERSHEY_SIMPLEX, 0.6, severity_color, 2)
                       
    def _draw_status_info(self, frame: np.ndarray, analysis: Dict):
        """绘制状态信息"""
        height, width = frame.shape[:2]
        
        # 绘制次数
        cv2.putText(frame, f"Reps: {self.rep_count}", 
                   (width - 150, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                   
        # 绘制运动类型
        cv2.putText(frame, f"Exercise: {self.current_exercise or 'None'}", 
                   (width - 200, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                   
    def _update_exercise_state(self, analysis: Dict):
        """更新运动状态"""
        # 简单的状态机逻辑
        current_phase = analysis.get('phase', 'unknown')
        
        if self.exercise_state == 'ready' and current_phase == 'down':
            self.exercise_state = 'down'
        elif self.exercise_state == 'down' and current_phase == 'up':
            self.exercise_state = 'up'
            self.rep_count += 1
        elif self.exercise_state == 'up' and current_phase == 'down':
            self.exercise_state = 'down'
            
    # 辅助计算方法
    def _calculate_pushup_score(self, left_arm: float, right_arm: float, alignment: float) -> float:
        """计算俯卧撑评分"""
        arm_score = 100 - abs(left_arm - right_arm) * 2
        alignment_score = 100 - alignment * 3
        return max(0, min(100, (arm_score + alignment_score) / 2))
        
    def _calculate_squat_score(self, left_knee: float, right_knee: float, back: float, alignment: float) -> float:
        """计算深蹲评分"""
        knee_score = 100 - abs(left_knee - right_knee) * 2
        back_score = 100 - abs(back - 90) * 2
        alignment_score = 100 - alignment * 3
        return max(0, min(100, (knee_score + back_score + alignment_score) / 3))
        
    def _calculate_situp_score(self, torso: float, stability: float, neck: float) -> float:
        """计算仰卧起坐评分"""
        return max(0, min(100, 100 - torso * 0.5 - stability * 2 - neck * 2))
        
    def _calculate_plank_score(self, body_line: float, hip_stability: float, shoulder_stability: float) -> float:
        """计算平板支撑评分"""
        return max(0, min(100, 100 - body_line * 3 - hip_stability * 5 - shoulder_stability * 3))
        
    # 其他辅助方法的占位符
    def _calculate_knee_alignment(self, landmarks: Dict) -> float:
        return 0.0
        
    def _calculate_leg_stability(self, landmarks: Dict) -> float:
        return 0.0
        
    def _calculate_neck_alignment(self, landmarks: Dict) -> float:
        return 0.0
        
    def _calculate_plank_alignment(self, landmarks: Dict) -> float:
        return 0.0
        
    def _calculate_hip_stability(self, landmarks: Dict) -> float:
        return 0.0
        
    def _calculate_shoulder_stability(self, landmarks: Dict) -> float:
        return 0.0
        
    def _detect_situp_errors(self, analysis: Dict) -> List[Dict]:
        return []
        
    def _detect_plank_errors(self, analysis: Dict) -> List[Dict]:
        return []