class MorningBrainDump {
    constructor() {
        this.ws = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.sessionId = this.generateSessionId();
        
        this.initializeElements();
        this.initializeWebSocket();
        this.bindEvents();
        this.initializeTextMode(); // Start with voice input mode
    }

    initializeElements() {
        this.micButton = document.getElementById('micButton');
        this.micLabel = document.getElementById('micLabel');
        this.conversationContainer = document.getElementById('conversationContainer');
        this.tasksContainer = document.getElementById('tasksContainer');
        this.scheduleContainer = document.getElementById('scheduleContainer');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.exportBtn = document.getElementById('exportBtn');
        this.moodSection = document.getElementById('moodSection');
        this.moodValue = document.getElementById('moodValue');
        this.energyValue = document.getElementById('energyValue');
        this.textInputFallback = document.getElementById('textInputFallback');
        this.textInput = document.getElementById('textInput');
        this.sendTextBtn = document.getElementById('sendTextBtn');
        this.toggleInputBtn = document.getElementById('toggleInputBtn');
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    initializeWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.sessionId}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            this.updateStatus('Connected', 'connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            this.updateStatus('Disconnected', 'disconnected');
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus('Error', 'error');
        };
    }

    bindEvents() {
        this.micButton.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        this.exportBtn.addEventListener('click', () => {
            this.exportData();
        });

        this.sendTextBtn.addEventListener('click', () => {
            this.sendTextInput();
        });

        this.toggleInputBtn.addEventListener('click', () => {
            this.toggleInputMode();
        });

        // Allow Enter key to send text
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendTextInput();
            }
        });
    }

    async startRecording() {
        try {
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }

            // Request microphone access with more specific constraints
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                this.processAudio();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateUI('recording');
            this.updateStatus('Recording...', 'recording');
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Microphone access denied';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone permission denied. Please allow microphone access and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Microphone not supported in this browser. Please use Chrome, Firefox, or Safari.';
            } else if (error.name === 'SecurityError') {
                errorMessage = 'Microphone access blocked due to security restrictions. Please use HTTPS or localhost.';
            }
            
            this.updateStatus(errorMessage, 'error');
            this.updateUI('ready');
            
            // Show a more helpful message to the user
            this.showMicrophoneError(errorMessage);
        }
    }

    showMicrophoneError(message) {
        // Create a more visible error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'microphone-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h3>🎤 Microphone Access Issue</h3>
                <p>${message}</p>
                <div class="error-solutions">
                    <h4>Solutions:</h4>
                    <ul>
                        <li>Click the microphone icon in your browser's address bar and allow access</li>
                        <li>Refresh the page and try again</li>
                        <li>Make sure you're using HTTPS or localhost</li>
                        <li>Check your browser's microphone permissions</li>
                    </ul>
                </div>
                <button onclick="this.parentElement.parentElement.remove()">Got it</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.updateUI('processing');
            this.updateStatus('Processing...', 'processing');
        }
    }

    async processAudio() {
        try {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            const base64Audio = await this.blobToBase64(audioBlob);
            
            // Send audio to backend
            this.ws.send(JSON.stringify({
                type: 'audio',
                audio: base64Audio
            }));
            
        } catch (error) {
            console.error('Error processing audio:', error);
            this.updateStatus('Error processing audio', 'error');
            this.updateUI('ready');
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'response':
                if (data.user_input) {
                    // Audio response - use special handler
                    this.handleAudioResponse(data);
                } else {
                    // Text response - use regular handler
                    this.handleResponse(data);
                }
                break;
            case 'export':
                this.handleExport(data.data);
                break;
            case 'error':
                this.handleError(data.message);
                break;
        }
    }

    handleResponse(data) {
        // Add conversation message
        this.addConversationMessage('assistant', data.conversation);
        
        // Update tasks
        this.updateTasks(data.tasks);
        
        // Update schedule
        this.updateSchedule(data.schedule);
        
        // Update mood and energy
        this.updateMoodAndEnergy(data.mood, data.energy_level);
        
        this.updateUI('ready');
        this.updateStatus('Ready', 'connected');
    }

    handleAudioResponse(data) {
        // Add user message first (from the audio input)
        if (data.user_input) {
            this.addConversationMessage('user', data.user_input);
        }
        
        // Then add assistant response
        this.addConversationMessage('assistant', data.conversation);
        
        // Update tasks
        this.updateTasks(data.tasks);
        
        // Update schedule
        this.updateSchedule(data.schedule);
        
        // Update mood and energy
        this.updateMoodAndEnergy(data.mood, data.energy_level);
        
        this.updateUI('ready');
        this.updateStatus('Ready', 'connected');
    }

    addConversationMessage(sender, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const icon = sender === 'user' ? '👤' : '🤖';
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-icon">${icon}</span>
                <span class="message-sender">${sender === 'user' ? 'You' : 'Assistant'}</span>
            </div>
            <div class="message-content">${message}</div>
        `;
        
        this.conversationContainer.appendChild(messageDiv);
        this.conversationContainer.scrollTop = this.conversationContainer.scrollHeight;
        
        // Remove welcome message if it exists
        const welcomeMessage = this.conversationContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    }

    updateTasks(tasks) {
        if (!tasks || tasks.length === 0) {
            this.tasksContainer.innerHTML = '<p class="empty-state">No tasks yet. Start talking to see your organized day!</p>';
            return;
        }

        const tasksHTML = tasks.map(task => `
            <div class="task-item priority-${task.priority}">
                <div class="task-header">
                    <span class="task-title">${task.title}</span>
                    <span class="task-priority ${task.priority}">${task.priority}</span>
                </div>
                <div class="task-details">
                    <span class="task-category">${task.category}</span>
                    <span class="task-time">${task.estimated_time}</span>
                </div>
            </div>
        `).join('');

        this.tasksContainer.innerHTML = tasksHTML;
    }

    updateSchedule(schedule) {
        if (!schedule || schedule.length === 0) {
            this.scheduleContainer.innerHTML = '<p class="empty-state">Your schedule will appear here as you talk.</p>';
            return;
        }

        const scheduleHTML = schedule.map(item => `
            <div class="schedule-item">
                <div class="schedule-time">${item.time}</div>
                <div class="schedule-activity">${item.activity}</div>
            </div>
        `).join('');

        this.scheduleContainer.innerHTML = scheduleHTML;
    }

    updateMoodAndEnergy(mood, energy) {
        if (mood && energy) {
            this.moodSection.style.display = 'flex';
            this.moodValue.textContent = mood;
            this.energyValue.textContent = energy;
            
            // Add CSS classes for styling
            this.moodValue.className = `mood-value mood-${mood}`;
            this.energyValue.className = `energy-value energy-${energy}`;
        }
    }

    updateUI(state) {
        this.micButton.className = `mic-button ${state}`;
        
        switch (state) {
            case 'recording':
                this.micLabel.textContent = 'Recording... Click to stop';
                break;
            case 'processing':
                this.micLabel.textContent = 'Processing your thoughts...';
                break;
            case 'ready':
                this.micLabel.textContent = 'Click to start your morning brain dump';
                break;
        }
    }

    updateStatus(text, status) {
        const statusText = this.statusIndicator.querySelector('.status-text');
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        
        statusText.textContent = text;
        statusDot.className = `status-dot ${status}`;
    }

    exportData() {
        this.ws.send(JSON.stringify({
            type: 'export'
        }));
    }

    handleExport(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `morning-brain-dump-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    sendTextInput() {
        const text = this.textInput.value.trim();
        if (!text) return;

        // Add user message to conversation
        this.addConversationMessage('user', text);
        
        // Clear input
        this.textInput.value = '';
        
        // Send to backend
        this.ws.send(JSON.stringify({
            type: 'text',
            text: text
        }));
        
        this.updateStatus('Processing...', 'processing');
    }

    toggleInputMode() {
        const isTextMode = this.textInputFallback.style.display !== 'none';
        
        if (isTextMode) {
            // Switch to voice mode
            this.textInputFallback.style.display = 'none';
            this.micButton.style.display = 'block';
            this.micLabel.style.display = 'block';
            this.toggleInputBtn.textContent = '📝 Use Text Input (Recommended)';
        } else {
            // Switch to text mode
            this.textInputFallback.style.display = 'block';
            this.micButton.style.display = 'none';
            this.micLabel.style.display = 'none';
            this.toggleInputBtn.textContent = '🎤 Switch to Voice Input';
        }
    }

    // Initialize with voice input mode (default)
    initializeTextMode() {
        this.textInputFallback.style.display = 'none';
        this.micButton.style.display = 'block';
        this.micLabel.style.display = 'block';
        this.toggleInputBtn.textContent = '📝 Switch to Text Input';
    }

    handleError(message) {
        console.error('Server error:', message);
        this.updateStatus('Error: ' + message, 'error');
        this.updateUI('ready');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MorningBrainDump();
}); 