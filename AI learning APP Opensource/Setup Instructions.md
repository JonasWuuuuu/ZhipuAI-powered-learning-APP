# AI-Powered Learning Application - Setup Instructions

An intelligent learning assistant with adaptive difficulty levels, interactive question generation, answer checking, and personalized learning plans.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Getting Your API Key](#getting-your-api-key)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [How to Use](#how-to-use)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you start, make sure you have installed:
- **Python 3.8 or higher** - [Download Python](https://www.python.org/downloads/)
- **Git** - [Download Git](https://git-scm.com/)
- **A modern web browser** (Chrome, Firefox, Safari, Edge)
- **ZhipuAI API Key** (free account available)

## Getting Your API Key

### Step 1: Create a ZhipuAI Account
1. Go to [ZhipuAI Official Website](https://open.bigmodel.cn/)
2. Click "Sign Up" or "注册"
3. Create an account using email or phone number
4. Verify your email/phone

### Step 2: Get Your API Key
1. Log in to your ZhipuAI account
2. Go to "API Keys" or "密钥管理" section
3. Click "Create New Key" or "新建密钥"
4. Copy your API key (it looks like: `sk-xxxxx...`)
5. **Keep this key safe** - never share it publicly!

## Installation

### Step 1: Clone or Download the Project
```bash
# If using git
git clone <your-repository-url>
cd "Futuretech final project OpenSource"

# Or manually download the ZIP file and extract it
```

### Step 2: Install Python Dependencies
```bash
# Navigate to the backend folder
cd Backend

# Install required packages
pip install -r Requirements.txt
```

**What gets installed:**
- Flask - web framework
- Flask-CORS - for cross-origin requests
- Requests - for API calls
- ZhipuAI SDK - AI service integration

### Step 3: Set Your API Key

**On macOS/Linux:**
```bash
export ZHIPU_API_KEY="your-api-key-here"
```

**On Windows (Command Prompt):**
```cmd
set ZHIPU_API_KEY=your-api-key-here
```

**On Windows (PowerShell):**
```powershell
$env:ZHIPU_API_KEY="your-api-key-here"
```

Replace `your-api-key-here` with your actual API key from Step 2.

## Running the Application

### Step 1: Start the Backend Server
```bash
# Make sure you're in the Backend folder
python App.py
```

You should see:
```
 * Running on http://localhost:5001
 * Press CTRL+C to quit
```

**Keep this terminal open** - the backend needs to run while you use the app.

### Step 2: Open the Frontend
1. Open your web browser
2. Go to: `http://localhost:5001`
3. You should see the AI Learning Assistant interface

## How to Use

### Main Features

**1. Question Generator** 🎓
- Select your grade level and subject
- Choose difficulty level
- Specify question type (multiple choice, fill-in-blank, etc.)
- Get AI-generated questions with explanations
- Mark answers as correct/incorrect to track performance
- System automatically adjusts difficulty based on your answers

**2. Answer Checker** ✅
- Submit your own questions and answers
- Get AI-powered feedback and grading
- See detailed explanations for mistakes

**3. Learning Plan Generator** 📚
- Input your learning goals
- Get a personalized study plan
- See recommended resources and schedule

**4. AI Chat** 💬
- Ask questions about any topic
- Get instant explanations
- Request homework help

### Performance Tracking
- Performance meter shows your correct answer percentage
- Difficulty automatically increases after 5 consecutive correct answers
- Difficulty decreases if you get 2+ wrong answers in a row

### Language Support
- 8 languages supported: Chinese, English, Spanish, French, German, Japanese, Korean, Portuguese
- Change language in Settings

## Troubleshooting

### "API Key Not Set" Error
**Problem:** You see "❌ API 密钥未设置" or "API key not set"

**Solution:**
1. Make sure you set the environment variable correctly:
   ```bash
   export ZHIPU_API_KEY="your-key"
   ```
2. Restart the backend server (stop and run `python App.py` again)
3. Refresh your browser

### "Connection Refused" Error
**Problem:** "Cannot connect to localhost:5001"

**Solution:**
1. Make sure backend is running (you should see "Running on http://localhost:5001")
2. Try opening http://127.0.0.1:5001 instead
3. Check if port 5001 is available: `lsof -i :5001` (macOS/Linux)

### "Module not found" Error
**Problem:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
1. Make sure you installed requirements:
   ```bash
   pip install -r Requirements.txt
   ```
2. Use Python 3.8 or higher: `python --version`

### App is Slow or Freezing
**Problem:** The app takes a long time to respond

**Solution:**
1. Check your internet connection (ZhipuAI API needs internet)
2. Make sure your API key is valid
3. Check ZhipuAI service status
4. Restart the backend server

### Questions Not Generating
**Problem:** No questions appear after clicking "Generate"

**Solution:**
1. Select both a grade AND a subject
2. Check browser console (F12) for errors
3. Make sure API key is set correctly
4. Try refreshing the page

## File Structure

```
Futuretech final project OpenSource/
├── Frontend/
│   ├── index.html          # Main webpage
│   ├── Main.js             # JavaScript logic
│   ├── language_translation.js  # Multi-language support
│   └── Style.css           # Styling
│
├── Backend/
│   ├── App.py              # Flask backend server
│   ├── Requirements.txt     # Python dependencies
│   └── modules/            # AI service modules
│
└── Setup Instructions.md   # This file
```

## Need Help?

- **Check the browser console** for error messages (Press F12)
- **Restart the backend server** (many issues are fixed by this)
- **Verify your API key** is correct and has not expired
- **Check internet connection** (ZhipuAI needs internet access)

## Features Summary

✨ **Adaptive Difficulty** - Questions adjust to your level
🎯 **Performance Tracking** - See your progress in real-time
🌍 **8 Languages** - Use in your preferred language
🤖 **AI-Powered** - Intelligent question generation and grading
📱 **User-Friendly** - Clean, intuitive interface
🔒 **Secure** - API keys never exposed in code

## License

This project is open source. See LICENSE file for details.

---

**Questions or issues?** Check the troubleshooting section above or restart your backend server!

Happy learning! 🚀
