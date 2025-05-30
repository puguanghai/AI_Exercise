// 仪表板页面功能模块
class Dashboard {
    constructor() {
        this.workoutData = [];
        this.chartInstances = {};
        this.init();
    }
    
    init() {
        // 加载用户数据
        this.loadUserData();
        
        // 绑定事件监听器
        this.bindEvents();
        
        // 初始化图表
        this.initCharts();
        
        // 定期更新数据
        this.startDataRefresh();
    }
    
    bindEvents() {
        // 时间范围选择
        const timeRangeSelect = document.getElementById('timeRange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', () => {
                this.updateCharts();
            });
        }
        
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadUserData(true);
            });
        }
        
        // 导出数据按钮
        const exportBtn = document.getElementById('exportData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportWorkoutData();
            });
        }
        
        // 目标设置按钮
        const goalBtn = document.getElementById('setGoals');
        if (goalBtn) {
            goalBtn.addEventListener('click', () => {
                this.showGoalModal();
            });
        }
        
        // 训练记录详情
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('workout-detail-btn')) {
                const workoutId = e.target.dataset.workoutId;
                this.showWorkoutDetail(workoutId);
            }
        });
    }
    
    async loadUserData(showLoading = false) {
        if (showLoading) {
            this.showLoading();
        }
        
        try {
            const response = await fetch('/api/user_data');
            const data = await response.json();
            
            if (data.success) {
                this.workoutData = data.workouts || [];
                this.updateStatistics(data.statistics);
                this.updateRecentWorkouts(data.recent_workouts);
                this.updateGoals(data.goals);
                this.updateAchievements(data.achievements);
                this.updateCharts();
            } else {
                this.showMessage('加载数据失败', 'error');
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
            this.showMessage('网络错误，请稍后重试', 'error');
        } finally {
            if (showLoading) {
                this.hideLoading();
            }
        }
    }
    
    updateStatistics(stats) {
        if (!stats) return;
        
        // 更新统计卡片
        const elements = {
            'totalCalories': stats.total_calories || 0,
            'totalTime': this.formatDuration(stats.total_time || 0),
            'totalWorkouts': stats.total_workouts || 0,
            'avgAccuracy': `${stats.avg_accuracy || 0}%`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                // 添加数字动画效果
                this.animateNumber(element, value);
            }
        });
        
        // 更新进度条
        this.updateProgressBars(stats);
    }
    
    updateProgressBars(stats) {
        // 周目标进度
        const weeklyProgress = document.getElementById('weeklyProgress');
        if (weeklyProgress && stats.weekly_goal) {
            const percentage = Math.min((stats.weekly_workouts / stats.weekly_goal) * 100, 100);
            weeklyProgress.style.width = `${percentage}%`;
            weeklyProgress.setAttribute('aria-valuenow', percentage);
            
            const progressText = document.getElementById('weeklyProgressText');
            if (progressText) {
                progressText.textContent = `${stats.weekly_workouts}/${stats.weekly_goal} 次训练`;
            }
        }
        
        // 月目标进度
        const monthlyProgress = document.getElementById('monthlyProgress');
        if (monthlyProgress && stats.monthly_goal) {
            const percentage = Math.min((stats.monthly_workouts / stats.monthly_goal) * 100, 100);
            monthlyProgress.style.width = `${percentage}%`;
            monthlyProgress.setAttribute('aria-valuenow', percentage);
            
            const progressText = document.getElementById('monthlyProgressText');
            if (progressText) {
                progressText.textContent = `${stats.monthly_workouts}/${stats.monthly_goal} 次训练`;
            }
        }
    }
    
    updateRecentWorkouts(workouts) {
        const container = document.getElementById('recentWorkoutsList');
        if (!container || !workouts) return;
        
        if (workouts.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">暂无训练记录</p>';
            return;
        }
        
        const workoutHtml = workouts.map(workout => `
            <div class="workout-item card mb-2">
                <div class="card-body p-3">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <div class="exercise-icon">
                                <i class="fas ${this.getExerciseIcon(workout.exercise)}"></i>
                                <span class="exercise-name">${this.getExerciseName(workout.exercise)}</span>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">次数</small>
                            <div class="fw-bold">${workout.count}</div>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">时长</small>
                            <div class="fw-bold">${this.formatDuration(workout.duration)}</div>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">卡路里</small>
                            <div class="fw-bold">${workout.calories}</div>
                        </div>
                        <div class="col-md-2">
                            <small class="text-muted">准确率</small>
                            <div class="fw-bold">${workout.accuracy}%</div>
                        </div>
                        <div class="col-md-1">
                            <button class="btn btn-sm btn-outline-primary workout-detail-btn" 
                                    data-workout-id="${workout.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-12">
                            <small class="text-muted">
                                <i class="fas fa-clock"></i> ${this.formatDate(workout.created_at)}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = workoutHtml;
    }
    
    updateGoals(goals) {
        const container = document.getElementById('personalGoals');
        if (!container || !goals) return;
        
        if (goals.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">暂无个人目标</p>';
            return;
        }
        
        const goalsHtml = goals.map(goal => {
            const progress = Math.min((goal.current / goal.target) * 100, 100);
            const statusClass = progress >= 100 ? 'bg-success' : progress >= 70 ? 'bg-warning' : 'bg-primary';
            
            return `
                <div class="goal-item mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="goal-title">${goal.title}</span>
                        <span class="goal-progress">${goal.current}/${goal.target}</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar ${statusClass}" 
                             style="width: ${progress}%" 
                             aria-valuenow="${progress}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted">${goal.description}</small>
                </div>
            `;
        }).join('');
        
        container.innerHTML = goalsHtml;
    }
    
    updateAchievements(achievements) {
        const container = document.getElementById('achievementBadges');
        if (!container || !achievements) return;
        
        if (achievements.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">暂无成就徽章</p>';
            return;
        }
        
        const badgesHtml = achievements.map(achievement => `
            <div class="achievement-badge ${achievement.unlocked ? 'unlocked' : 'locked'}" 
                 title="${achievement.description}">
                <div class="badge-icon">
                    <i class="fas ${achievement.icon}"></i>
                </div>
                <div class="badge-title">${achievement.title}</div>
                ${achievement.unlocked ? 
                    `<div class="badge-date">${this.formatDate(achievement.unlocked_at)}</div>` : 
                    '<div class="badge-progress">未解锁</div>'
                }
            </div>
        `).join('');
        
        container.innerHTML = badgesHtml;
    }
    
    initCharts() {
        // 初始化训练趋势图表
        this.initTrendChart();
        
        // 初始化运动类型分布图表
        this.initDistributionChart();
    }
    
    initTrendChart() {
        const chartElement = document.getElementById('workoutTrendChart');
        if (!chartElement) return;
        
        // 使用 Plotly.js 创建图表
        const layout = {
            title: '训练趋势',
            xaxis: { title: '日期' },
            yaxis: { title: '训练次数' },
            margin: { t: 50, r: 50, b: 50, l: 50 },
            responsive: true
        };
        
        const config = {
            displayModeBar: false,
            responsive: true
        };
        
        // 初始化空图表
        Plotly.newPlot(chartElement, [], layout, config);
        this.chartInstances.trend = chartElement;
    }
    
    initDistributionChart() {
        const chartElement = document.getElementById('exerciseDistributionChart');
        if (!chartElement) return;
        
        const layout = {
            title: '运动类型分布',
            margin: { t: 50, r: 50, b: 50, l: 50 },
            responsive: true
        };
        
        const config = {
            displayModeBar: false,
            responsive: true
        };
        
        // 初始化空图表
        Plotly.newPlot(chartElement, [], layout, config);
        this.chartInstances.distribution = chartElement;
    }
    
    updateCharts() {
        this.updateTrendChart();
        this.updateDistributionChart();
    }
    
    updateTrendChart() {
        if (!this.chartInstances.trend || !this.workoutData.length) return;
        
        const timeRange = this.getSelectedTimeRange();
        const filteredData = this.filterDataByTimeRange(this.workoutData, timeRange);
        
        // 按日期分组统计
        const dailyStats = this.groupByDate(filteredData);
        
        const trace = {
            x: Object.keys(dailyStats),
            y: Object.values(dailyStats).map(day => day.count),
            type: 'scatter',
            mode: 'lines+markers',
            name: '训练次数',
            line: { color: '#007bff', width: 3 },
            marker: { size: 8 }
        };
        
        Plotly.redraw(this.chartInstances.trend, [trace]);
    }
    
    updateDistributionChart() {
        if (!this.chartInstances.distribution || !this.workoutData.length) return;
        
        const timeRange = this.getSelectedTimeRange();
        const filteredData = this.filterDataByTimeRange(this.workoutData, timeRange);
        
        // 统计运动类型分布
        const exerciseStats = {};
        filteredData.forEach(workout => {
            const exercise = workout.exercise;
            exerciseStats[exercise] = (exerciseStats[exercise] || 0) + 1;
        });
        
        const trace = {
            labels: Object.keys(exerciseStats).map(ex => this.getExerciseName(ex)),
            values: Object.values(exerciseStats),
            type: 'pie',
            hole: 0.4,
            marker: {
                colors: ['#007bff', '#28a745', '#ffc107', '#dc3545']
            }
        };
        
        Plotly.redraw(this.chartInstances.distribution, [trace]);
    }
    
    getSelectedTimeRange() {
        const select = document.getElementById('timeRange');
        return select ? select.value : '7d';
    }
    
    filterDataByTimeRange(data, range) {
        const now = new Date();
        let startDate;
        
        switch (range) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                return data;
        }
        
        return data.filter(workout => {
            const workoutDate = new Date(workout.created_at);
            return workoutDate >= startDate;
        });
    }
    
    groupByDate(data) {
        const grouped = {};
        
        data.forEach(workout => {
            const date = new Date(workout.created_at).toISOString().split('T')[0];
            if (!grouped[date]) {
                grouped[date] = { count: 0, calories: 0, duration: 0 };
            }
            grouped[date].count++;
            grouped[date].calories += workout.calories || 0;
            grouped[date].duration += workout.duration || 0;
        });
        
        return grouped;
    }
    
    showWorkoutDetail(workoutId) {
        const workout = this.workoutData.find(w => w.id == workoutId);
        if (!workout) return;
        
        // 创建详情模态框
        const modalHtml = `
            <div class="modal fade" id="workoutDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">训练详情</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>基本信息</h6>
                                    <p><strong>运动类型:</strong> ${this.getExerciseName(workout.exercise)}</p>
                                    <p><strong>训练时间:</strong> ${this.formatDate(workout.created_at)}</p>
                                    <p><strong>训练时长:</strong> ${this.formatDuration(workout.duration)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>训练数据</h6>
                                    <p><strong>完成次数:</strong> ${workout.count}</p>
                                    <p><strong>消耗卡路里:</strong> ${workout.calories}</p>
                                    <p><strong>动作准确率:</strong> ${workout.accuracy}%</p>
                                </div>
                            </div>
                            ${workout.notes ? `
                                <div class="mt-3">
                                    <h6>训练备注</h6>
                                    <p>${workout.notes}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 移除已存在的模态框
        const existingModal = document.getElementById('workoutDetailModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 添加新模态框
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('workoutDetailModal'));
        modal.show();
    }
    
    exportWorkoutData() {
        if (!this.workoutData.length) {
            this.showMessage('没有数据可导出', 'warning');
            return;
        }
        
        // 准备CSV数据
        const headers = ['日期', '运动类型', '次数', '时长(秒)', '卡路里', '准确率(%)'];
        const csvData = [headers];
        
        this.workoutData.forEach(workout => {
            csvData.push([
                this.formatDate(workout.created_at),
                this.getExerciseName(workout.exercise),
                workout.count,
                workout.duration,
                workout.calories,
                workout.accuracy
            ]);
        });
        
        // 创建CSV内容
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        
        // 下载文件
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `workout_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('数据导出成功', 'success');
    }
    
    startDataRefresh() {
        // 每5分钟自动刷新数据
        setInterval(() => {
            this.loadUserData();
        }, 5 * 60 * 1000);
    }
    
    animateNumber(element, targetValue) {
        const isNumeric = !isNaN(parseFloat(targetValue));
        if (!isNumeric) {
            element.textContent = targetValue;
            return;
        }
        
        const startValue = parseFloat(element.textContent) || 0;
        const endValue = parseFloat(targetValue);
        const duration = 1000; // 1秒动画
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = startValue + (endValue - startValue) * progress;
            element.textContent = Math.round(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
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
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
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
    
    getExerciseIcon(exercise) {
        const icons = {
            'pushup': 'fa-dumbbell',
            'squat': 'fa-running',
            'situp': 'fa-bed',
            'plank': 'fa-stopwatch'
        };
        return icons[exercise] || 'fa-dumbbell';
    }
    
    showLoading() {
        const loadingHtml = `
            <div id="loadingOverlay" class="loading-overlay">
                <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-2">加载数据中...</p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    showMessage(message, type = 'info') {
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
    if (document.getElementById('dashboardPage')) {
        window.dashboard = new Dashboard();
    }
});