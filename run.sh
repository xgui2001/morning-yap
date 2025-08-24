#!/bin/bash

# Morning Brain Dump - Quick Start Script
echo "🌅 Starting Morning Brain Dump..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.8+ and try again."
    exit 1
fi

# Check if ffmpeg is installed (required for Whisper)
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg not found. Installing ffmpeg..."
    if command -v brew &> /dev/null; then
        brew install ffmpeg
    else
        echo "❌ Homebrew not found. Please install ffmpeg manually:"
        echo "   brew install ffmpeg"
        echo "   Or visit: https://ffmpeg.org/download.html"
        exit 1
    fi
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r backend/requirements.txt

# Install Whisper separately if needed
if ! python -c "import whisper" 2>/dev/null; then
    echo "🔧 Installing Whisper..."
    pip install --upgrade pip
    pip install openai-whisper
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env and add your GEMINI_API_KEY"
    echo "   You can get one from: https://makersuite.google.com/app/apikey"
    echo ""
    echo "Press Enter when you've added your API key..."
    read
fi

# Check if GEMINI_API_KEY is set
if ! grep -q "GEMINI_API_KEY=your_gemini_api_key_here" .env; then
    echo "✅ Environment configured"
else
    echo "❌ Please add your GEMINI_API_KEY to .env file"
    echo "   You can get one from: https://makersuite.google.com/app/apikey"
    exit 1
fi

# Start the server
echo "🚀 Starting server..."
echo "📱 Open your browser to: http://localhost:8000"
echo "🎤 Microphone should work with localhost!"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

cd backend
python app.py 