# 🌅 Morning Brain Dump

A voice-first web app where you can yap all your to-dos and let Gemini Live figure out the rest. It structure your day through natural conversation. Think "therapy session meets task manager" - you ramble, it organizes.

## 🎯 Core Concept

**Voice-first organization**: Instead of typing out your to-dos, just talk naturally about your day. The AI listens, understands, and transforms your rambling thoughts into structured tasks and schedules.

**AI-powered organization**: Gemini Live handles both conversation AND task extraction in one go. No separate NLP components or complex state machines - just pure AI intelligence.

## 🏗️ Architecture

### Tech Stack
- **Backend**: FastAPI (Python) - WebSocket support and simplicity
- **AI**: Gemini Live API - handles conversation + task extraction
- **Frontend**: Vanilla JavaScript - no framework overhead
- **Audio**: Web Audio API for mic capture, WebSocket for streaming
- **Deployment**: Runs locally or deploy to Render/Railway

### Philosophy
**"Let the LLM do everything"** - Instead of building separate NLP components, conversation state machines, or task extractors, we use Gemini's intelligence to handle the entire flow. One prompt, one API call, multiple outputs.

## 📁 Repository Structure

```
alarm/
├── backend/
│   ├── app.py              # Single file containing entire backend (100-150 lines)
│   ├── prompts.py          # System prompts that define Gemini's behavior
│   └── requirements.txt    # Minimal dependencies
├── frontend/
│   ├── index.html          # Single page UI
│   ├── app.js              # Client-side logic
│   └── styles.css          # Clean, modern styling
├── .env                    # Configuration (copy from env.example)
├── README.md               # This file
└── run.sh                  # Quick start script
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- ffmpeg (required for Whisper AI)
- Gemini API key

### Setup

1. **Clone and navigate to the project**
   ```bash
   cd alarm
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

5. **Run the application**
   ```bash
   # Option 1: Use the quick start script
   chmod +x run.sh
   ./run.sh
   
   # Option 2: Run manually
   cd backend
   python app.py
   ```

6. **Open your browser**
   Navigate to `http://localhost:8000`

## 🎤 How to Use

1. **Click the mic button** to start recording
2. **Talk naturally** about your day, tasks, and thoughts
3. **Watch in real-time** as your conversation appears on the left
4. **See your organized day** appear on the right with tasks and schedule
5. **Export your data** when you're done

### Example Brain Dump
> "I have so much to do today. I need to finish that quarterly report by 3pm, call the dentist to reschedule my appointment, and I'm feeling really overwhelmed about the presentation tomorrow. Oh, and I should probably go to the gym, but I'm not sure when I'll have time. I also need to pick up groceries and maybe call my mom."

**AI Response**: 
- **Conversation**: "I hear you're feeling overwhelmed with everything on your plate today. Let's break this down into manageable pieces. You've got some important work deadlines, personal appointments, and self-care to balance."
- **Tasks**: 
  - Finish quarterly report (High priority, Work, 2 hours)
  - Call dentist (Medium priority, Health, 15 min)
  - Prepare presentation (High priority, Work, 3 hours)
  - Gym workout (Medium priority, Health, 1 hour)
  - Grocery shopping (Low priority, Errands, 45 min)
  - Call mom (Medium priority, Personal, 30 min)

## 🔧 Development

### Project Structure Details

#### Backend (`backend/app.py`)
- **FastAPI setup** with WebSocket endpoint
- **Gemini Live integration** for AI processing
- **Session management** (in-memory for hackathon)
- **Static file serving** for frontend

#### Frontend (`frontend/`)
- **Single page UI** with responsive design
- **WebSocket connection** management
- **Audio recording** and streaming
- **Real-time UI updates**

### Data Flow
1. User clicks mic → Browser captures audio
2. Audio streams via WebSocket → Backend receives chunks
3. Backend sends to Gemini Live → Single API call
4. Gemini returns → Conversational response + Structured task data
5. WebSocket sends back → Both transcript and tasks
6. Frontend updates → Real-time display of both panels

## 🎨 Features

### Voice Interface
- **Real-time audio recording** with visual feedback
- **Whisper AI** for accurate speech-to-text
- **WebSocket streaming** for low-latency communication
- **Microphone access** with text input fallback

### AI Organization
- **Natural conversation** with supportive AI personality
- **Automatic task extraction** from spoken content
- **Priority categorization** (high/medium/low)
- **Time estimation** for realistic planning
- **Mood and energy tracking**

### User Experience
- **Modern, responsive design** with gradient backgrounds
- **Real-time updates** as you speak
- **Export functionality** for data portability
- **Mobile-friendly** interface

## 🔑 Configuration

### Environment Variables
- `GEMINI_API_KEY`: Your Gemini API key (required)
- `PORT`: Server port (default: 8000)
- `DEBUG`: Enable debug mode (default: false)

### API Keys
1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file
3. Restart the application

## 🚀 Deployment

### Local Development
```bash
cd backend
python app.py
```

### Production Deployment
The app is designed to be easily deployable to:
- **Render**: Add as a Python service
- **Railway**: Connect GitHub repo
- **Heroku**: Add Procfile and deploy
- **Vercel**: Configure for Python

### Environment Setup for Production
1. Set `GEMINI_API_KEY` in your deployment environment
2. Configure `PORT` if needed (most platforms auto-detect)
3. Ensure WebSocket support is enabled

## 🤝 Contributing

This is a simple project designed to be simple and functional. Feel free to:
- Add new features
- Improve the UI/UX
- Enhance the AI prompts
- Add more export formats
- Implement persistent storage

## 📝 License

MIT License - feel free to use this for your own projects!

---

**Built with ❤️ for morning productivity** 