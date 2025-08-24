from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import json
import asyncio
import google.generativeai as genai
import whisper
import os
from dotenv import load_dotenv
from typing import Dict, List
import base64
import io
import wave
import tempfile

# Load environment variables
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

app = FastAPI(title="Morning Brain Dump", version="1.0.0")

# Mount static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# In-memory session storage (for hackathon)
sessions: Dict[str, Dict] = {}

# System prompt for Gemini
SYSTEM_PROMPT = """
You are a supportive, calm AI assistant helping users structure their chaotic morning thoughts into actionable tasks and a clear schedule.

Your role:
1. Listen empathetically to their morning brain dump
2. Extract specific tasks, appointments, and priorities
3. Help organize their day in a structured way
4. Provide gentle guidance and encouragement

Response format:
- Be conversational and supportive in your main response
- Always include a JSON structure in a code block at the end with extracted tasks:

```json
{
  "tasks": [
    {
      "title": "Task description",
      "priority": "high|medium|low",
      "category": "work|personal|health|errands",
      "estimated_time": "30min|1hour|etc"
    }
  ],
  "schedule": [
    {
      "time": "9:00 AM",
      "activity": "Activity description"
    }
  ],
  "mood": "positive|neutral|stressed|excited",
  "energy_level": "high|medium|low"
}
```

Keep responses concise but warm. Focus on being helpful and organized.
"""

@app.get("/")
async def read_root():
    return FileResponse("../frontend/index.html")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    # Initialize session
    if session_id not in sessions:
        sessions[session_id] = {
            "conversation": [],
            "tasks": [],
            "schedule": []
        }
    
    try:
        while True:
            # Receive audio data
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "audio":
                # Decode base64 audio
                audio_data = base64.b64decode(message["audio"])
                
                try:
                    # Real speech-to-text transcription
                    user_input = await transcribe_audio(audio_data)
                    
                    # Get response from Gemini
                    response = await get_gemini_response(user_input, sessions[session_id]["conversation"])
                    
                    # Parse response for tasks and conversation
                    conversation_part, tasks_data = parse_gemini_response(response)
                    
                    # Update session
                    sessions[session_id]["conversation"].append({
                        "user": user_input,
                        "assistant": conversation_part
                    })
                    
                    if tasks_data:
                        sessions[session_id]["tasks"] = tasks_data.get("tasks", [])
                        sessions[session_id]["schedule"] = tasks_data.get("schedule", [])
                    
                    # Send response back with user input included
                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "user_input": user_input,
                        "conversation": conversation_part,
                        "tasks": sessions[session_id]["tasks"],
                        "schedule": sessions[session_id]["schedule"],
                        "mood": tasks_data.get("mood", "neutral"),
                        "energy_level": tasks_data.get("energy_level", "medium")
                    }))
                    
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": str(e)
                    }))
            
            elif message["type"] == "text":
                # Handle text input as fallback
                try:
                    user_input = message["text"]
                    
                    # Get response from Gemini
                    response = await get_gemini_response(user_input, sessions[session_id]["conversation"])
                    
                    # Parse response for tasks and conversation
                    conversation_part, tasks_data = parse_gemini_response(response)
                    
                    # Update session
                    sessions[session_id]["conversation"].append({
                        "user": user_input,
                        "assistant": conversation_part
                    })
                    
                    if tasks_data:
                        sessions[session_id]["tasks"] = tasks_data.get("tasks", [])
                        sessions[session_id]["schedule"] = tasks_data.get("schedule", [])
                    
                    # Send response back
                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "conversation": conversation_part,
                        "tasks": sessions[session_id]["tasks"],
                        "schedule": sessions[session_id]["schedule"],
                        "mood": tasks_data.get("mood", "neutral"),
                        "energy_level": tasks_data.get("energy_level", "medium")
                    }))
                    
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": str(e)
                    }))
                    
                    # Get response from Gemini
                    response = await get_gemini_response(user_input, sessions[session_id]["conversation"])
                    
                    # Parse response for tasks and conversation
                    conversation_part, tasks_data = parse_gemini_response(response)
                    
                    # Update session
                    sessions[session_id]["conversation"].append({
                        "user": user_input,
                        "assistant": conversation_part
                    })
                    
                    if tasks_data:
                        sessions[session_id]["tasks"] = tasks_data.get("tasks", [])
                        sessions[session_id]["schedule"] = tasks_data.get("schedule", [])
                    
                    # Send response back
                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "conversation": conversation_part,
                        "tasks": sessions[session_id]["tasks"],
                        "schedule": sessions[session_id]["schedule"],
                        "mood": tasks_data.get("mood", "neutral"),
                        "energy_level": tasks_data.get("energy_level", "medium")
                    }))
                    
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": str(e)
                    }))
            
            elif message["type"] == "export":
                # Export session data
                session_data = sessions.get(session_id, {})
                await websocket.send_text(json.dumps({
                    "type": "export",
                    "data": session_data
                }))
                
    except WebSocketDisconnect:
        print(f"Client {session_id} disconnected")

async def get_gemini_response(user_input: str, conversation_history: List[Dict]) -> str:
    """Get response from Gemini with conversation context"""
    
    # Build conversation context
    context = SYSTEM_PROMPT + "\n\n"
    
    for msg in conversation_history[-5:]:  # Last 5 messages for context
        context += f"User: {msg['user']}\nAssistant: {msg['assistant']}\n\n"
    
    context += f"User: {user_input}\nAssistant:"
    
    # Get response from Gemini
    response = model.generate_content(context)
    return response.text

async def transcribe_audio(audio_data: bytes) -> str:
    """Transcribe audio using Whisper"""
    try:
        # Load Whisper model (base model for speed)
        model = whisper.load_model("base")
        
        # Save audio data to temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Load and transcribe audio
            audio = whisper.load_audio(temp_file_path)
            audio = whisper.pad_or_trim(audio)
            
            # Make log-Mel spectrogram
            mel = whisper.log_mel_spectrogram(audio).to(model.device)
            
            # Detect language
            _, probs = model.detect_language(mel)
            detected_lang = max(probs, key=probs.get)
            
            # Decode the audio
            options = whisper.DecodingOptions()
            result = whisper.decode(model, mel, options)
            
            # Clean up temp file
            os.unlink(temp_file_path)
            
            return result.text if result.text else "Could not transcribe audio clearly."
            
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            raise e
        
    except Exception as e:
        print(f"Whisper transcription error: {e}")
        return "Speech-to-text failed. Please try again or use text input."

def parse_gemini_response(response: str) -> tuple:
    """Parse Gemini response to extract conversation and structured data"""
    
    # Look for JSON code blocks first
    if '```json' in response:
        parts = response.split('```json')
        if len(parts) >= 2:
            conversation_part = parts[0].strip()
            json_part = parts[1].split('```')[0].strip()
            
            try:
                tasks_data = json.loads(json_part)
                return conversation_part, tasks_data
            except:
                pass
    
    # Fallback: look for JSON objects
    parts = response.split('{')
    if len(parts) < 2:
        return response, {}
    
    conversation_part = parts[0].strip()
    json_part = '{' + '{'.join(parts[1:])
    
    try:
        # Find the JSON object at the end
        json_start = json_part.rfind('{')
        json_end = json_part.rfind('}') + 1
        json_str = json_part[json_start:json_end]
        
        tasks_data = json.loads(json_str)
        return conversation_part, tasks_data
    except:
        return response, {}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port) 