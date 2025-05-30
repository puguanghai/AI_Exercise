// 训练页面主要功能模块
class WorkoutManager {
    constructor() {
        this.poseDetector = null;
        this.currentExercise = null;
        this.isWorkoutActive = false;
        this.workoutData = {
            exercise: null,
            startTime: null,
            endTime: null,
            count: 0,
            duration: 0,
            calories: 0,
            accuracy: 0
        };
        
        this.init();
    }
    
    init() {
        // 初始化姿态检测器
        this.poseDetector = new PoseDetector();
        
        // 初始化语音反馈控制
        this.initVoiceControl();
        
        // 绑定事件监听器
        this.bindEvents();
        
        // 初始化UI
        this.initUI();
    }
    
    initVoiceControl() {
        // 初始化语音反馈状态
        this.voiceFeedbackEnabled = false;
        
        // 语音控制按钮事件
        const voiceToggle = document.getElementById('voiceToggle');
        if (voiceToggle) {
            voiceToggle.addEventListener('click', () => {
                this.toggleVoiceFeedback();
            });
        }
    }
    
    toggleVoiceFeedback() {
        this.voiceFeedbackEnabled = !this.voiceFeedbackEnabled;
        
        // 更新按钮状态
        const voiceToggle = document.getElementById('voiceToggle');
        const icon = voiceToggle.querySelector('i');
        
        if (this.voiceFeedbackEnabled) {
            voiceToggle.classList.add('active');
            icon.className = 'fas fa-volume-up';
            voiceToggle.title = '关闭语音反馈';
        } else {
            voiceToggle.classList.remove('active');
            icon.className = 'fas fa-volume-mute';
            voiceToggle.title = '开启语音反馈';
        }
        
        // 同步到姿态检测器
        if (this.poseDetector) {
            this.poseDetector.voiceFeedbackEnabled = this.voiceFeedbackEnabled;
        }
    }
    
    bindEvents() {
        // 运动选择按钮
        document.querySelectorAll('.exercise-option').forEach(button => {
            button.addEventListener('click', (e) => {
                const exercise = e.currentTarget.dataset.exercise;
                this.selectExercise(exercise);
            });
        });
        
        // 开始训练按钮
        const startBtn = document.getElementById('startWorkout');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startWorkout());
        }
        
        // 停止训练按钮
        const stopBtn = document.getElementById('stopWorkout');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopWorkout());
        }
        
        // 暂停/继续按钮
        const pauseBtn = document.getElementById('pauseWorkout');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        
        // 保存训练数据按钮
        const saveBtn = document.getElementById('saveWorkout');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveWorkoutData());
        }
        
        // 模态框关闭事件
        const modal = document.getElementById('workoutCompleteModal');
        if (modal) {
            modal.addEventListener('hidden.bs.modal', () => {
                this.resetWorkout();
            });
        }
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.currentExercise) {
                e.preventDefault();
                if (this.isWorkoutActive) {
                    this.togglePause();
                } else {
                    this.startWorkout();
                }
            } else if (e.code === 'Escape' && this.isWorkoutActive) {
                this.stopWorkout();
            }
        });
    }
    
    initUI() {
        // 初始化统计显示
        this.updateStatsDisplay();
        
        // 隐藏训练界面
        this.hideWorkoutInterface();
        
        // 显示运动选择
        this.showExerciseSelection();
    }
    
    selectExercise(exercise) {
        // 移除之前的选中状态
        document.querySelectorAll('.exercise-option').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 添加当前选中状态
        const selectedBtn = document.querySelector(`[data-exercise="${exercise}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
        
        this.currentExercise = exercise;
        
        // 显示训练界面
        this.showWorkoutInterface();
        
        // 更新训练指导
        this.updateExerciseGuidance(exercise);
        
        // 设置训练目标
        this.setExerciseTarget(exercise);
        
        this.showMessage(`已选择${this.getExerciseName(exercise)}训练`, 'success');
    }
    
    async startWorkout() {
        if (!this.currentExercise) {
            this.showMessage('请先选择运动类型', 'warning');
            return;
        }
        
        try {
            // 设置摄像头
            await this.poseDetector.setupCamera();
            
            // 开始姿态检测
            this.poseDetector.startDetection(this.currentExercise);
            
            // 更新状态
            this.isWorkoutActive = true;
            this.workoutData.exercise = this.currentExercise;
            this.workoutData.startTime = new Date();
            
            // 更新UI
            this.updateWorkoutButtons();
            this.startStatsUpdate();
            
            this.showMessage('训练开始！', 'success');
        } catch (error) {
            console.error('启动训练失败:', error);
            this.showMessage('启动训练失败，请检查摄像头权限', 'error');
        }
    }
    
    stopWorkout() {
        if (!this.isWorkoutActive) return;
        
        // 停止检测和摄像头
        this.poseDetector.stopDetection();
        this.stopStatsUpdate();
        
        // 计算最终数据
        this.workoutData.endTime = Date.now();
        this.workoutData.duration = Math.floor((this.workoutData.endTime - this.workoutData.startTime) / 1000);
        
        // 从pose detector获取最新数据
        this.workoutData.count = this.poseDetector.exerciseCounter || 0;
        this.workoutData.calories = this.poseDetector.calories || 0;
        this.workoutData.accuracy = this.poseDetector.accuracy || 0;
        
        // 重置状态
        this.isWorkoutActive = false;
        
        // 停止统计更新
        this.stopStatsUpdate();
        
        // 更新UI
        this.updateWorkoutButtons();
        
        // 显示完成模态框
        this.showWorkoutComplete();
        
        this.showMessage('训练已完成，摄像头已关闭！', 'success');
    }
    
    togglePause() {
        if (!this.isWorkoutActive) return;
        
        if (this.poseDetector.isDetecting) {
            this.poseDetector.stopDetection();
            this.stopStatsUpdate();
            this.showMessage('训练已暂停，摄像头已关闭', 'info');
        } else {
            this.poseDetector.startDetection(this.currentExercise);
            this.startStatsUpdate();
            this.showMessage('训练已继续', 'success');
        }
        
        this.updateWorkoutButtons();
    }
    
    resetWorkout() {
        // 重置姿态检测器
        this.poseDetector.reset();
        
        // 重置状态
        this.isWorkoutActive = false;
        this.currentExercise = null;
        this.workoutData = {
            exercise: null,
            startTime: null,
            endTime: null,
            count: 0,
            duration: 0,
            calories: 0,
            accuracy: 0
        };
        
        // 重置UI
        this.hideWorkoutInterface();
        this.showExerciseSelection();
        this.updateStatsDisplay();
        this.updateWorkoutButtons();
        
        // 移除运动选择
        document.querySelectorAll('.exercise-option').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    
    showWorkoutInterface() {
        const workoutInterface = document.getElementById('workoutInterface');
        if (workoutInterface) {
            workoutInterface.style.display = 'block';
            workoutInterface.classList.add('fade-in');
        }
    }
    
    hideWorkoutInterface() {
        const workoutInterface = document.getElementById('workoutInterface');
        if (workoutInterface) {
            workoutInterface.style.display = 'none';
        }
    }
    
    showExerciseSelection() {
        const exerciseSelection = document.getElementById('exerciseSelection');
        if (exerciseSelection) {
            exerciseSelection.style.display = 'block';
        }
    }
    
    updateExerciseGuidance(exercise) {
        const guidance = {
            'pushup': {
                title: '俯卧撑训练指导',
                instructions: [
                    '1. 双手撑地，与肩同宽',
                    '2. 身体保持一条直线',
                    '3. 慢慢下降至胸部接近地面',
                    '4. 用力推起回到起始位置'
                ],
                tips: '保持核心收紧，呼吸要均匀'
            },
            'squat': {
                title: '深蹲训练指导',
                instructions: [
                    '1. 双脚与肩同宽站立',
                    '2. 脚尖略微向外',
                    '3. 慢慢下蹲至大腿平行地面',
                    '4. 用力站起回到起始位置'
                ],
                tips: '膝盖不要超过脚尖，保持背部挺直'
            },
            'situp': {
                title: '仰卧起坐训练指导',
                instructions: [
                    '1. 仰卧，双膝弯曲',
                    '2. 双手交叉放在胸前',
                    '3. 用腹肌力量抬起上身',
                    '4. 慢慢回到起始位置'
                ],
                tips: '不要用手拉头部，专注腹肌发力'
            },
            'plank': {
                title: '平板支撑训练指导',
                instructions: [
                    '1. 俯卧撑起始姿势',
                    '2. 前臂撑地，肘部在肩膀下方',
                    '3. 身体保持一条直线',
                    '4. 保持这个姿势不动'
                ],
                tips: '不要塌腰或撅臀，保持自然呼吸'
            }
        };
        
        const guideData = guidance[exercise];
        if (!guideData) return;
        
        // 更新指导标题
        const titleElement = document.getElementById('guidanceTitle');
        if (titleElement) {
            titleElement.textContent = guideData.title;
        }
        
        // 更新指导步骤
        const instructionsElement = document.getElementById('guidanceInstructions');
        if (instructionsElement) {
            instructionsElement.innerHTML = guideData.instructions
                .map(instruction => `<li>${instruction}</li>`)
                .join('');
        }
        
        // 更新提示
        const tipsElement = document.getElementById('guidanceTips');
        if (tipsElement) {
            tipsElement.textContent = guideData.tips;
        }
    }
    
    setExerciseTarget(exercise) {
        const targets = {
            'pushup': { count: 20, time: 300 }, // 20个，5分钟
            'squat': { count: 30, time: 300 },  // 30个，5分钟
            'situp': { count: 25, time: 300 },  // 25个，5分钟
            'plank': { count: 60, time: 300 }   // 60秒，5分钟
        };
        
        const target = targets[exercise];
        if (!target) return;
        
        const targetElement = document.getElementById('exerciseTarget');
        if (targetElement) {
            const unit = exercise === 'plank' ? '秒' : '个';
            targetElement.textContent = `目标: ${target.count}${unit}`;
        }
    }
    
    updateWorkoutButtons() {
        const startBtn = document.getElementById('startWorkout');
        const stopBtn = document.getElementById('stopWorkout');
        const pauseBtn = document.getElementById('pauseWorkout');
        
        if (!this.isWorkoutActive) {
            // 未开始状态
            if (startBtn) {
                startBtn.style.display = 'inline-block';
                startBtn.disabled = !this.currentExercise;
            }
            if (stopBtn) stopBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'none';
        } else {
            // 训练中状态
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
            if (pauseBtn) {
                pauseBtn.style.display = 'inline-block';
                pauseBtn.textContent = this.poseDetector.isDetecting ? '暂停' : '继续';
                pauseBtn.className = this.poseDetector.isDetecting ? 
                    'btn btn-warning' : 'btn btn-success';
            }
        }
    }
    
    startStatsUpdate() {
        this.statsInterval = setInterval(() => {
            this.updateStatsDisplay();
        }, 1000);
    }
    
    stopStatsUpdate() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }
    
    updateStatsDisplay() {
        if (!this.isWorkoutActive || !this.poseDetector) return;
        
        // 更新计数
        const countElement = document.getElementById('reps');
        if (countElement) {
            countElement.textContent = this.poseDetector.exerciseCounter || 0;
        }
        
        // 更新时间
        const timeElement = document.getElementById('time');
        if (timeElement) {
            const duration = Math.floor((Date.now() - this.workoutData.startTime) / 1000);
            timeElement.textContent = this.formatDuration(duration);
        }
        
        // 更新卡路里
        const caloriesElement = document.getElementById('calories');
        if (caloriesElement) {
            caloriesElement.textContent = Math.round(this.poseDetector.calories || 0);
        }
        
        // 更新准确率
        const accuracyElement = document.getElementById('accuracy');
        if (accuracyElement) {
            accuracyElement.textContent = `${this.poseDetector.accuracy || 0}%`;
        }
    }
    
    showWorkoutComplete() {
        const modal = document.getElementById('workoutCompleteModal');
        if (!modal) return;
        
        // 更新模态框内容
        const data = this.workoutData;
        
        document.getElementById('finalCount').textContent = data.count || 0;
        document.getElementById('finalTime').textContent = this.formatDuration(data.duration || 0);
        document.getElementById('finalCalories').textContent = Math.round(data.calories || 0);
        document.getElementById('finalAccuracy').textContent = `${data.accuracy || 0}%`;
        
        // 显示模态框
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
    
    async saveWorkoutData() {
        if (!this.workoutData.exercise) {
            this.showMessage('没有训练数据可保存', 'warning');
            return;
        }

        try {
            // 格式化数据以匹配API接口
            const formattedData = {
                exercise_type: this.workoutData.exercise,
                duration: Math.floor(this.workoutData.duration || 0),
                reps: this.workoutData.count || 0,
                calories: this.workoutData.calories || 0,
                accuracy: this.workoutData.accuracy || 0
            };
            
            const response = await fetch('/api/save_workout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formattedData)
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('训练数据保存成功！', 'success');
                
                // 关闭模态框
                const modal = bootstrap.Modal.getInstance(document.getElementById('workoutCompleteModal'));
                if (modal) {
                    modal.hide();
                }
            } else {
                this.showMessage(result.message || '保存失败', 'error');
            }
        } catch (error) {
            console.error('保存训练数据失败:', error);
            this.showMessage('保存失败，请稍后重试', 'error');
        }
    }
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    getExerciseName(exercise) {
        const names = {
            'pushup': '俯卧撑',
            'squat': '深蹲',
            'situp': '仰卧起坐',
            'plank': '平板支撑'
        };
        return names[exercise] || exercise;
    }
    
    showMessage(message, type = 'info') {
        // 创建消息提示
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // 找到消息容器
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.style.position = 'fixed';
            messageContainer.style.top = '20px';
            messageContainer.style.right = '20px';
            messageContainer.style.zIndex = '9999';
            messageContainer.style.maxWidth = '400px';
            document.body.appendChild(messageContainer);
        }
        
        messageContainer.insertAdjacentHTML('beforeend', alertHtml);
        
        // 自动移除消息
        setTimeout(() => {
            const alert = messageContainer.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在训练页面
    if (document.getElementById('workoutPage')) {
        window.workoutManager = new WorkoutManager();
    }
});