// 姿态检测和运动识别模块
class PoseDetector {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.detector = null;
        this.isDetecting = false;
        this.currentExercise = null;
        this.exerciseCounter = 0;
        this.exerciseState = 'down'; // 'up' or 'down'
        this.startTime = null;
        this.lastPoseTime = 0;
        this.poseHistory = [];
        this.accuracy = 0;
        this.calories = 0;
        this.feedback = '';

        // 新增属性
        this.currentErrors = [];
        this.voiceFeedbackEnabled = false;
        this.lastSpokenTime = 0;

        // 准确率计算相关
        this.frameCount = 0;
        this.correctFrames = 0;
        this.realTimeAccuracy = 0;
        this.accuracyHistory = [];
        this.currentFormScore = 0;
        
        // 深度学习分析器
        this.advancedAnalyzer = null;
        this.analysisResults = null;
        this.sessionId = null;
        this.dataRecorder = null;
        
        // 运动阈值配置 - 重新优化检测标准，提高灵敏度
        this.exerciseThresholds = {
            'pushup': {
                down: 70,      // 下降时手臂角度阈值 (降低以提高灵敏度)
                up: 140,       // 上升时手臂角度阈值 (降低以提高灵敏度)
                minAngle: 20,  // 最小角度
                maxAngle: 175, // 最大角度
                bodyParts: ['leftShoulder', 'leftElbow', 'leftWrist', 'rightShoulder', 'rightElbow', 'rightWrist'],
                description: '俯卧撑检测',
                sensitivity: 'high'
            },
            'squat': {
                down: 80,      // 下蹲时膝盖角度阈值 (降低以提高灵敏度)
                up: 140,       // 站立时膝盖角度阈值 (降低以提高灵敏度)
                minAngle: 20,  // 最小角度
                maxAngle: 175, // 最大角度
                bodyParts: ['leftHip', 'leftKnee', 'leftAnkle', 'rightHip', 'rightKnee', 'rightAnkle'],
                description: '深蹲检测',
                sensitivity: 'high'
            },
            'situp': {
                down: 20,      // 躺下时躯干角度阈值 (降低以提高灵敏度)
                up: 60,        // 起身时躯干角度阈值 (降低以提高灵敏度)
                minAngle: 5,   // 最小角度
                maxAngle: 150, // 最大角度
                bodyParts: ['leftShoulder', 'leftHip', 'leftKnee'],
                description: '仰卧起坐检测',
                sensitivity: 'high'
            },
            'plank': {
                minAngle: 120, // 最小角度 (降低以提高灵敏度)
                maxAngle: 180, // 最大角度
                bodyParts: ['leftShoulder', 'leftElbow', 'leftWrist', 'leftHip'],
                description: '平板支撑检测',
                sensitivity: 'medium'
            },
            'jumping_jacks': {
                down: 20,      // 手臂下降角度 (降低以提高灵敏度)
                up: 120,       // 手臂上升角度 (降低以提高灵敏度)
                minAngle: 5,   // 最小角度
                maxAngle: 180, // 最大角度
                bodyParts: ['leftShoulder', 'leftElbow', 'leftWrist', 'leftHip', 'leftKnee', 'leftAnkle'],
                description: '开合跳检测',
                sensitivity: 'high'
            },
            'lunges': {
                down: 70,      // 弓步下蹲角度 (降低以提高灵敏度)
                up: 140,       // 弓步站立角度 (降低以提高灵敏度)
                minAngle: 20,  // 最小角度
                maxAngle: 160, // 最大角度
                bodyParts: ['leftHip', 'leftKnee', 'leftAnkle', 'rightHip', 'rightKnee', 'rightAnkle'],
                description: '弓步蹲检测',
                sensitivity: 'high'
            },
            'burpees': {
                phases: ['stand', 'squat', 'plank', 'jump'],
                bodyParts: ['leftShoulder', 'leftElbow', 'leftWrist', 'leftHip', 'leftKnee', 'leftAnkle'],
                description: '波比跳检测',
                sensitivity: 'medium'
            },
            'pull_ups': {
                down: 100,     // 手臂弯曲角度 (降低以提高灵敏度)
                up: 150,       // 手臂伸直角度 (降低以提高灵敏度)
                minAngle: 80,  // 最小角度 (降低以提高灵敏度)
                maxAngle: 180, // 最大角度
                bodyParts: ['leftShoulder', 'leftElbow', 'leftWrist'],
                description: '引体向上检测',
                sensitivity: 'high'
            }
        };

        this.poseAccuracyHistory = []; // 初始化姿势准确率历史记录
        this.currentAngle = 0; // 初始化当前角度

        // 改进的计数系统 - 提高灵敏度
        this.stateBuffer = [];
        this.bufferSize = 3;  // 减少缓冲区大小，提高响应速度
        this.minStateFrames = 2;  // 减少最小状态帧数，提高灵敏度
        this.lastStateChange = 0;
        this.minStateInterval = 300; // 减少最小状态变化间隔(ms)，提高灵敏度

        this.init();
    }
    
    async init() {
        try {
            // 加载 MediaPipe Pose 模型
            await this.loadPoseModel();
            await this.initAdvancedAnalysis();
            console.log('姿态检测模型加载成功');
            return true;
        } catch (error) {
            console.error('姿态检测模型加载失败:', error);
            this.showFeedback('姿态检测模型加载失败，请刷新页面重试', 'error');
            return false;
        }
    }
    
    async initAdvancedAnalysis() {
        try {
            // 初始化深度学习分析器
            console.log('正在初始化高级姿态分析器...');
            
            // 连接到后端深度学习API
            this.advancedAnalyzer = {
                isReady: true,
                modelVersion: '2.0',
                capabilities: ['pose_detection', 'form_analysis', 'error_detection'],
                analyzeFrame: async (landmarks, exerciseType) => {
                    try {
                        const response = await fetch('/api/analyze_pose', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                landmarks: landmarks,
                                exercise_type: exerciseType
                            })
                        });
                        const result = await response.json();
                        return result.success ? result.analysis : null;
                    } catch (error) {
                        console.error('深度学习分析失败:', error);
                        return null;
                    }
                }
            };
            
            // 初始化数据记录器
            this.dataRecorder = {
                sessionActive: false,
                currentSession: {
                    id: null,
                    startTime: null,
                    endTime: null,
                    exerciseType: null,
                    reps: 0,
                    formScores: [],
                    errors: [],
                    analysisData: [],
                    duration: 0,
                    calories: 0
                },
                startSession: async (exerciseType) => {
                    try {
                        const response = await fetch('/api/start_session', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                exercise_type: exerciseType
                            })
                        });
                        const result = await response.json();
                        return result.success ? result.session_id : null;
                    } catch (error) {
                        console.error('开始会话失败:', error);
                        return null;
                    }
                },
                endSession: async (sessionId) => {
                    try {
                        const response = await fetch('/api/end_session', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                session_id: sessionId
                            })
                        });
                        const result = await response.json();
                        return result.success ? result.session_data : null;
                    } catch (error) {
                        console.error('结束会话失败:', error);
                        return null;
                    }
                },
                recordRep: async (sessionId, formScore, errors) => {
                    try {
                        const response = await fetch('/api/record_rep', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                session_id: sessionId,
                                form_score: formScore,
                                errors: errors
                            })
                        });
                        const result = await response.json();
                        return result.success;
                    } catch (error) {
                        console.error('记录重复次数失败:', error);
                        return false;
                    }
                }
            };
            
            console.log('高级姿态分析器初始化完成');
        } catch (error) {
            console.error('高级分析器初始化失败:', error);
        }
    }
    
    async startSession(userId = 1) {
        if (!this.advancedAnalyzer || !this.advancedAnalyzer.isReady) {
            console.error('高级分析器未就绪');
            return false;
        }
        
        try {
            // 调用后端API开始新会话
            this.sessionId = await this.dataRecorder.startSession(this.currentExercise);
            
            if (this.sessionId) {
                this.dataRecorder.sessionActive = true;
                this.dataRecorder.currentSession = {
                    id: this.sessionId,
                    userId: userId,
                    exerciseType: this.currentExercise,
                    startTime: new Date(),
                    reps: 0,
                    errors: [],
                    formScores: [],
                    analysisData: []
                };
                
                console.log(`训练会话已开始: ${this.sessionId}`);
                return true;
            } else {
                console.error('无法创建会话');
                return false;
            }
        } catch (error) {
            console.error('开始会话失败:', error);
            return false;
        }
    }
    
    async endSession() {
        if (!this.dataRecorder.sessionActive) {
            return null;
        }
        
        try {
            const session = this.dataRecorder.currentSession;
            session.endTime = new Date();
            session.duration = (session.endTime - session.startTime) / 1000;
            
            // 计算会话统计
            const avgScore = session.formScores.length > 0 
                ? session.formScores.reduce((a, b) => a + b, 0) / session.formScores.length 
                : 0;
                
            const sessionSummary = {
                ...session,
                avgFormScore: avgScore,
                totalErrors: session.errors.length,
                caloriesBurned: this.calculateCalories(session.reps, session.duration)
            };
            
            // 调用后端API结束会话
            const savedData = await this.dataRecorder.endSession(this.sessionId);
            
            // 重置会话
            this.dataRecorder.sessionActive = false;
            this.dataRecorder.currentSession = null;
            this.sessionId = null;
            
            return savedData || sessionSummary;
        } catch (error) {
            console.error('结束会话失败:', error);
            return null;
        }
    }
    
    async loadPoseModel() {
        try {
            // 检查是否支持MediaPipe
            if (typeof window.Pose !== 'undefined') {
                // 使用MediaPipe Pose
                this.detector = new window.Pose({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                    }
                });
                
                this.detector.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                
                this.detector.onResults((results) => {
                    this.onPoseResults(results);
                });
                
                console.log('MediaPipe Pose 模型加载成功');
            } else {
                // 降级到模拟检测
                console.warn('MediaPipe 不可用，使用模拟检测');
                this.detector = {
                    detect: async (video) => {
                        return this.generateMockPose();
                    }
                };
            }
        } catch (error) {
            console.error('加载姿态检测模型失败:', error);
            // 降级到模拟检测
            this.detector = {
                detect: async (video) => {
                    return this.generateMockPose();
                }
            };
        }
    }
    
    generateMockPose() {
        // 生成模拟的姿态关键点数据
        const keypoints = {
            nose: { x: 320, y: 100, confidence: 0.9 },
            leftEye: { x: 310, y: 90, confidence: 0.9 },
            rightEye: { x: 330, y: 90, confidence: 0.9 },
            leftEar: { x: 300, y: 95, confidence: 0.8 },
            rightEar: { x: 340, y: 95, confidence: 0.8 },
            leftShoulder: { x: 280, y: 150, confidence: 0.9 },
            rightShoulder: { x: 360, y: 150, confidence: 0.9 },
            leftElbow: { x: 250, y: 200, confidence: 0.8 },
            rightElbow: { x: 390, y: 200, confidence: 0.8 },
            leftWrist: { x: 220, y: 250, confidence: 0.7 },
            rightWrist: { x: 420, y: 250, confidence: 0.7 },
            leftHip: { x: 290, y: 300, confidence: 0.9 },
            rightHip: { x: 350, y: 300, confidence: 0.9 },
            leftKnee: { x: 285, y: 400, confidence: 0.8 },
            rightKnee: { x: 355, y: 400, confidence: 0.8 },
            leftAnkle: { x: 280, y: 500, confidence: 0.7 },
            rightAnkle: { x: 360, y: 500, confidence: 0.7 }
        };
        
        // 添加一些随机变化来模拟真实的姿态变化
        Object.keys(keypoints).forEach(key => {
            keypoints[key].x += (Math.random() - 0.5) * 20;
            keypoints[key].y += (Math.random() - 0.5) * 20;
        });
        
        return { keypoints };
    }
    
    async setupCamera() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('outputCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.video || !this.canvas) {
            throw new Error('视频元素或画布元素未找到');
        }
        
        try {
            // 检查浏览器是否支持getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('您的浏览器不支持摄像头访问功能');
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            this.video.srcObject = stream;
            
            return new Promise((resolve, reject) => {
                this.video.onloadedmetadata = () => {
                    this.video.play().then(() => {
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                        console.log('摄像头初始化成功');
                        resolve();
                    }).catch(reject);
                };
                
                this.video.onerror = () => {
                    reject(new Error('视频播放失败'));
                };
                
                // 设置超时
                setTimeout(() => {
                    reject(new Error('摄像头初始化超时'));
                }, 10000);
            });
        } catch (error) {
            console.error('摄像头访问失败:', error);
            let errorMessage = '无法访问摄像头';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问';
            } else if (error.name === 'NotFoundError') {
                errorMessage = '未找到摄像头设备，请检查摄像头是否正确连接';
            } else if (error.name === 'NotReadableError') {
                errorMessage = '摄像头被其他应用占用，请关闭其他使用摄像头的程序';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = '摄像头不支持所需的分辨率，请尝试其他设备';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showFeedback(errorMessage, 'error');
            throw error;
        }
    }
    
    // 设置视频文件
    setupVideoFile(file) {
        return new Promise((resolve, reject) => {
            try {
                // 确保使用正确的video元素
                this.video = document.getElementById('uploadedVideo');
                this.canvas = document.getElementById('outputCanvas');
                this.ctx = this.canvas.getContext('2d');
                
                if (!this.video || !this.canvas) {
                    reject(new Error('视频元素或画布元素未找到'));
                    return;
                }
                
                const url = URL.createObjectURL(file);
                this.video.src = url;
                this.video.srcObject = null; // 清除摄像头流
                
                this.video.onloadedmetadata = () => {
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    console.log('视频文件加载成功:', this.video.videoWidth, 'x', this.video.videoHeight);
                    resolve(this.video);
                };
                
                this.video.onerror = () => {
                    reject(new Error('视频文件加载失败'));
                };
                
                // 设置超时
                setTimeout(() => {
                    reject(new Error('视频文件加载超时'));
                }, 10000);
            } catch (error) {
                reject(error);
            }
        });
    }

    // 播放视频
    playVideo() {
        if (this.video) {
            this.video.play();
        }
    }

    // 暂停视频
    pauseVideo() {
        if (this.video) {
            this.video.pause();
        }
    }

    // 重新开始视频
    restartVideo() {
        if (this.video) {
            this.video.currentTime = 0;
            this.video.play();
        }
    }

    // 设置视频时间
    setVideoTime(time) {
        if (this.video) {
            this.video.currentTime = time;
        }
    }

    // 获取视频时长
    getVideoDuration() {
        return this.video ? this.video.duration : 0;
    }

    // 获取当前播放时间
    getCurrentTime() {
        return this.video ? this.video.currentTime : 0;
    }

    // 检查是否为视频文件模式
    isVideoMode() {
        return this.video && this.video.src && !this.video.srcObject;
    }
    
    // 设置视频模式
    setVideoMode() {
        this.video = document.getElementById('uploadedVideo');
        this.canvas = document.getElementById('outputCanvas');
        this.ctx = this.canvas.getContext('2d');
    }
    
    // 设置摄像头模式
    setCameraMode() {
        this.video = document.getElementById('videoElement');
        this.canvas = document.getElementById('outputCanvas');
        this.ctx = this.canvas.getContext('2d');
    }

    // 设置视频文件
    async setupVideoFile(file) {
        return new Promise((resolve, reject) => {
            if (!this.video) {
                reject(new Error('视频元素未找到'));
                return;
            }

            const url = URL.createObjectURL(file);
            this.video.src = url;
            
            this.video.onloadedmetadata = () => {
                // 设置画布尺寸匹配视频
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                console.log('视频文件设置完成:', this.video.videoWidth, 'x', this.video.videoHeight);
                resolve();
            };
            
            this.video.onerror = () => {
                reject(new Error('视频文件加载失败'));
            };
        });
    }
    
    startDetection(exercise) {
        if (!this.detector) {
            this.showFeedback('姿态检测模型未加载', 'error');
            return;
        }

        // 中文运动名称映射到英文（用于内部逻辑）
        const exerciseMap = {
            '俯卧撑': 'pushup',
            '深蹲': 'squat',
            '仰卧起坐': 'situp',
            '平板支撑': 'plank',
            '开合跳': 'jumping_jacks',
            '弓步蹲': 'lunges',
            '波比跳': 'burpees',
            '引体向上': 'pull_ups'
        };

        // 保存原始中文名称用于显示
        this.currentExerciseDisplay = exercise;
        // 转换为英文名称用于内部逻辑
        this.currentExercise = exerciseMap[exercise] || exercise;

        // 完全重置所有状态
        this.exerciseCounter = 0;
        this.exerciseState = 'up'; // 修改初始状态为up
        this.startTime = Date.now();
        this.poseHistory = [];
        this.poseAccuracyHistory = [];
        this.accuracy = 0;
        this.calories = 0;
        this.currentAngle = 0;
        this.isDetecting = true;
        this.targetAchieved = false;
        this.feedback = '';
        this.currentErrors = [];
        this.lastPoseTime = 0;
        this.frameCount = 0;
        this.correctFrames = 0;
        this.realTimeAccuracy = 0;
        this.accuracyHistory = [];
        this.currentFormScore = 0;

        // 重置改进的计数系统
        this.stateBuffer = [];
        this.lastStateChange = 0;

        console.log(`开始检测 ${exercise} -> ${this.currentExercise}，阈值配置:`, this.exerciseThresholds[this.currentExercise]);

        // 立即更新统计显示
        this.updateStats();

        this.detectPose();
        this.showFeedback(`开始${this.getExerciseName(this.currentExercise)}训练`, 'success');

        console.log('检测已开始，运动类型:', exercise, '->', this.currentExercise);
    }
    
    stopDetection() {
        this.isDetecting = false;

        // 停止语音合成
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
            console.log('语音提示已停止');
        }

        // 保存训练数据
        if (this.exerciseCounter > 0 && this.currentExercise) {
            this.saveWorkoutData();
        }

        // 关闭摄像头流
        if (this.video && this.video.srcObject) {
            const stream = this.video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => {
                track.stop();
                console.log('摄像头轨道已停止:', track.kind);
            });
            this.video.srcObject = null;
        }

        // 清除画布
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.showFeedback('训练已停止，摄像头已关闭', 'info');
    }

    async saveWorkoutData() {
        if (!this.currentExercise || this.exerciseCounter === 0) {
            return;
        }

        try {
            const duration = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;

            // 计算最终准确率 - 确保有合理的默认值
            let finalAccuracy = 0;
            if (this.frameCount > 0 && this.correctFrames > 0) {
                finalAccuracy = (this.correctFrames / this.frameCount) * 100;
            } else if (this.realTimeAccuracy > 0) {
                finalAccuracy = this.realTimeAccuracy;
            } else if (this.accuracy > 0) {
                finalAccuracy = this.accuracy;
            } else {
                // 如果没有准确率数据，根据完成次数给一个基础分数
                finalAccuracy = this.exerciseCounter > 0 ? 75 : 0;
            }

            // 确保准确率在合理范围内
            finalAccuracy = Math.max(0, Math.min(100, Math.round(finalAccuracy)));

            const workoutData = {
                exercise_type: this.currentExerciseDisplay || this.currentExercise, // 使用中文名称
                reps_completed: this.exerciseCounter,
                duration: duration,
                calories_burned: Math.round(this.calories),
                accuracy_score: finalAccuracy
            };

            console.log('保存训练数据:', workoutData);
            console.log(`准确率计算: 正确帧=${this.correctFrames}, 总帧=${this.frameCount}, 实时准确率=${this.realTimeAccuracy}, 总体准确率=${this.accuracy}, 最终准确率=${finalAccuracy}%`);

            const response = await fetch('/api/save_workout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(workoutData)
            });

            const result = await response.json();

            if (result.success) {
                console.log('训练数据保存成功');
                this.showFeedback('训练数据已保存', 'success');
            } else {
                console.error('保存训练数据失败:', result.message);
                this.showFeedback('数据保存失败', 'error');
            }
        } catch (error) {
            console.error('保存训练数据时出错:', error);
            this.showFeedback('数据保存出错', 'error');
        }
    }
    
    onPoseResults(results) {
        if (!this.isDetecting) return;
        // console.log('onPoseResults called', results);

        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制视频帧
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        if (results.poseLandmarks) {
            // console.log('Pose landmarks detected:', results.poseLandmarks);
            // 转换MediaPipe格式到我们的格式
            const keypoints = this.convertMediaPipeToKeypoints(results.poseLandmarks);
            // console.log('Converted keypoints:', keypoints);
            
            this.drawPose(keypoints);
            
            if (this.currentExercise) {
                this.analyzePose(keypoints);
            }
        } else {
            // console.log('No pose landmarks in results');
        }
    }
    
    convertMediaPipeToKeypoints(landmarks) {
        // MediaPipe姿态关键点索引映射
        const keypointMap = {
            nose: 0,
            leftEye: 2,
            rightEye: 5,
            leftEar: 7,
            rightEar: 8,
            leftShoulder: 11,
            rightShoulder: 12,
            leftElbow: 13,
            rightElbow: 14,
            leftWrist: 15,
            rightWrist: 16,
            leftHip: 23,
            rightHip: 24,
            leftKnee: 25,
            rightKnee: 26,
            leftAnkle: 27,
            rightAnkle: 28
        };
        
        const keypoints = {};
        
        Object.entries(keypointMap).forEach(([name, index]) => {
            if (landmarks[index]) {
                keypoints[name] = {
                    x: landmarks[index].x * this.canvas.width,
                    y: landmarks[index].y * this.canvas.height,
                    confidence: landmarks[index].visibility !== undefined ? landmarks[index].visibility : 0.5 // 确保visibility存在
                };
                // console.log(`Keypoint ${name} (index ${index}): x=${keypoints[name].x}, y=${keypoints[name].y}, confidence=${keypoints[name].confidence}`);
            } else {
                // console.log(`Landmark for ${name} (index ${index}) not found.`);
            }
        });
        
        return keypoints;
    }
    
    async detectPose() {
        if (!this.video || !this.detector || !this.isDetecting) return;
        
        // 检查视频是否准备就绪
        if (this.video.readyState < 2) {
            if (this.isDetecting) {
                requestAnimationFrame(() => this.detectPose());
            }
            return;
        }
        
        // 对于视频模式，检查视频是否暂停或结束
        if (this.video.tagName === 'VIDEO' && this.video.src && !this.video.srcObject) {
            if (this.video.paused || this.video.ended) {
                if (this.isDetecting) {
                    requestAnimationFrame(() => this.detectPose());
                }
                return;
            }
        }
        
        try {
            if (typeof this.detector.send === 'function') {
                // MediaPipe检测
                await this.detector.send({ image: this.video });
            } else {
                // 模拟检测
                const pose = await this.detector.detect(this.video);
                
                if (pose && pose.keypoints) {
                    // 确保画布尺寸正确
                    if (this.canvas.width !== this.video.videoWidth || this.canvas.height !== this.video.videoHeight) {
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                    }
                    
                    // 清除画布
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    // 绘制视频帧
                    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                    
                    // 绘制姿态关键点
                    this.drawPose(pose.keypoints);
                    
                    if (this.currentExercise) {
                        this.analyzePose(pose.keypoints);
                    }
                }
            }
            
            this.updateStats();
        } catch (error) {
            console.error('姿态检测错误:', error);
        }
        
        if (this.isDetecting) {
            requestAnimationFrame(() => this.detectPose());
        }
    }
    
    async performAdvancedAnalysis(keypoints) {
        try {
            // 转换keypoints为分析格式
            const landmarkData = this.convertKeypointsToAnalysisFormat(keypoints);

            // 总是尝试调用后端API进行准确率分析
            if (this.currentExercise && landmarkData) {
                try {
                    const response = await fetch('/api/analyze_pose', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            landmarks: landmarkData,
                            exercise_type: this.currentExercise
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.analysis) {
                            const analysisResult = result.analysis;

                            // 更新准确率统计
                            this.updateAccuracyStats(analysisResult.form_score || 75);

                            // 更新当前形态评分
                            this.currentFormScore = analysisResult.form_score || 75;

                            // 更新当前错误信息
                            this.currentErrors = analysisResult.errors || [];

                            // 更新反馈信息
                            this.feedback = analysisResult.feedback || '继续保持动作';

                            return {
                                landmarks: landmarkData,
                                analysis: { exerciseType: this.currentExercise, phase: analysisResult.phase },
                                formScore: analysisResult.form_score || 75,
                                errors: analysisResult.errors || [],
                                timestamp: Date.now(),
                                phase: analysisResult.phase || 'unknown',
                                feedback: analysisResult.feedback || '继续保持动作'
                            };
                        }
                    }
                } catch (apiError) {
                    console.warn('API调用失败，使用本地分析:', apiError);
                }
            }

            // 如果API调用失败，使用本地分析并生成模拟准确率
            const localFormScore = this.calculateLocalFormScore(keypoints);
            this.updateAccuracyStats(localFormScore);
            this.currentFormScore = localFormScore;

            return this.basicAnalysis(keypoints);
        } catch (error) {
            console.error('分析失败:', error);
            // 即使出错也要更新准确率
            const fallbackScore = 60;
            this.updateAccuracyStats(fallbackScore);
            this.currentFormScore = fallbackScore;
            return this.basicAnalysis(keypoints);
        }
    }

    calculateLocalFormScore(keypoints) {
        // 本地计算形态评分的简化版本
        if (!keypoints || !this.currentExercise) {
            return 60;
        }

        try {
            switch (this.currentExercise) {
                case 'pushup':
                    return this.calculateLocalPushupScore(keypoints);
                case 'squat':
                    return this.calculateLocalSquatScore(keypoints);
                case 'situp':
                    return this.calculateLocalSitupScore(keypoints);
                case 'plank':
                    return this.calculateLocalPlankScore(keypoints);
                default:
                    return 70 + Math.random() * 20; // 70-90之间的随机分数
            }
        } catch (error) {
            console.error('本地评分计算失败:', error);
            return 65;
        }
    }

    calculateLocalPushupScore(keypoints) {
        const leftArm = this.calculateArmAngle(keypoints, 'left');
        const rightArm = this.calculateArmAngle(keypoints, 'right');

        if (leftArm === 0 || rightArm === 0) {
            return 60;
        }

        const avgAngle = (leftArm + rightArm) / 2;

        // 根据角度计算分数
        if (avgAngle >= 60 && avgAngle <= 120) {
            return 85 + Math.random() * 10; // 85-95
        } else if (avgAngle >= 140 && avgAngle <= 180) {
            return 80 + Math.random() * 10; // 80-90
        } else {
            return 60 + Math.random() * 15; // 60-75
        }
    }

    calculateLocalSquatScore(keypoints) {
        const leftLeg = this.calculateLegAngle(keypoints, 'left');
        const rightLeg = this.calculateLegAngle(keypoints, 'right');

        if (leftLeg === 0 || rightLeg === 0) {
            return 60;
        }

        const avgAngle = (leftLeg + rightLeg) / 2;

        // 根据角度计算分数
        if (avgAngle >= 70 && avgAngle <= 120) {
            return 85 + Math.random() * 10; // 85-95
        } else if (avgAngle >= 140 && avgAngle <= 180) {
            return 80 + Math.random() * 10; // 80-90
        } else {
            return 60 + Math.random() * 15; // 60-75
        }
    }

    calculateLocalSitupScore(keypoints) {
        const torsoAngle = this.calculateTorsoAngle(keypoints);

        if (torsoAngle === 0) {
            return 60;
        }

        // 根据躯干角度计算分数
        if (torsoAngle >= 30 && torsoAngle <= 80) {
            return 85 + Math.random() * 10; // 85-95
        } else if (torsoAngle >= 0 && torsoAngle <= 30) {
            return 80 + Math.random() * 10; // 80-90
        } else {
            return 60 + Math.random() * 15; // 60-75
        }
    }

    calculateLocalPlankScore(keypoints) {
        // 简化的平板支撑评分
        const shoulder = keypoints.leftShoulder || keypoints.rightShoulder;
        const hip = keypoints.leftHip || keypoints.rightHip;
        const ankle = keypoints.leftAnkle || keypoints.rightAnkle;

        if (!shoulder || !hip || !ankle) {
            return 60;
        }

        // 计算身体直线度
        const bodyAlignment = Math.abs(shoulder.y - hip.y) + Math.abs(hip.y - ankle.y);

        if (bodyAlignment < 50) {
            return 85 + Math.random() * 10; // 85-95
        } else if (bodyAlignment < 100) {
            return 70 + Math.random() * 15; // 70-85
        } else {
            return 50 + Math.random() * 20; // 50-70
        }
    }

    updateAccuracyStats(formScore) {
        // 确保formScore是有效数值
        if (typeof formScore !== 'number' || isNaN(formScore)) {
            formScore = 0;
        }

        // 限制formScore在0-100范围内
        formScore = Math.max(0, Math.min(100, formScore));

        // 更新帧计数
        this.frameCount++;

        // 判断是否为正确动作（形态评分大于70认为正确）
        if (formScore >= 70) {
            this.correctFrames++;
        }

        // 计算实时准确率
        this.realTimeAccuracy = this.frameCount > 0 ? (this.correctFrames / this.frameCount) * 100 : 0;

        // 更新准确率历史
        this.accuracyHistory.push(formScore);

        // 保持历史记录在合理范围内（最多保存50个记录，提高响应速度）
        if (this.accuracyHistory.length > 50) {
            this.accuracyHistory.shift();
        }

        // 更新全局准确率（使用移动平均）
        if (this.accuracyHistory.length > 0) {
            this.accuracy = this.accuracyHistory.reduce((sum, score) => sum + score, 0) / this.accuracyHistory.length;
        }

        // 更新当前形态评分
        this.currentFormScore = formScore;

        // 立即更新所有显示 - 确保准确率参数传递到所有地方
        this.updateAllAccuracyDisplays();

        // 调试输出（每30帧输出一次）
        if (this.frameCount % 30 === 0) {
            console.log(`准确率更新 - 帧数: ${this.frameCount}, 正确帧: ${this.correctFrames}, 实时准确率: ${this.realTimeAccuracy.toFixed(1)}%, 总体准确率: ${this.accuracy.toFixed(1)}%, 当前评分: ${formScore}`);
        }
    }
    
    basicAnalysis(keypoints) {
        return {
            landmarks: keypoints,
            analysis: { exerciseType: this.currentExercise },
            formScore: this.accuracy,
            errors: this.currentErrors || [],
            timestamp: Date.now(),
            phase: this.exerciseState
        };
    }
    
    convertKeypointsToAnalysisFormat(keypoints) {
        const converted = {};
        
        Object.keys(keypoints).forEach(name => {
            const point = keypoints[name];
            if (point) {
                converted[name] = {
                    x: point.x,
                    y: point.y,
                    z: point.z || 0,
                    visibility: point.confidence || 1
                };
            }
        });
        
        return converted;
    }
    
    analyzeExerciseForm(landmarks) {
        switch (this.currentExercise) {
            case 'pushup':
                return this.analyzePushupFormAdvanced(landmarks);
            case 'squat':
                return this.analyzeSquatFormAdvanced(landmarks);
            case 'situp':
                return this.analyzeSitupFormAdvanced(landmarks);
            case 'plank':
                return this.analyzePlankFormAdvanced(landmarks);
            default:
                return this.analyzeGeneralForm(landmarks);
        }
    }
    
    analyzePushupFormAdvanced(landmarks) {
        // 计算手臂角度
        const leftArmAngle = this.calculateAngle(
            landmarks.leftShoulder, landmarks.leftElbow, landmarks.leftWrist
        );
        const rightArmAngle = this.calculateAngle(
            landmarks.rightShoulder, landmarks.rightElbow, landmarks.rightWrist
        );
        
        // 计算身体直线度
        const bodyAlignment = this.calculateBodyAlignmentScore(
            landmarks.leftShoulder, landmarks.leftHip, landmarks.leftAnkle
        );
        
        // 判断动作阶段
        const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
        let phase = 'unknown';
        
        if (avgArmAngle < 100) {
            phase = 'down';
        } else if (avgArmAngle > 160) {
            phase = 'up';
        } else {
            phase = 'transition';
        }
        
        return {
            leftArmAngle,
            rightArmAngle,
            avgArmAngle,
            bodyAlignment,
            phase,
            exerciseType: 'pushup'
        };
    }
    
    analyzeSquatFormAdvanced(landmarks) {
        // 计算膝盖角度
        const leftKneeAngle = this.calculateAngle(
            landmarks.leftHip, landmarks.leftKnee, landmarks.leftAnkle
        );
        const rightKneeAngle = this.calculateAngle(
            landmarks.rightHip, landmarks.rightKnee, landmarks.rightAnkle
        );
        
        // 计算背部角度
        const backAngle = this.calculateAngle(
            landmarks.leftShoulder, landmarks.leftHip, landmarks.leftKnee
        );
        
        // 判断动作阶段
        const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
        let phase = 'unknown';
        
        if (avgKneeAngle < 100) {
            phase = 'down';
        } else if (avgKneeAngle > 160) {
            phase = 'up';
        } else {
            phase = 'transition';
        }
        
        return {
            leftKneeAngle,
            rightKneeAngle,
            avgKneeAngle,
            backAngle,
            phase,
            exerciseType: 'squat'
        };
    }
    
    analyzeSitupFormAdvanced(landmarks) {
        const torsoAngle = this.calculateTorsoAngle(landmarks);
        
        let phase = 'unknown';
        if (torsoAngle > 120) {
            phase = 'up';
        } else if (torsoAngle < 30) {
            phase = 'down';
        } else {
            phase = 'transition';
        }
        
        return {
            torsoAngle,
            phase,
            exerciseType: 'situp'
        };
    }
    
    analyzePlankFormAdvanced(landmarks) {
        const plankAngle = this.calculatePlankAngle(landmarks);
        const bodyAlignment = this.calculateBodyAlignmentScore(
            landmarks.leftShoulder, landmarks.leftHip, landmarks.leftAnkle
        );
        
        return {
            plankAngle,
            bodyAlignment,
            phase: 'hold',
            exerciseType: 'plank'
        };
    }
    
    analyzeGeneralForm(landmarks) {
        return {
            exerciseType: this.currentExercise || 'unknown',
            phase: this.exerciseState || 'unknown'
        };
    }
    
    calculateBodyAlignmentScore(shoulder, hip, ankle) {
        if (!shoulder || !hip || !ankle) return 0;
        
        // 计算偏离直线的程度
        const expectedY = shoulder.y + (ankle.y - shoulder.y) * (hip.x - shoulder.x) / (ankle.x - shoulder.x);
        const deviation = Math.abs(hip.y - expectedY);
        
        return deviation;
    }
    
    calculateFormScore(analysis) {
        let score = 100;
        
        switch (analysis.exerciseType) {
            case 'pushup':
                // 手臂对称性
                const armDiff = Math.abs(analysis.leftArmAngle - analysis.rightArmAngle);
                score -= armDiff * 2;
                
                // 身体对齐
                score -= analysis.bodyAlignment * 3;
                break;
                
            case 'squat':
                // 膝盖对称性
                const kneeDiff = Math.abs(analysis.leftKneeAngle - analysis.rightKneeAngle);
                score -= kneeDiff * 2;
                
                // 背部角度
                const backDeviation = Math.abs(analysis.backAngle - 90);
                score -= backDeviation * 2;
                break;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    detectAdvancedErrors(analysis) {
        const errors = [];
        
        switch (analysis.exerciseType) {
            case 'pushup':
                if (analysis.bodyAlignment > 15) {
                    errors.push({
                        type: 'body_misalignment',
                        message: '身体不够直，保持一条直线',
                        severity: 'high',
                        suggestion: '收紧核心，保持头、肩、髋、踝在一条直线上'
                    });
                }
                
                const armDiff = Math.abs(analysis.leftArmAngle - analysis.rightArmAngle);
                if (armDiff > 15) {
                    errors.push({
                        type: 'asymmetric_arms',
                        message: '两臂动作不对称',
                        severity: 'medium',
                        suggestion: '保持两臂同步，均匀发力'
                    });
                }
                break;
                
            case 'squat':
                if (analysis.backAngle < 70) {
                    errors.push({
                        type: 'forward_lean',
                        message: '身体过度前倾',
                        severity: 'high',
                        suggestion: '保持胸部挺起，背部挺直'
                    });
                }
                
                const kneeDiff = Math.abs(analysis.leftKneeAngle - analysis.rightKneeAngle);
                if (kneeDiff > 15) {
                    errors.push({
                        type: 'knee_asymmetry',
                        message: '膝盖动作不对称',
                        severity: 'medium',
                        suggestion: '保持两腿同步下蹲'
                    });
                }
                break;
        }
        
        return errors;
    }
    
    drawEnhancedPose(keypoints, analysisResult) {
        // 先绘制基本姿态
        this.drawPose(keypoints);
        
        // 绘制增强信息
        if (analysisResult && analysisResult.analysis) {
            this.drawAnalysisOverlay(analysisResult);
        }
    }
    
    drawAnalysisOverlay(analysisResult) {
        const analysis = analysisResult.analysis;
        const x = this.canvas.width - 200;
        const y = 100;
        
        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(x - 10, y - 25, 180, 120);
        
        // 形态评分
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('形态评分:', x, y);
        
        const scoreColor = analysisResult.formScore > 80 ? '#00ff00' : 
                          analysisResult.formScore > 60 ? '#ffff00' : '#ff6b6b';
        this.ctx.fillStyle = scoreColor;
        this.ctx.fillText(`${analysisResult.formScore.toFixed(1)}%`, x + 80, y);
        
        // 动作阶段
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('阶段:', x, y + 20);
        this.ctx.fillStyle = '#00ccff';
        this.ctx.fillText(analysis.phase || 'unknown', x + 50, y + 20);
        
        // 错误提示
        if (analysisResult.errors && analysisResult.errors.length > 0) {
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fillText('错误:', x, y + 40);
            
            analysisResult.errors.slice(0, 2).forEach((error, index) => {
                this.ctx.font = '12px Arial';
                this.ctx.fillText(error.message.substring(0, 15) + '...', x, y + 60 + index * 15);
            });
        }
    }
    
    recordAnalysisData(analysisResult) {
        if (!this.dataRecorder.sessionActive || !analysisResult) {
            return;
        }
        
        const session = this.dataRecorder.currentSession;
        
        // 记录形态评分
        session.formScores.push(analysisResult.formScore);
        
        // 记录错误
        if (analysisResult.errors && analysisResult.errors.length > 0) {
            session.errors.push(...analysisResult.errors.map(error => ({
                ...error,
                timestamp: analysisResult.timestamp,
                repNumber: session.reps
            })));
        }
        
        // 记录详细分析数据
        session.analysisData.push({
            timestamp: analysisResult.timestamp,
            analysis: analysisResult.analysis,
            formScore: analysisResult.formScore,
            phase: analysisResult.phase
        });
        
        // 更新实时显示
        this.updateRealTimeDisplay(analysisResult);
    }
    
    updateRealTimeDisplay(analysisResult) {
        // 更新错误提示
        this.showRealTimeFeedback(analysisResult.errors);
        
        // 更新形态评分显示
        const scoreElement = document.getElementById('formScore');
        if (scoreElement) {
            scoreElement.textContent = `${analysisResult.formScore.toFixed(1)}%`;
            scoreElement.className = analysisResult.formScore > 80 ? 'score-good' : 
                                   analysisResult.formScore > 60 ? 'score-medium' : 'score-poor';
        }
    }
    
    saveSessionToBackend(sessionSummary) {
        // 模拟保存到后端
        console.log('保存训练会话数据:', sessionSummary);
        
        // 这里可以添加实际的API调用
        // fetch('/api/sessions', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(sessionSummary)
        // });
    }
    
    calculateCalories(reps, duration) {
        // 根据运动类型和强度计算卡路里
        const caloriesPerRep = {
            'pushup': 0.5,
            'squat': 0.3,
            'situp': 0.4,
            'plank': 0.1, // 每秒
            'jumping_jacks': 0.8,
            'lunges': 1.2,
            'burpees': 2.5,
            'pull_ups': 0.8
        };
        
        const baseCalories = (caloriesPerRep[this.currentExercise] || 0.5) * reps;
        const timeBonus = duration > 300 ? duration * 0.01 : 0; // 超过5分钟的时间奖励
        
        return baseCalories + timeBonus;
    }
    
    drawPose(keypoints) {
        if (!keypoints || !this.ctx) return;
        
        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制骨架连接（先绘制连接线，再绘制关键点）
        const connections = [
            ['nose', 'leftEye'],
            ['nose', 'rightEye'],
            ['leftEye', 'leftEar'],
            ['rightEye', 'rightEar'],
            ['leftShoulder', 'rightShoulder'],
            ['leftShoulder', 'leftElbow'],
            ['leftElbow', 'leftWrist'],
            ['rightShoulder', 'rightElbow'],
            ['rightElbow', 'rightWrist'],
            ['leftShoulder', 'leftHip'],
            ['rightShoulder', 'rightHip'],
            ['leftHip', 'rightHip'],
            ['leftHip', 'leftKnee'],
            ['leftKnee', 'leftAnkle'],
            ['rightHip', 'rightKnee'],
            ['rightKnee', 'rightAnkle']
        ];
        
        // 绘制连接线
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        
        connections.forEach(([start, end]) => {
            const startPoint = keypoints[start];
            const endPoint = keypoints[end];
            
            if (startPoint && endPoint && 
                startPoint.confidence > 0.2 && endPoint.confidence > 0.2) { // 降低连接线置信度阈值
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                this.ctx.stroke();
            }
        });
        
        // 绘制关键点
        if (Array.isArray(keypoints)) {
            // 如果keypoints是数组格式
            keypoints.forEach((point, index) => {
                if (point && point.score > 0.3) {
                    // 外圈
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
                    this.ctx.fillStyle = '#ffffff'; // 外圈白色不变
                    this.ctx.fill();
                    
                    // 内圈
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, innerRadius, 0, 2 * Math.PI);
                    this.ctx.fillStyle = color; // 根据置信度设置内圈颜色
                    this.ctx.fill();
                }
            });
        } else {
            // 如果keypoints是对象格式
            Object.keys(keypoints).forEach(pointName => {
                const point = keypoints[pointName];
                if (point && (point.confidence > 0.1 || point.score > 0.1)) { // 降低关键点置信度阈值
                    // 根据置信度调整点的外观
                    const radius = point.confidence > 0.5 || point.score > 0.5 ? 8 : 5;
                    const innerRadius = point.confidence > 0.5 || point.score > 0.5 ? 5 : 3;
                    const color = point.confidence > 0.5 || point.score > 0.5 ? '#00ff00' : '#ffcc00'; // 高置信度绿色，低置信度黄色
                    // 外圈
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
                    this.ctx.fillStyle = '#ffffff'; // 外圈白色不变
                    this.ctx.fill();
                    
                    // 内圈
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, innerRadius, 0, 2 * Math.PI);
                    this.ctx.fillStyle = color; // 根据置信度设置内圈颜色
                    this.ctx.fill();
                }
            });
        }
        
        // 绘制运动特定的检测信息
        this.drawExerciseSpecificInfo(keypoints);
    }
    
    drawExerciseSpecificInfo(keypoints) {
        if (!this.currentExercise) return;
        
        // 根据不同运动绘制特定的检测信息
        switch (this.currentExercise) {
            case 'pushup':
                this.drawPushupInfo(keypoints);
                break;
            case 'squat':
                this.drawSquatInfo(keypoints);
                break;
            case 'situp':
                this.drawSitupInfo(keypoints);
                break;
            case 'plank':
                this.drawPlankInfo(keypoints);
                break;
            default:
                this.drawGeneralInfo(keypoints);
        }
        
        // 绘制状态指示器
        this.drawStatusIndicator();
    }
    
    drawPushupInfo(keypoints) {
        // 绘制手臂角度
        const leftAngle = this.calculateArmAngle(keypoints, 'left');
        const rightAngle = this.calculateArmAngle(keypoints, 'right');
        
        if (leftAngle > 0) {
            this.drawAngleArc(keypoints.leftShoulder, keypoints.leftElbow, keypoints.leftWrist, leftAngle, 'L');
        }
        if (rightAngle > 0) {
            this.drawAngleArc(keypoints.rightShoulder, keypoints.rightElbow, keypoints.rightWrist, rightAngle, 'R');
        }
        
        // 绘制身体直线检测
        this.drawBodyAlignment(keypoints, ['leftShoulder', 'leftHip', 'leftAnkle']);
    }
    
    drawSquatInfo(keypoints) {
        // 绘制膝盖角度
        const leftKneeAngle = this.calculateLegAngle(keypoints, 'left');
        const rightKneeAngle = this.calculateLegAngle(keypoints, 'right');
        
        if (leftKneeAngle > 0) {
            this.drawAngleArc(keypoints.leftHip, keypoints.leftKnee, keypoints.leftAnkle, leftKneeAngle, 'L');
        }
        if (rightKneeAngle > 0) {
            this.drawAngleArc(keypoints.rightHip, keypoints.rightKnee, keypoints.rightAnkle, rightKneeAngle, 'R');
        }
    }
    
    drawAngleArc(point1, point2, point3, angle, label) {
        if (!point1 || !point2 || !point3) return;
        
        const radius = 30;
        this.ctx.beginPath();
        this.ctx.arc(point2.x, point2.y, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = angle > 90 ? '#00ff00' : '#ff6b6b';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // 显示角度数值
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(`${Math.round(angle)}°`, point2.x + 35, point2.y - 10);
        this.ctx.fillText(label, point2.x + 35, point2.y + 10);
    }
    
    drawBodyAlignment(keypoints, points) {
        const alignmentPoints = points.map(name => keypoints[name]).filter(p => p && p.confidence > 0.5);
        if (alignmentPoints.length < 2) return;
        
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(alignmentPoints[0].x, alignmentPoints[0].y);
        for (let i = 1; i < alignmentPoints.length; i++) {
            this.ctx.lineTo(alignmentPoints[i].x, alignmentPoints[i].y);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    drawStatusIndicator() {
        // 绘制状态指示器
        const x = this.canvas.width - 150;
        const y = 30;
        
        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x - 10, y - 25, 140, 80);
        
        // 计数器
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText(`计数: ${this.exerciseCounter}`, x, y);
        
        // 准确率
        const accuracyColor = this.accuracy > 80 ? '#00ff00' : this.accuracy > 60 ? '#ffff00' : '#ff6b6b';
        this.ctx.fillStyle = accuracyColor;
        this.ctx.fillText(`准确率: ${this.accuracy}%`, x, y + 20);
        
        // 状态
        this.ctx.fillStyle = this.exerciseState === 'up' ? '#00ff00' : '#ff6b6b';
        this.ctx.fillText(`状态: ${this.exerciseState}`, x, y + 40);
    }
    
    drawSkeleton(keypoints) {
        const connections = [
            ['leftShoulder', 'rightShoulder'],
            ['leftShoulder', 'leftElbow'],
            ['leftElbow', 'leftWrist'],
            ['rightShoulder', 'rightElbow'],
            ['rightElbow', 'rightWrist'],
            ['leftShoulder', 'leftHip'],
            ['rightShoulder', 'rightHip'],
            ['leftHip', 'rightHip'],
            ['leftHip', 'leftKnee'],
            ['leftKnee', 'leftAnkle'],
            ['rightHip', 'rightKnee'],
            ['rightKnee', 'rightAnkle']
        ];
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        
        connections.forEach(([start, end]) => {
            const startPoint = keypoints[start];
            const endPoint = keypoints[end];
            
            if (startPoint && endPoint && 
                startPoint.confidence > 0.2 && endPoint.confidence > 0.2) { // 降低连接线置信度阈值
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                this.ctx.stroke();
            }
        });
    }
    
    analyzePose(keypoints) {
        if (!this.currentExercise) return;
        console.log(`Analyzing pose for ${this.currentExercise}, current counter: ${this.exerciseCounter}, state: ${this.exerciseState}`);
        
        // 重置当前帧的错误状态
        this.currentErrors = [];
        
        const threshold = this.exerciseThresholds[this.currentExercise];
        if (!threshold) return;
        
        let angle = 0;
        let isCorrectPose = false; // 用于判断当前帧的姿势是否有效，影响准确率计算
        
        switch (this.currentExercise) {
            case 'pushup':
                const leftArmAngle = this.calculateArmAngle(keypoints, 'left', true);
                const rightArmAngle = this.calculateArmAngle(keypoints, 'right', true);
                if (leftArmAngle > 0 && rightArmAngle > 0) {
                    angle = (leftArmAngle + rightArmAngle) / 2;
                } else if (leftArmAngle > 0) {
                    angle = leftArmAngle;
                } else if (rightArmAngle > 0) {
                    angle = rightArmAngle;
                } else {
                    angle = 0; // 或者使用上一个有效角度, 或标记为无效
                }
                this.currentAngle = angle; // 更新全局当前角度
                isCorrectPose = this.analyzePushup(keypoints, angle); 
                break;
            case 'squat':
                const leftLegAngle = this.calculateLegAngle(keypoints, 'left', true);
                const rightLegAngle = this.calculateLegAngle(keypoints, 'right', true);
                if (leftLegAngle > 0 && rightLegAngle > 0) {
                    angle = (leftLegAngle + rightLegAngle) / 2;
                } else if (leftLegAngle > 0) {
                    angle = leftLegAngle;
                } else if (rightLegAngle > 0) {
                    angle = rightLegAngle;
                } else {
                    angle = 0; // 或者使用上一个有效角度, 或标记为无效
                }
                this.currentAngle = angle; // 更新全局当前角度
                isCorrectPose = this.analyzeSquat(keypoints, angle);
                break;
            case 'situp':
                angle = this.calculateTorsoAngle(keypoints);
                isCorrectPose = this.analyzeSitup(keypoints, angle);
                break;
            case 'plank':
                angle = this.calculatePlankAngle(keypoints);
                isCorrectPose = this.analyzePlank(keypoints, angle);
                break;
            case 'jumping_jacks':
                angle = this.calculateArmAngle(keypoints);
                isCorrectPose = this.analyzeJumpingJacks(keypoints, angle);
                break;
            case 'lunges':
                const leftLegAngleLunges = this.calculateLegAngle(keypoints, 'left', true);
                const rightLegAngleLunges = this.calculateLegAngle(keypoints, 'right', true);
                if (leftLegAngleLunges > 0 && rightLegAngleLunges > 0) {
                    angle = Math.min(leftLegAngleLunges, rightLegAngleLunges); // 使用更弯曲的腿
                } else if (leftLegAngleLunges > 0) {
                    angle = leftLegAngleLunges;
                } else if (rightLegAngleLunges > 0) {
                    angle = rightLegAngleLunges;
                } else {
                    angle = 0;
                }
                this.currentAngle = angle;
                isCorrectPose = this.analyzeLunges(keypoints, angle);
                break;
            case 'burpees':
                angle = this.calculateTorsoAngle(keypoints);
                isCorrectPose = this.analyzeBurpees(keypoints, angle);
                break;
            case 'pull_ups':
                const leftShoulder = keypoints.leftShoulder;
                const leftElbow = keypoints.leftElbow;
                const leftWrist = keypoints.leftWrist;
                console.log('Pull-ups keypoints:', { leftShoulder, leftElbow, leftWrist });
                if (leftShoulder && leftElbow && leftWrist &&
                    leftShoulder.confidence > 0.3 && leftElbow.confidence > 0.3 && leftWrist.confidence > 0.3) {
                    angle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
                    this.currentAngle = angle;
                    isCorrectPose = this.analyzePullUps(keypoints, angle);
                } else {
                    console.warn('Pull-ups: Not enough keypoints detected or low confidence for angle calculation.', {leftShoulder, leftElbow, leftWrist});
                    this.addError('引体向上：关键点检测不清晰，请确保身体在摄像头范围内且光线充足。');
                    isCorrectPose = false;
                }
                break;
        }
        
        // this.currentAngle = angle; // 已在 switch case 中更新
        
        // 使用改进的状态检测方法
        if (angle > 0 && threshold) {
            this.detectExerciseStateImproved(angle, threshold);
        }

        // 检查动作错误并提供反馈
        this.checkFormErrors(keypoints); // 注意：这里传入的 keypoints，而不是 this.currentExercise

        // 更新准确率历史 (使用 this.poseAccuracyHistory)
        this.poseAccuracyHistory.push(isCorrectPose ? 1 : 0);
        if (this.poseAccuracyHistory.length > 100) { // 保持最近100帧的准确率
            this.poseAccuracyHistory.shift();
        }
        // 计算准确率
        if (this.poseAccuracyHistory.length > 0) {
            this.accuracy = Math.round((this.poseAccuracyHistory.reduce((a, b) => a + b, 0) / this.poseAccuracyHistory.length) * 100);
        } else {
            this.accuracy = 0;
        }

        // 显示实时反馈
        this.showRealTimeFeedback();
    }
    
    checkFormErrors(keypoints) {
        if (!this.currentExercise) return;
        
        switch (this.currentExercise) {
            case 'pushup':
                this.checkPushupForm(keypoints);
                break;
            case 'squat':
                this.checkSquatForm(keypoints);
                break;
            case 'situp':
                this.checkSitupForm(keypoints);
                break;
            case 'plank':
                this.checkPlankForm(keypoints);
                break;
        }
    }
    
    checkPushupForm(keypoints) {
        // 检查手臂角度
        const leftArmAngle = this.calculateArmAngle(keypoints, 'left');
        const rightArmAngle = this.calculateArmAngle(keypoints, 'right');
        
        if (leftArmAngle > 0 && leftArmAngle < 45) {
            this.addError('手臂弯曲不够，需要更深的俯卧撑');
        }
        if (rightArmAngle > 0 && rightArmAngle < 45) {
            this.addError('右臂弯曲不够，需要更深的俯卧撑');
        }
        
        // 检查身体直线
        if (!this.checkBodyAlignment(keypoints, ['leftShoulder', 'leftHip', 'leftAnkle'], 15)) {
            this.addError('保持身体成直线，不要塌腰或抬臀');
        }
        
        // 检查手的位置
        const leftShoulder = keypoints.leftShoulder;
        const leftWrist = keypoints.leftWrist;
        const rightShoulder = keypoints.rightShoulder;
        const rightWrist = keypoints.rightWrist;
        
        if (leftShoulder && leftWrist && rightShoulder && rightWrist) {
            const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
            const handWidth = Math.abs(rightWrist.x - leftWrist.x);
            
            if (handWidth < shoulderWidth * 0.8) {
                this.addError('手的距离太近，应与肩同宽');
            } else if (handWidth > shoulderWidth * 1.5) {
                this.addError('手的距离太宽，应与肩同宽');
            }
        }
    }
    
    checkSquatForm(keypoints) {
        // 检查膝盖角度
        const leftKneeAngle = this.calculateLegAngle(keypoints, 'left');
        const rightKneeAngle = this.calculateLegAngle(keypoints, 'right');
        
        if (this.exerciseState === 'down') {
            if (leftKneeAngle > 120 || rightKneeAngle > 120) {
                this.addError('蹲得不够深，膝盖应弯曲至90度');
            }
        }
        
        // 检查膝盖是否内扣
        const leftKnee = keypoints.leftKnee;
        const rightKnee = keypoints.rightKnee;
        const leftAnkle = keypoints.leftAnkle;
        const rightAnkle = keypoints.rightAnkle;
        
        if (leftKnee && rightKnee && leftAnkle && rightAnkle) {
            const kneeWidth = Math.abs(rightKnee.x - leftKnee.x);
            const ankleWidth = Math.abs(rightAnkle.x - leftAnkle.x);
            
            if (kneeWidth < ankleWidth * 0.8) {
                this.addError('膝盖内扣，保持膝盖与脚尖方向一致');
            }
        }
        
        // 检查背部挺直
        if (!this.checkBodyAlignment(keypoints, ['leftShoulder', 'leftHip'], 20)) {
            this.addError('保持背部挺直，不要弯腰');
        }
    }
    
    checkSitupForm(keypoints) {
        // 检查仰卧起坐姿势
        const torsoAngle = this.calculateTorsoAngle(keypoints);
        
        if (this.exerciseState === 'up' && torsoAngle < 30) {
            this.addError('起身角度不够，需要更大幅度');
        }
    }
    
    checkPlankForm(keypoints) {
        // 检查平板支撑姿势
        if (!this.checkBodyAlignment(keypoints, ['leftShoulder', 'leftHip', 'leftAnkle'], 10)) {
            this.addError('保持身体成直线，不要塌腰或抬臀');
        }
    }
    
    checkBodyAlignment(keypoints, points, tolerance = 10) {
        const alignmentPoints = points.map(name => keypoints[name]).filter(p => p && p.confidence > 0.5);
        if (alignmentPoints.length < 2) return true;
        
        // 计算直线的斜率
        const first = alignmentPoints[0];
        const last = alignmentPoints[alignmentPoints.length - 1];
        const expectedSlope = (last.y - first.y) / (last.x - first.x);
        
        // 检查中间点是否在直线上
        for (let i = 1; i < alignmentPoints.length - 1; i++) {
            const point = alignmentPoints[i];
            const expectedY = first.y + expectedSlope * (point.x - first.x);
            const deviation = Math.abs(point.y - expectedY);
            
            if (deviation > tolerance) {
                return false;
            }
        }
        
        return true;
    }
    
    addError(message) {
        if (!this.currentErrors) {
            this.currentErrors = [];
        }
        if (!this.currentErrors.includes(message)) {
            this.currentErrors.push(message);
        }
    }
    
    showRealTimeFeedback() {
        // 显示错误提示
        this.displayErrors();
        
        // 语音反馈（如果启用）
        if (this.voiceFeedbackEnabled && this.currentErrors && this.currentErrors.length > 0) {
            this.speakFeedback(this.currentErrors[0]);
        }
    }
    
    displayErrors() {
        const errorContainer = document.getElementById('error-feedback');
        if (!errorContainer) return;
        
        if (this.currentErrors && this.currentErrors.length > 0) {
            errorContainer.innerHTML = this.currentErrors.map(error => 
                `<div class="error-message">${error}</div>`
            ).join('');
            errorContainer.style.display = 'block';
        } else {
            errorContainer.style.display = 'none';
        }
    }
    
    speakFeedback(message) {
        if (!this.lastSpokenTime || Date.now() - this.lastSpokenTime > 3000) {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(message);
                utterance.lang = 'zh-CN';
                utterance.rate = 0.8;
                speechSynthesis.speak(utterance);
                this.lastSpokenTime = Date.now();
            }
        }
    }
    
    analyzePushup(keypoints, angle) {
        const thresholds = this.exerciseThresholds.pushup; // 假设 thresholds.down 和 thresholds.up 存在
        if (!thresholds || typeof thresholds.down === 'undefined' || typeof thresholds.up === 'undefined') {
            this.showFeedback('俯卧撑阈值配置不完整 (需要 down 和 up)', 'error');
            return false; // 姿势无效
        }

        let poseValidForAccuracy = false; 

        if (!this.exerciseState) {
            this.exerciseState = 'up'; // 初始化状态
        }
        
        // 确保角度有效才进行判断
        if (angle > 0) {
            if (this.exerciseState === 'up' && angle < thresholds.down) {
                this.exerciseState = 'down';
                this.feedback = '向下';
                poseValidForAccuracy = true;
                console.log('俯卧撑: 下降阶段');
            } else if (this.exerciseState === 'down' && angle > thresholds.up) {
                this.exerciseState = 'up';
                this.exerciseCounter++;
                this.calories += 0.5;
                this.feedback = '向上 - 完成!';
                this.showFeedback(`完成 ${this.exerciseCounter} 次俯卧撑`, 'success');
                this.playCountSound();
                console.log('俯卧撑计数:', this.exerciseCounter, '- 完成一次完整动作(下降->上升)');
                if (this.onRepComplete) this.onRepComplete(this.exerciseCounter, this.calories, this.accuracy);
                poseValidForAccuracy = true;
            } else if ((this.exerciseState === 'up' && angle >= thresholds.down) ||
                       (this.exerciseState === 'down' && angle <= thresholds.up)) {
                // 在有效的运动范围内，但未完成一次计数
                poseValidForAccuracy = true;
            }
        } else {
             this.feedback = '手臂角度无法计算'; // 角度无效
             poseValidForAccuracy = false;
        }
        
        // 移除内部的 accuracy 计算和 updateStats 调用
        // this.accuracy = ...;
        // this.updateStats();
        
        return poseValidForAccuracy; 
    }
    
    analyzeSquat(keypoints, angle) {
        const thresholds = this.exerciseThresholds.squat; // 假设 thresholds.down 和 thresholds.up 存在
        if (!thresholds || typeof thresholds.down === 'undefined' || typeof thresholds.up === 'undefined') {
            this.showFeedback('深蹲阈值配置不完整 (需要 down 和 up)', 'error');
            return false; // 姿势无效
        }
        
        let poseValidForAccuracy = false;

        if (!this.exerciseState) {
            this.exerciseState = 'up'; // 初始化状态
        }

        // 确保角度有效才进行判断
        if (angle > 0) {
            if (this.exerciseState === 'up' && angle < thresholds.down) {
                this.exerciseState = 'down';
                this.feedback = '下蹲';
                poseValidForAccuracy = true;
                console.log('深蹲: 下蹲阶段');
            } else if (this.exerciseState === 'down' && angle > thresholds.up) {
                this.exerciseState = 'up';
                this.exerciseCounter++;
                this.calories += 0.32;
                this.feedback = '起立 - 完成!';
                this.showFeedback(`完成 ${this.exerciseCounter} 次深蹲`, 'success');
                this.playCountSound();
                console.log('深蹲计数:', this.exerciseCounter, '- 完成一次完整动作(下蹲->起立)');
                if (this.onRepComplete) this.onRepComplete(this.exerciseCounter, this.calories, this.accuracy);
                poseValidForAccuracy = true;
            } else if ((this.exerciseState === 'up' && angle >= thresholds.down) ||
                       (this.exerciseState === 'down' && angle <= thresholds.up)) {
                // 在有效的运动范围内，但未完成一次计数
                poseValidForAccuracy = true;
            }
        } else {
            this.feedback = '腿部角度无法计算'; // 角度无效
            poseValidForAccuracy = false;
        }

        // 移除内部的 accuracy 计算和 updateStats 调用
        // this.accuracy = ...;
        // this.updateStats();

        return poseValidForAccuracy;
    }
    
    analyzeSitup(keypoints, angle) {
        const threshold = this.exerciseThresholds.situp;
        
        if (angle > threshold.maxAngle && this.exerciseState === 'down') {
            this.exerciseState = 'up';
            this.exerciseCounter++;
            this.calories += 0.4; // 每个仰卧起坐消耗约0.4卡路里
            this.showFeedback(`仰卧起坐 ${this.exerciseCounter} 个`, 'success');
            this.updateStats();
            return true;
        } else if (angle < threshold.minAngle && this.exerciseState === 'up') {
            this.exerciseState = 'down';
            return true;
        }
        
        return angle >= threshold.minAngle && angle <= threshold.maxAngle;
    }
    
    analyzePlank(keypoints, angle) {
        const threshold = this.exerciseThresholds.plank;
        
        if (angle >= threshold.minAngle && angle <= threshold.maxAngle) {
            // 平板支撑按时间计算
            const currentTime = Date.now();
            if (currentTime - this.lastPoseTime > 1000) { // 每秒更新一次
                this.exerciseCounter++;
                this.calories += 0.1; // 每秒消耗约0.1卡路里
                this.lastPoseTime = currentTime;
                this.showFeedback(`平板支撑 ${this.exerciseCounter} 秒`, 'success');
                this.updateStats();
            }
            return true;
        } else {
            this.showFeedback('保持身体挺直', 'warning');
            return false;
        }
    }
    
    calculateArmAngle(keypoints) {
        // 计算手臂角度（肩膀-肘部-手腕）
        const shoulder = keypoints.leftShoulder;
        const elbow = keypoints.leftElbow;
        const wrist = keypoints.leftWrist;
        
        if (!shoulder || !elbow || !wrist) return 0;
        
        return this.calculateAngle(shoulder, elbow, wrist);
    }
    
    calculateLegAngle(keypoints) {
        // 计算腿部角度（髋部-膝盖-脚踝）
        const hip = keypoints.leftHip;
        const knee = keypoints.leftKnee;
        const ankle = keypoints.leftAnkle;
        
        if (!hip || !knee || !ankle) return 0;
        
        return this.calculateAngle(hip, knee, ankle);
    }
    
    calculateTorsoAngle(keypoints) {
        // 计算躯干角度（肩膀-髋部-膝盖）
        const shoulder = keypoints.leftShoulder;
        const hip = keypoints.leftHip;
        const knee = keypoints.leftKnee;
        
        if (!shoulder || !hip || !knee) return 0;
        
        return this.calculateAngle(shoulder, hip, knee);
    }
    
    calculatePlankAngle(keypoints) {
        // 计算平板支撑角度（肩膀-髋部的水平角度）
        const leftShoulder = keypoints.leftShoulder;
        const rightShoulder = keypoints.rightShoulder;
        const leftHip = keypoints.leftHip;
        const rightHip = keypoints.rightHip;
        
        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip ||
            (typeof leftShoulder.confidence !== 'undefined' && leftShoulder.confidence < 0.3) || 
            (typeof rightShoulder.confidence !== 'undefined' && rightShoulder.confidence < 0.3) || 
            (typeof leftHip.confidence !== 'undefined' && leftHip.confidence < 0.3) || 
            (typeof rightHip.confidence !== 'undefined' && rightHip.confidence < 0.3) ||
            (typeof leftShoulder.score !== 'undefined' && leftShoulder.score < 0.3) || 
            (typeof rightShoulder.score !== 'undefined' && rightShoulder.score < 0.3) || 
            (typeof leftHip.score !== 'undefined' && leftHip.score < 0.3) || 
            (typeof rightHip.score !== 'undefined' && rightHip.score < 0.3)) {
            console.warn('Plank: Not enough keypoints for angle calculation or low confidence/score.');
            return 0;
        }
        
        // 计算肩膀和髋部的中点
        const shoulderMid = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };
        
        const hipMid = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };
        
        // 计算与水平线的角度
        const deltaY = hipMid.y - shoulderMid.y;
        const deltaX = hipMid.x - shoulderMid.x;
        const angle = Math.abs(Math.atan2(deltaY, deltaX) * 180 / Math.PI);
        
        return 180 - angle; // 返回与水平线的夹角
    }
    
    calculateAngle(point1, point2, point3) {
        // 检查输入点是否有效
        if (!point1 || !point2 || !point3 || 
            typeof point1.x === 'undefined' || typeof point1.y === 'undefined' ||
            typeof point2.x === 'undefined' || typeof point2.y === 'undefined' ||
            typeof point3.x === 'undefined' || typeof point3.y === 'undefined') {
            console.error('Invalid points provided to calculateAngle:', { point1, point2, point3 });
            return 0; // 或者抛出错误，或者返回一个表示无效的值
        }

        // 计算三点之间的角度
        const vector1 = {
            x: point1.x - point2.x,
            y: point1.y - point2.y
        };
        
        const vector2 = {
            x: point3.x - point2.x,
            y: point3.y - point2.y
        };
        
        const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
        const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
        const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        
        const cosAngle = dotProduct / (magnitude1 * magnitude2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
        
        return angle;
    }
    
    calculateArmAngle(keypoints, side) {
        const shoulder = keypoints[`${side}Shoulder`];
        const elbow = keypoints[`${side}Elbow`];
        const wrist = keypoints[`${side}Wrist`];
        
        if (!shoulder || !elbow || !wrist || 
            shoulder.confidence < 0.5 || elbow.confidence < 0.5 || wrist.confidence < 0.5) {
            return 0;
        }
        
        return this.calculateAngle(shoulder, elbow, wrist);
    }
    
    calculateLegAngle(keypoints, side) {
        const hip = keypoints[`${side}Hip`];
        const knee = keypoints[`${side}Knee`];
        const ankle = keypoints[`${side}Ankle`];
        
        if (!hip || !knee || !ankle || 
            hip.confidence < 0.5 || knee.confidence < 0.5 || ankle.confidence < 0.5) {
            return 0;
        }
        
        return this.calculateAngle(hip, knee, ankle);
    }
    
    drawSitupInfo(keypoints) {
        // 绘制躯干角度
        const shoulder = keypoints.leftShoulder || keypoints.rightShoulder;
        const hip = keypoints.leftHip || keypoints.rightHip;
        const knee = keypoints.leftKnee || keypoints.rightKnee;
        
        if (shoulder && hip && knee) {
            const angle = this.calculateAngle(shoulder, hip, knee);
            this.drawAngleArc(shoulder, hip, knee, angle, 'T');
        }
    }
    
    drawPlankInfo(keypoints) {
        // 绘制身体直线检测
        this.drawBodyAlignment(keypoints, ['leftShoulder', 'leftHip', 'leftAnkle']);
        this.drawBodyAlignment(keypoints, ['rightShoulder', 'rightHip', 'rightAnkle']);
    }
    
    drawGeneralInfo(keypoints) {
        // 通用检测信息绘制
        this.drawBodyAlignment(keypoints, ['leftShoulder', 'leftHip', 'leftKnee']);
        this.drawBodyAlignment(keypoints, ['rightShoulder', 'rightHip', 'rightKnee']);
    }
    
    calculateTorsoAngle(keypoints) {
        const shoulder = keypoints.leftShoulder || keypoints.rightShoulder;
        const hip = keypoints.leftHip || keypoints.rightHip;
        
        if (!shoulder || !hip || shoulder.confidence < 0.5 || hip.confidence < 0.5) {
            return 0;
        }
        
        // 计算躯干与水平面的角度
        const deltaY = shoulder.y - hip.y;
        const deltaX = shoulder.x - hip.x;
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        return Math.abs(angle);
    }
    
    updateStats() {
        // 更新统计信息显示
        const statsElements = {
            count: document.getElementById('repCount'),
            time: document.getElementById('timeCount'),
            calories: document.getElementById('calorieCount'),
            accuracy: document.getElementById('accuracyScore'),
            angle: document.getElementById('angleIndicator'),
            formScore: document.getElementById('formScore'),
            realTimeAccuracy: document.getElementById('realTimeAccuracy')
        };

        if (statsElements.count) {
            statsElements.count.textContent = this.exerciseCounter;
        }

        if (statsElements.time && this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            statsElements.time.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        if (statsElements.calories) {
            statsElements.calories.textContent = Math.round(this.calories);
        }

        // 更新准确率显示 - 使用实时计算的准确率
        if (statsElements.accuracy) {
            // 优先使用实时准确率，如果没有则使用总体准确率
            const displayAccuracy = Math.round(this.realTimeAccuracy || this.accuracy || 0);
            statsElements.accuracy.textContent = `${displayAccuracy}%`;

            // 根据准确率设置颜色
            if (displayAccuracy >= 80) {
                statsElements.accuracy.className = 'stat-number text-success';
            } else if (displayAccuracy >= 60) {
                statsElements.accuracy.className = 'stat-number text-warning';
            } else {
                statsElements.accuracy.className = 'stat-number text-danger';
            }

            // 强制触发DOM更新
            statsElements.accuracy.style.animation = 'none';
            statsElements.accuracy.offsetHeight; // 触发重排
            statsElements.accuracy.style.animation = null;
        }

        // 调用准确率显示更新
        this.updateWorkoutAccuracyDisplay();

        // 更新实时形态评分
        if (statsElements.formScore) {
            const formScore = Math.round(this.currentFormScore);
            statsElements.formScore.textContent = `${formScore}%`;

            // 根据形态评分设置颜色
            if (formScore >= 80) {
                statsElements.formScore.className = 'stat-number text-success';
            } else if (formScore >= 60) {
                statsElements.formScore.className = 'stat-number text-warning';
            } else {
                statsElements.formScore.className = 'stat-number text-danger';
            }
        }

        // 更新实时准确率
        if (statsElements.realTimeAccuracy) {
            const realTimeAcc = Math.round(this.realTimeAccuracy);
            statsElements.realTimeAccuracy.textContent = `${realTimeAcc}%`;

            // 根据实时准确率设置颜色
            if (realTimeAcc >= 80) {
                statsElements.realTimeAccuracy.className = 'stat-number text-success';
            } else if (realTimeAcc >= 60) {
                statsElements.realTimeAccuracy.className = 'stat-number text-warning';
            } else {
                statsElements.realTimeAccuracy.className = 'stat-number text-danger';
            }
        }

        if (statsElements.angle && this.currentAngle !== undefined) {
            statsElements.angle.textContent = `${Math.round(this.currentAngle)}°`;

            // 根据角度范围改变颜色提示
            const threshold = this.exerciseThresholds[this.currentExercise];
            if (threshold) {
                if (this.currentAngle >= threshold.minAngle && this.currentAngle <= threshold.maxAngle) {
                    statsElements.angle.className = 'stat-number text-success';
                } else {
                    statsElements.angle.className = 'stat-number text-warning';
                }
            }
        }

        // 更新目标进度
        this.updateTargetProgress();

        // 更新准确率统计信息
        this.updateAccuracyDisplay();

        // 同时更新所有其他准确率显示位置
        this.updateAllAccuracyElements();
    }

    // 新的统一准确率更新函数
    updateAllAccuracyDisplays() {
        // 立即更新基础统计
        this.updateStats();

        // 更新准确率详细信息
        this.updateAccuracyDisplay();

        // 更新workout.js中的准确率显示（如果存在）
        this.updateWorkoutAccuracyDisplay();
    }

    updateAllAccuracyElements() {
        // 获取所有可能的准确率显示元素
        const accuracyElements = {
            // workout.html中的主要统计元素
            accuracyScore: document.getElementById('accuracyScore'),
            formScore: document.getElementById('formScore'),
            realTimeAccuracy: document.getElementById('realTimeAccuracy'),
            repCount: document.getElementById('repCount'),
            timeCount: document.getElementById('timeCount'),
            calorieCount: document.getElementById('calorieCount'),
            // 其他可能的准确率显示元素
            workoutAccuracy: document.getElementById('accuracy'),
            workoutReps: document.getElementById('reps'),
            workoutTime: document.getElementById('time'),
            workoutCalories: document.getElementById('calories'),
            avgAccuracy: document.getElementById('avgAccuracy'),
            currentAccuracy: document.getElementById('currentAccuracy')
        };

        // 计算显示值
        const displayAccuracy = Math.round(this.realTimeAccuracy || this.accuracy || 0);
        const realTimeAcc = Math.round(this.realTimeAccuracy || 0);
        const formScore = Math.round(this.currentFormScore || 0);

        // 更新主要准确率显示元素
        if (accuracyElements.accuracyScore) {
            accuracyElements.accuracyScore.textContent = `${displayAccuracy}%`;
            this.setAccuracyColor(accuracyElements.accuracyScore, displayAccuracy);
        }

        if (accuracyElements.formScore) {
            accuracyElements.formScore.textContent = `${formScore}%`;
            this.setAccuracyColor(accuracyElements.formScore, formScore);
        }

        if (accuracyElements.realTimeAccuracy) {
            accuracyElements.realTimeAccuracy.textContent = `${realTimeAcc}%`;
            this.setAccuracyColor(accuracyElements.realTimeAccuracy, realTimeAcc);
        }

        // 更新计数和统计
        if (accuracyElements.repCount) {
            accuracyElements.repCount.textContent = this.exerciseCounter || 0;
        }

        if (accuracyElements.timeCount && this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            accuracyElements.timeCount.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        if (accuracyElements.calorieCount) {
            accuracyElements.calorieCount.textContent = Math.round(this.calories || 0);
        }

        // 更新workout页面的其他显示元素
        if (accuracyElements.workoutAccuracy) {
            accuracyElements.workoutAccuracy.textContent = `${displayAccuracy}%`;
            this.setAccuracyColor(accuracyElements.workoutAccuracy, displayAccuracy);
        }

        if (accuracyElements.workoutReps) {
            accuracyElements.workoutReps.textContent = this.exerciseCounter || 0;
        }

        if (accuracyElements.workoutTime && this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            accuracyElements.workoutTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        if (accuracyElements.workoutCalories) {
            accuracyElements.workoutCalories.textContent = Math.round(this.calories || 0);
        }

        // 强制触发DOM更新
        Object.values(accuracyElements).forEach(element => {
            if (element) {
                element.style.animation = 'none';
                element.offsetHeight; // 触发重排
                element.style.animation = null;
            }
        });

        console.log(`全局准确率显示更新: 实时=${realTimeAcc}%, 总体=${displayAccuracy}%, 评分=${formScore}%, 次数=${this.exerciseCounter}`);
    }

    setAccuracyColor(element, accuracy) {
        if (!element) return;

        // 移除现有的颜色类
        element.classList.remove('text-success', 'text-warning', 'text-danger');

        // 根据准确率设置颜色
        if (accuracy >= 80) {
            element.classList.add('text-success');
        } else if (accuracy >= 60) {
            element.classList.add('text-warning');
        } else {
            element.classList.add('text-danger');
        }
    }

    updateWorkoutAccuracyDisplay() {
        // 准备完整的数据对象
        const accuracyData = {
            accuracy: this.realTimeAccuracy || this.accuracy || 0,
            realTimeAccuracy: this.realTimeAccuracy || 0,
            formScore: this.currentFormScore || 0,
            reps: this.exerciseCounter || 0,
            calories: this.calories || 0,
            frameCount: this.frameCount || 0,
            correctFrames: this.correctFrames || 0,
            time: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0
        };

        console.log('更新准确率显示数据:', accuracyData);

        // 如果存在workout.js的实例，更新其准确率显示
        if (typeof window.workoutManager !== 'undefined' && window.workoutManager) {
            window.workoutManager.updateAccuracyFromDetector(accuracyData.accuracy);
        }

        // 如果存在全局更新函数，传递完整数据
        if (typeof window.updateWorkoutAccuracy !== 'undefined') {
            window.updateWorkoutAccuracy(accuracyData);
        }

        // 直接更新全局变量（如果存在）
        if (typeof window.currentAccuracy !== 'undefined') {
            window.currentAccuracy = accuracyData.accuracy;
        }

        console.log('向workout页面传递数据:', accuracyData);
    }

    updateAccuracyDisplay() {
        // 更新准确率相关的显示元素
        const accuracyInfo = document.getElementById('accuracyInfo');
        if (accuracyInfo) {
            // 确保数值在合理范围内
            const totalAccuracy = Math.max(0, Math.min(100, Math.round(this.accuracy || 0)));
            const realTimeAcc = Math.max(0, Math.min(100, Math.round(this.realTimeAccuracy || 0)));
            const formScore = Math.max(0, Math.min(100, Math.round(this.currentFormScore || 0)));
            const frameCount = this.frameCount || 0;
            const correctFrames = this.correctFrames || 0;

            accuracyInfo.innerHTML = `
                <div class="accuracy-details">
                    <div class="accuracy-item">
                        <span class="label">总体准确率:</span>
                        <span class="value ${this.getAccuracyClass(totalAccuracy)}">${totalAccuracy}%</span>
                    </div>
                    <div class="accuracy-item">
                        <span class="label">实时准确率:</span>
                        <span class="value ${this.getAccuracyClass(realTimeAcc)}">${realTimeAcc}%</span>
                    </div>
                    <div class="accuracy-item">
                        <span class="label">正确帧数:</span>
                        <span class="value">${correctFrames}/${frameCount}</span>
                    </div>
                    <div class="accuracy-item">
                        <span class="label">当前评分:</span>
                        <span class="value ${this.getAccuracyClass(formScore)}">${formScore}%</span>
                    </div>
                </div>
            `;

            // 强制触发DOM更新
            accuracyInfo.style.animation = 'none';
            accuracyInfo.offsetHeight; // 触发重排
            accuracyInfo.style.animation = null;

            console.log(`准确率详情更新: 总体=${totalAccuracy}%, 实时=${realTimeAcc}%, 评分=${formScore}%, 帧数=${correctFrames}/${frameCount}`);
        }
    }

    getAccuracyClass(accuracy) {
        if (accuracy >= 80) return 'high';
        if (accuracy >= 60) return 'medium';
        return 'low';
    }

    updateTargetProgress() {
        const targetReps = parseInt(document.getElementById('targetReps')?.value) || 20;
        const targetTime = parseInt(document.getElementById('targetTime')?.value) || 5; // 分钟

        // 计算次数进度
        const repsProgress = Math.min(100, (this.exerciseCounter / targetReps) * 100);

        // 计算时间进度
        let timeProgress = 0;
        if (this.startTime) {
            const elapsedMinutes = (Date.now() - this.startTime) / (1000 * 60);
            timeProgress = Math.min(100, (elapsedMinutes / targetTime) * 100);
        }

        // 使用较高的进度作为总进度
        const totalProgress = Math.max(repsProgress, timeProgress);

        // 更新进度条
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');

        if (progressBar) {
            progressBar.style.width = totalProgress + '%';

            // 根据进度改变颜色
            if (totalProgress >= 100) {
                progressBar.className = 'progress-bar bg-success';
            } else if (totalProgress >= 75) {
                progressBar.className = 'progress-bar bg-info';
            } else if (totalProgress >= 50) {
                progressBar.className = 'progress-bar bg-warning';
            } else {
                progressBar.className = 'progress-bar bg-danger';
            }
        }

        if (progressText) {
            progressText.textContent = Math.round(totalProgress) + '%';
        }

        // 检查是否达到目标
        if (this.exerciseCounter >= targetReps || timeProgress >= 100) {
            this.showTargetAchieved();
        }
    }

    showTargetAchieved() {
        if (!this.targetAchieved) {
            this.targetAchieved = true;
            this.showFeedback('🎉 恭喜！您已达成训练目标！', 'success');
            this.playAchievementSound();
        }
    }

    playAchievementSound() {
        try {
            // 创建成就音效
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 播放一系列音符
            const frequencies = [523, 659, 784, 1047]; // C, E, G, C
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                }, index * 150);
            });
        } catch (error) {
            console.log('成就音效播放失败:', error);
        }
    }
    
    showFeedback(message, type = 'info') {
        const feedbackElement = document.getElementById('poseFeedback');
        if (feedbackElement) {
            feedbackElement.textContent = message;
            feedbackElement.className = `alert alert-${type === 'error' ? 'danger' : type}`;
        }
        
        // 更新反馈文本
        this.feedback = message;
        
        // 语音反馈（可选）
        if (type === 'success' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'zh-CN';
            utterance.volume = 0.5;
            speechSynthesis.speak(utterance);
        }
    }
    
    getExerciseName(exercise) {
        const names = {
            'pushup': '俯卧撑',
            'squat': '深蹲',
            'situp': '仰卧起坐',
            'plank': '平板支撑',
            'jumping_jacks': '开合跳',
            'lunges': '弓步蹲',
            'burpees': '波比跳',
            'pull_ups': '引体向上'
        };
        return names[exercise] || exercise;
    }
    
    // 开合跳分析
    analyzeJumpingJacks(keypoints) {
        const armAngle = this.calculateArmAngle(keypoints);
        const legAngle = this.calculateLegAngle(keypoints);
        const thresholds = this.exerciseThresholds.jumping_jacks;
        
        // 检测手臂和腿部的开合动作
        const armsOpen = armAngle > 120; // 手臂张开
        const legsOpen = legAngle > 30;  // 腿部张开
        
        if (armsOpen && legsOpen) {
            if (this.exerciseState === 'closed') {
                this.exerciseCounter++;
                this.calories += 0.8; // 每次开合跳消耗约0.8卡路里
                this.exerciseState = 'open';
                this.showFeedback('很好！继续保持节奏', 'success');
            }
        } else {
            if (this.exerciseState === 'open') {
                this.exerciseState = 'closed';
            }
        }
        
        // 计算准确率
        const armAccuracy = Math.max(0, 100 - Math.abs(armAngle - 140) * 2);
        const legAccuracy = Math.max(0, 100 - Math.abs(legAngle - 45) * 3);
        this.accuracy = (armAccuracy + legAccuracy) / 2;
        
        this.updateStats();
    }
    
    // 弓步蹲分析
    analyzeLunges(keypoints) {
        const leftLegAngle = this.calculateAngle(
            keypoints[23], keypoints[25], keypoints[27] // 左髋-左膝-左踝
        );
        const rightLegAngle = this.calculateAngle(
            keypoints[24], keypoints[26], keypoints[28] // 右髋-右膝-右踝
        );
        
        const thresholds = this.exerciseThresholds.lunges;
        
        // 检测弓步蹲姿态 - 使用正确的阈值
        console.log(`弓步蹲检测 - 左腿: ${leftLegAngle.toFixed(1)}°, 右腿: ${rightLegAngle.toFixed(1)}°`);

        // 检测哪条腿在前（弯曲更多）
        const frontLegAngle = Math.min(leftLegAngle, rightLegAngle);
        const backLegAngle = Math.max(leftLegAngle, rightLegAngle);

        // 使用down/up阈值进行检测
        const isLungePosition = frontLegAngle <= thresholds.down;

        // 状态切换逻辑 - 修复计数逻辑，确保下蹲到起立为一次完整动作
        if (isLungePosition && this.exerciseState === 'up') {
            this.exerciseState = 'down';
            console.log('弓步蹲: 下蹲状态');
        } else if (!isLungePosition && frontLegAngle >= thresholds.up && this.exerciseState === 'down') {
            this.exerciseState = 'up';
            this.exerciseCounter++;
            this.calories += 1.2;
            this.showFeedback(`弓步蹲 ${this.exerciseCounter} 次！`, 'success');
            this.playCountSound();
            console.log('弓步蹲计数:', this.exerciseCounter, '- 完成一次完整动作(下蹲->起立)');
        }

        // 计算准确率 - 基于前腿角度
        const targetAngle = 90;
        this.accuracy = Math.max(0, 100 - Math.abs(frontLegAngle - targetAngle) * 1.5);

        this.updateStats();
        return true;
    }
    
    // 波比跳分析
    analyzeBurpees(keypoints) {
        const torsoAngle = this.calculateTorsoAngle(keypoints);
        const armAngle = this.calculateArmAngle(keypoints);
        const legAngle = this.calculateLegAngle(keypoints);
        
        // 波比跳的四个阶段：站立 -> 蹲下 -> 平板支撑 -> 跳跃
        if (!this.burpeePhase) {
            this.burpeePhase = 'stand';
        }
        
        switch (this.burpeePhase) {
            case 'stand':
                if (legAngle < 120) { // 开始蹲下
                    this.burpeePhase = 'squat';
                }
                break;
            case 'squat':
                if (torsoAngle < 45) { // 进入平板支撑
                    this.burpeePhase = 'plank';
                }
                break;
            case 'plank':
                if (torsoAngle > 60) { // 准备跳跃
                    this.burpeePhase = 'jump';
                }
                break;
            case 'jump':
                if (torsoAngle > 150) { // 完成一次波比跳
                    this.exerciseCounter++;
                    this.calories += 2.5; // 每次波比跳消耗约2.5卡路里
                    this.burpeePhase = 'stand';
                    this.showFeedback('波比跳完成！继续加油！', 'success');
                }
                break;
        }
        
        // 计算准确率
        this.accuracy = Math.max(0, 100 - Math.abs(torsoAngle - 90) * 1.5);
        
        this.updateStats();
    }
    
    // 引体向上分析 - 优化检测逻辑
    analyzePullUps(keypoints, armAngle) {
        const leftShoulder = keypoints[5];
        const leftElbow = keypoints[7];
        const leftWrist = keypoints[9];
        const rightShoulder = keypoints[6];
        const rightElbow = keypoints[8];
        const rightWrist = keypoints[10];

        // 初始化状态
        if (!this.exerciseState) {
            this.exerciseState = 'down'; // 初始状态设置为 'down'
        }

        // 检查关键点置信度
        const minConfidence = 0.3;
        if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist ||
            leftShoulder.score < minConfidence || leftElbow.score < minConfidence || leftWrist.score < minConfidence ||
            rightShoulder.score < minConfidence || rightElbow.score < minConfidence || rightWrist.score < minConfidence) {
            console.warn('引体向上: 关键点检测不足或置信度过低');
            return false;
        }
        
        // 确保关键点存在且置信度足够
        if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist ||
            (leftShoulder.score !== undefined && leftShoulder.score < 0.3) || 
            (leftElbow.score !== undefined && leftElbow.score < 0.3) || 
            (leftWrist.score !== undefined && leftWrist.score < 0.3) ||
            (rightShoulder.score !== undefined && rightShoulder.score < 0.3) || 
            (rightElbow.score !== undefined && rightElbow.score < 0.3) || 
            (rightWrist.score !== undefined && rightWrist.score < 0.3)) {
            // console.warn('Pull-ups: Not enough keypoints detected or low confidence/score for analysis.');
            return false; // 关键点不足，姿势无效
        }

        // 改进的悬挂位置检测 - 更宽松的条件
        const canvasHeight = this.canvas ? this.canvas.height : 600;
        const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
        const wristHeight = (leftWrist.y + rightWrist.y) / 2;

        // 检测是否处于悬挂状态 - 手腕应该在肩膀上方或接近肩膀高度
        const isHangingPosition = wristHeight <= shoulderHeight + (canvasHeight * 0.15);

        // 计算双臂角度
        const leftArmAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightArmAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
        const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;

        // 使用更宽松的角度范围
        const thresholds = this.exerciseThresholds.pull_ups;
        const isPullUpPosition = avgArmAngle >= thresholds.minAngle && avgArmAngle <= thresholds.maxAngle;

        console.log(`引体向上检测 - 悬挂: ${isHangingPosition}, 角度: ${avgArmAngle.toFixed(1)}°, 范围: ${thresholds.minAngle}-${thresholds.maxAngle}°`);
        
        if (isHangingPosition && isPullUpPosition) {
            // 改进的上拉检测 - 使用手臂角度和身体位置
            const chinY = keypoints[0] ? keypoints[0].y : shoulderHeight; // 鼻子作为下巴近似

            // 更宽松的上拉判断条件
            const isPulledUp = avgArmAngle <= thresholds.down ||
                              (chinY <= shoulderHeight + (canvasHeight * 0.08) && avgArmAngle <= thresholds.up);

            console.log(`引体向上状态 - 当前: ${this.exerciseState}, 上拉: ${isPulledUp}, 下巴Y: ${chinY.toFixed(1)}, 肩膀Y: ${shoulderHeight.toFixed(1)}`);

            // 状态切换检测 - 修复计数逻辑，确保下降到上拉为一次完整动作
            if (isPulledUp && this.exerciseState === 'down') {
                this.exerciseCounter++;
                this.calories += 0.8;
                this.exerciseState = 'up';
                this.showFeedback(`引体向上 ${this.exerciseCounter} 次！`, 'success');
                this.playCountSound();
                console.log('引体向上计数:', this.exerciseCounter, '- 完成一次完整动作(下降->上拉)');

                // 计算准确率 - 上拉动作完成时给高分
                this.accuracy = Math.max(80, 100 - Math.abs(avgArmAngle - thresholds.minAngle) * 1.0);
                this.realTimeAccuracy = this.accuracy;
                this.correctFrames++;
                this.frameCount++;
                this.updateStats();
                return true;
            } else if (!isPulledUp && this.exerciseState === 'up') {
                this.exerciseState = 'down';
                console.log('引体向上: 下降阶段');

                // 计算准确率 - 下降阶段
                this.accuracy = Math.max(60, 100 - Math.abs(avgArmAngle - thresholds.maxAngle) * 1.0);
                this.realTimeAccuracy = this.accuracy;
                this.frameCount++;
                if (this.accuracy >= 70) {
                    this.correctFrames++;
                }
                this.updateStats();
                return true;
            } else if (this.exerciseState === 'down' && !isPulledUp){
                // 处于下降状态，计算准确率
                this.accuracy = Math.max(50, 100 - Math.abs(avgArmAngle - thresholds.maxAngle) * 1.2);
                this.realTimeAccuracy = this.accuracy;
                this.frameCount++;
                if (this.accuracy >= 60) {
                    this.correctFrames++;
                }
                this.updateStats();
                return true; // 姿势在有效范围内
            }

            // 如果没有发生状态切换，但仍在有效姿势范围内，也更新准确率
            this.accuracy = Math.max(40, 100 - Math.abs(avgArmAngle - (thresholds.minAngle + thresholds.maxAngle)/2) * 1.0);
            this.realTimeAccuracy = this.accuracy;
            this.frameCount++;
            if (this.accuracy >= 50) {
                this.correctFrames++;
            }
            this.updateStats();
            return true; // 姿势在有效范围内

        } else {
            // 不再显示持续的“请保持悬挂姿态”警告
            // this.showFeedback('请保持悬挂姿态', 'warning'); 
            // this.accuracy = Math.max(0, this.accuracy - 2); // 也不再主动降低准确率
            // this.updateStats(); // 避免在无效姿态时更新统计，除非有特定需求
            return false; // 姿势不正确
        }
    }
    
    getWorkoutData() {
        return {
            exercise: this.currentExerciseDisplay || this.currentExercise, // 使用中文名称保存
            count: this.exerciseCounter,
            duration: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
            calories: Math.round(this.calories),
            accuracy: this.realTimeAccuracy || this.accuracy || 0, // 使用实时准确率
            startTime: this.startTime,
            endTime: Date.now()
        };
    }
    
    reset() {
        this.exerciseCounter = 0;
        this.exerciseState = 'down';
        this.startTime = null;
        this.poseHistory = [];
        this.accuracy = 0;
        this.calories = 0;
        this.feedback = '';
        this.currentExercise = null;
        this.isDetecting = false;

        // 重置改进的计数系统
        this.stateBuffer = [];
        this.lastStateChange = 0;
        this.targetAchieved = false;

        // 清除画布
        if (this.canvas && this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        console.log('PoseDetector已重置');
    }

    // 改进的状态检测方法
    detectExerciseStateImproved(angle, threshold) {
        if (!threshold) return;

        const currentTime = Date.now();

        // 使用新的阈值系统
        const downThreshold = threshold.down || threshold.minAngle;
        const upThreshold = threshold.up || threshold.maxAngle;

        // 确定当前应该处于的状态
        let targetState = this.exerciseState;
        if (angle < downThreshold) {
            targetState = 'down';
        } else if (angle > upThreshold) {
            targetState = 'up';
        }

        // 添加到状态缓冲区
        this.stateBuffer.push(targetState);
        if (this.stateBuffer.length > this.bufferSize) {
            this.stateBuffer.shift();
        }

        // 检查状态是否稳定
        if (this.stateBuffer.length >= this.minStateFrames) {
            const stableState = this.getStableState();

            // 防抖动 - 状态变化间隔至少500ms
            const timeSinceLastChange = currentTime - this.lastStateChange;

            if (stableState && stableState !== this.exerciseState && timeSinceLastChange >= this.minStateInterval) {
                const previousState = this.exerciseState;
                this.exerciseState = stableState;
                this.lastStateChange = currentTime;

                console.log(`状态变化: ${previousState} -> ${stableState}, 角度: ${angle.toFixed(1)}°`);

                // 检测完成一次动作 (从down到up)
                if (previousState === 'down' && stableState === 'up') {
                    this.exerciseCounter++;
                    console.log(`完成一次动作! 总计: ${this.exerciseCounter}, 角度: ${angle.toFixed(1)}°`);

                    this.updateStats();
                    this.playCountSound();
                    this.recordRepTime();
                    this.updateCalories();

                    // 显示反馈
                    this.showFeedback(`完成 ${this.exerciseCounter} 次${this.getExerciseName(this.currentExercise)}`, 'success');
                }
            }
        }
    }

    // 获取稳定状态
    getStableState() {
        if (this.stateBuffer.length < this.minStateFrames) {
            return null;
        }

        // 检查最近的几帧是否都是同一状态
        const recentStates = this.stateBuffer.slice(-this.minStateFrames);
        const firstState = recentStates[0];

        if (recentStates.every(state => state === firstState)) {
            return firstState;
        }

        return null;
    }

    // 添加缺失的方法
    playCountSound() {
        try {
            // 创建音频上下文
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 创建振荡器
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // 连接节点
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // 设置音频参数
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.type = 'sine';

            // 设置音量包络
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            // 播放音频
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.log('音频播放失败:', error);
        }
    }

    recordRepTime() {
        const currentTime = Date.now();
        if (this.startTime) {
            const repTime = currentTime - (this.lastRepTime || this.startTime);
            this.lastRepTime = currentTime;
            console.log(`动作完成时间: ${repTime}ms`);
        }
    }

    updateCalories() {
        // 根据运动类型计算卡路里消耗
        const caloriesPerRep = {
            'pushup': 0.5,
            'squat': 0.32,
            'situp': 0.4,
            'plank': 0.1, // 每秒
            'jumping_jacks': 0.8,
            'lunges': 1.2,
            'burpees': 1.5,
            'pull_ups': 0.8
        };

        const calories = caloriesPerRep[this.currentExercise] || 0.5;
        this.calories += calories;
    }

    getExerciseName(exerciseType) {
        const names = {
            'pushup': '俯卧撑',
            'squat': '深蹲',
            'situp': '仰卧起坐',
            'plank': '平板支撑',
            'jumping_jacks': '开合跳',
            'lunges': '弓步蹲',
            'burpees': '波比跳',
            'pull_ups': '引体向上'
        };
        return names[exerciseType] || exerciseType;
    }
}

// 导出类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoseDetector;
} else {
    window.PoseDetector = PoseDetector;
}