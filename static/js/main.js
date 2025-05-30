// 主要功能模块
class MainApp {
    constructor() {
        this.aiChatWidget = null;
        this.init();
    }
    
    init() {
        // 初始化通用功能
        this.initCommonFeatures();
        
        // 初始化AI聊天组件
        this.initAIChatWidget();
        
        // 绑定全局事件
        this.bindGlobalEvents();
        
        // 初始化工具提示
        this.initTooltips();
        
        // 初始化页面动画
        this.initAnimations();
    }
    
    initCommonFeatures() {
        // 导航栏活跃状态
        this.updateActiveNavigation();
        
        // 表单验证
        this.initFormValidation();
        
        // 图片懒加载
        this.initLazyLoading();
        
        // 返回顶部按钮
        this.initBackToTop();
    }
    
    updateActiveNavigation() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath || (currentPath === '/' && href === '/')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
    
    initFormValidation() {
        // Bootstrap表单验证
        const forms = document.querySelectorAll('.needs-validation');
        
        forms.forEach(form => {
            form.addEventListener('submit', (event) => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
        
        // 自定义验证规则
        this.addCustomValidation();
    }
    
    addCustomValidation() {
        // 密码强度验证
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            if (input.id === 'password' || input.id === 'newPassword') {
                input.addEventListener('input', () => {
                    this.validatePasswordStrength(input);
                });
            }
        });
        
        // 确认密码验证
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
        
        // 邮箱格式验证
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateEmail(input);
            });
        });
    }
    
    validatePasswordStrength(input) {
        const password = input.value;
        const strengthIndicator = document.getElementById('passwordStrength');
        
        if (!strengthIndicator) return;
        
        let strength = 0;
        let feedback = [];
        
        // 长度检查
        if (password.length >= 8) {
            strength += 1;
        } else {
            feedback.push('至少8个字符');
        }
        
        // 包含数字
        if (/\d/.test(password)) {
            strength += 1;
        } else {
            feedback.push('包含数字');
        }
        
        // 包含小写字母
        if (/[a-z]/.test(password)) {
            strength += 1;
        } else {
            feedback.push('包含小写字母');
        }
        
        // 包含大写字母
        if (/[A-Z]/.test(password)) {
            strength += 1;
        } else {
            feedback.push('包含大写字母');
        }
        
        // 包含特殊字符
        if (/[^\w\s]/.test(password)) {
            strength += 1;
        } else {
            feedback.push('包含特殊字符');
        }
        
        // 更新强度显示
        const strengthLevels = ['很弱', '弱', '一般', '强', '很强'];
        const strengthColors = ['danger', 'warning', 'info', 'success', 'success'];
        
        const level = Math.min(strength, 4);
        strengthIndicator.className = `password-strength text-${strengthColors[level]}`;
        strengthIndicator.textContent = `密码强度: ${strengthLevels[level]}`;
        
        if (feedback.length > 0) {
            strengthIndicator.textContent += ` (需要: ${feedback.join(', ')})`;
        }
    }
    
    validatePasswordMatch() {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        const feedback = document.getElementById('confirmPasswordFeedback');
        
        if (!password || !confirmPassword || !feedback) return;
        
        if (password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity('密码不匹配');
            feedback.textContent = '密码不匹配';
            feedback.style.display = 'block';
        } else {
            confirmPassword.setCustomValidity('');
            feedback.style.display = 'none';
        }
    }
    
    validateEmail(input) {
        const email = input.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            input.setCustomValidity('请输入有效的邮箱地址');
        } else {
            input.setCustomValidity('');
        }
    }
    
    initLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => imageObserver.observe(img));
        } else {
            // 降级处理
            images.forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }
    
    initBackToTop() {
        const backToTopBtn = document.createElement('button');
        backToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        backToTopBtn.className = 'btn btn-primary back-to-top';
        backToTopBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 1000;
            display: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(backToTopBtn);
        
        // 滚动显示/隐藏
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        });
        
        // 点击返回顶部
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    initTooltips() {
        // 初始化Bootstrap工具提示
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }
    
    initAnimations() {
        // 使用AOS库进行滚动动画
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 1000,
                once: true,
            });
        }
    }

    // 显示消息的函数
    showMessage(message, type = 'info', duration = 3000) {
        const messageContainer = document.getElementById('messageContainer') || this.createMessageContainer();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type} alert-dismissible fade show`;
        messageDiv.role = 'alert';
        messageDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        messageContainer.appendChild(messageDiv);
        
        // 自动隐藏消息
        if (duration) {
            setTimeout(() => {
                // 确保 Bootstrap Alert 实例存在
                if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                    const bsAlert = bootstrap.Alert.getInstance(messageDiv) || new bootstrap.Alert(messageDiv);
                    if (bsAlert) {
                        bsAlert.close();
                    }
                } else {
                    // Fallback if Bootstrap Alert is not available
                    messageDiv.remove();
                }
            }, duration);
        }
    }

    createMessageContainer() {
        const container = document.createElement('div');
        container.id = 'messageContainer';
        container.style.position = 'fixed';
        container.style.top = '80px'; // 调整导航栏高度
        container.style.right = '20px';
        container.style.zIndex = '1050'; // 确保在其他元素之上
        container.style.minWidth = '300px';
        document.body.appendChild(container);
        return container;
    }

    // AI聊天组件
    initAIChatWidget() {
        this.aiChatWidget = new AIChatWidget();
    }

    toggleAIChat() {
        if (this.aiChatWidget) {
            this.aiChatWidget.toggle();
        }
    }

    // 全局事件绑定
    bindGlobalEvents() {
        // 全局键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Ctrl+/ 打开AI助手
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                this.toggleAIChat();
            }
            
            // ESC 关闭模态框
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.modal.show');
                openModals.forEach(modal => {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                });
            }
        });
        
        // 网络状态监听
        window.addEventListener('online', () => {
            this.showMessage('网络连接已恢复', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showMessage('网络连接已断开', 'warning');
        });
    }

    showMessage(message, type = 'info', duration = 5000) {
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="fas ${this.getAlertIcon(type)}"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        let messageContainer = document.getElementById('globalMessageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'globalMessageContainer';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(messageContainer);
        }
        
        messageContainer.insertAdjacentHTML('beforeend', alertHtml);
        
        // 自动移除
        setTimeout(() => {
            const alert = messageContainer.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, duration);
    }
    
    getAlertIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }
}

// AI聊天组件
class AIChatWidget {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isLoading = false;
        this.init();
    }
    
    init() {
        this.createWidget();
        this.bindEvents();
    }
    
    createWidget() {
        const widgetHtml = `
            <div id="aiChatWidget" class="ai-chat-widget">
                <div class="chat-header">
                    <div class="chat-title">
                        <i class="fas fa-robot"></i>
                        AI健身助手
                    </div>
                    <div class="chat-controls">
                        <button class="btn btn-sm btn-outline-light" id="clearChat">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-light" id="minimizeChat">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>
                <div class="chat-body" id="chatMessages">
                    <div class="welcome-message">
                        <div class="message ai-message">
                            <div class="message-content">
                                <p>👋 你好！我是你的AI健身助手。</p>
                                <p>我可以帮助你：</p>
                                <ul>
                                    <li>制定个性化训练计划</li>
                                    <li>解答健身相关问题</li>
                                    <li>提供动作指导建议</li>
                                    <li>分析训练数据</li>
                                </ul>
                                <p>有什么问题尽管问我吧！</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="chat-input">
                    <div class="input-group">
                        <input type="text" class="form-control" id="chatInput" 
                               placeholder="输入你的问题..." maxlength="500">
                        <button class="btn btn-primary" id="sendMessage">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                    <div class="input-footer">
                        <small class="text-muted">按 Ctrl+Enter 发送消息</small>
                    </div>
                </div>
            </div>
            <button id="aiChatToggle" class="ai-chat-toggle">
                <i class="fas fa-robot"></i>
            </button>
        `;
        
        document.body.insertAdjacentHTML('beforeend', widgetHtml);
    }
    
    bindEvents() {
        // 切换聊天窗口
        document.getElementById('aiChatToggle').addEventListener('click', () => {
            this.toggle();
        });
        
        // 最小化聊天窗口
        document.getElementById('minimizeChat').addEventListener('click', () => {
            this.close();
        });
        
        // 清空聊天记录
        document.getElementById('clearChat').addEventListener('click', () => {
            this.clearMessages();
        });
        
        // 发送消息
        document.getElementById('sendMessage').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // 输入框事件
        const chatInput = document.getElementById('chatInput');
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 输入字符计数
        chatInput.addEventListener('input', () => {
            const remaining = 500 - chatInput.value.length;
            const footer = document.querySelector('.input-footer small');
            if (remaining < 50) {
                footer.textContent = `还可输入 ${remaining} 个字符`;
                footer.className = remaining < 10 ? 'text-danger' : 'text-warning';
            } else {
                footer.textContent = '按 Ctrl+Enter 发送消息';
                footer.className = 'text-muted';
            }
        });
    }
    
    toggle() {
        const widget = document.getElementById('aiChatWidget');
        const toggle = document.getElementById('aiChatToggle');
        
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        const widget = document.getElementById('aiChatWidget');
        const toggle = document.getElementById('aiChatToggle');
        
        widget.classList.add('open');
        toggle.style.display = 'none';
        this.isOpen = true;
        
        // 聚焦输入框
        setTimeout(() => {
            document.getElementById('chatInput').focus();
        }, 300);
    }
    
    close() {
        const widget = document.getElementById('aiChatWidget');
        const toggle = document.getElementById('aiChatToggle');
        
        widget.classList.remove('open');
        toggle.style.display = 'flex';
        this.isOpen = false;
    }
    
    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message || this.isLoading) return;
        
        // 添加用户消息
        this.addMessage(message, 'user');
        input.value = '';
        
        // 显示加载状态
        this.showLoading();
        
        try {
            // 发送到后端
            const response = await fetch('/ai_chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addMessage(data.response, 'ai');
            } else {
                this.addMessage('抱歉，我现在无法回答你的问题。请稍后再试。', 'ai', true);
            }
        } catch (error) {
            console.error('AI聊天错误:', error);
            this.addMessage('网络连接出现问题，请检查网络后重试。', 'ai', true);
        } finally {
            this.hideLoading();
        }
    }
    
    addMessage(content, sender, isError = false) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageClass = sender === 'user' ? 'user-message' : 'ai-message';
        const errorClass = isError ? ' error-message' : '';
        
        const messageHtml = `
            <div class="message ${messageClass}${errorClass}">
                <div class="message-content">
                    ${this.formatMessage(content)}
                </div>
                <div class="message-time">
                    ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', messageHtml);
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 保存消息
        this.messages.push({ content, sender, timestamp: new Date() });
    }
    
    formatMessage(content) {
        // 简单的Markdown支持
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }
    
    showLoading() {
        this.isLoading = true;
        const loadingHtml = `
            <div class="message ai-message loading-message">
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.insertAdjacentHTML('beforeend', loadingHtml);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    hideLoading() {
        this.isLoading = false;
        const loadingMessage = document.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
    
    clearMessages() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="message ai-message">
                    <div class="message-content">
                        <p>聊天记录已清空。有什么新问题吗？</p>
                    </div>
                </div>
            </div>
        `;
        this.messages = [];
    }
}

// 工具函数
const Utils = {
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // 生成随机ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    // 复制到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // 降级处理
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.mainApp = new MainApp();
    
    // 全局错误处理
    window.addEventListener('error', (e) => {
        console.error('全局错误:', e.error);
    });
    
    // 未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (e) => {
        console.error('未处理的Promise拒绝:', e.reason);
    });
});