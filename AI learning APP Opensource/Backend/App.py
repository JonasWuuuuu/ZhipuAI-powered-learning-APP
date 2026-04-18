"""
FutureTechFinalWebV1 - Main Flask Application
"""
from flask import Flask, jsonify, request, Response, stream_with_context
from flask_cors import CORS
import os
import sys
from config import config
from modules.ai_service import AIService
from modules.speech_service import SpeechService
from modules.utils import log_message, sanitize_text, is_valid_question
import json
import re

# ============ COMMAND DETECTION FUNCTION ============

def detect_and_extract_command(question, language='chinese'):
    """
    Pre-detect if question is a command request and extract parameters.
    Returns: dict with command info if detected, None otherwise.
    """
    q_lower = question.lower().strip()
    q_orig = question.strip()
    print(f"[CMD] Analyzing: '{q_orig[:60]}'")

    # ========== GENERATE QUESTIONS ==========
    # English: "make/generate/create" + "question/problem/exercise/exam"
    has_gen_verb_en = any(w in q_lower for w in ['make ', 'generate ', 'create ', 'produce ', 'give me'])
    has_q_noun_en = any(w in q_lower for w in ['question', 'problem', 'exercise', 'exam', 'quiz'])

    # Chinese: "生成/出题/给我出" + "题/题目/练习"
    has_gen_verb_cn = any(w in q_orig for w in ['生成', '出题', '给我出', '制作题', '出一些'])
    has_q_noun_cn = any(w in q_orig for w in ['题', '题目', '练习', '问题'])

    if (has_gen_verb_en and has_q_noun_en) or (has_gen_verb_cn and has_q_noun_cn):
        print("[CMD] ✓ GENERATE-QUESTIONS (DETECTED)")
        subj = extract_subject(question)
        qty = extract_quantity(question)
        diff = extract_difficulty(question)
        cmd = {
            'isCommand': True,
            'action': 'generate-questions',
            'params': {'subject': subj, 'quantity': qty, 'difficulty': diff, 'grade': '', 'type': ''},
            'explanation': get_explanation('generate-questions', subj, qty, language)
        }
        return {'action': 'generate-questions', 'json_string': json.dumps(cmd, ensure_ascii=False)}

    # ========== CHECK ANSWER ==========
    has_check_verb_en = any(w in q_lower for w in ['check ', 'grade ', 'review ', 'correct ', 'mark '])
    has_answer_en = 'answer' in q_lower or 'response' in q_lower

    has_check_verb_cn = any(w in q_orig for w in ['检查', '批改', '改', '对答案', '检阅'])
    has_answer_cn = '答案' in q_orig

    if (has_check_verb_en and has_answer_en) or (has_check_verb_cn and has_answer_cn):
        print("[CMD] ✓ CHECK-ANSWER (DETECTED)")
        cmd = {
            'isCommand': True,
            'action': 'check-answer',
            'params': {'question': '', 'studentAnswer': '', 'standardAnswer': ''},
            'explanation': get_explanation('check-answer', '', 0, language)
        }
        return {'action': 'check-answer', 'json_string': json.dumps(cmd, ensure_ascii=False)}

    # ========== GENERATE PLAN ==========
    has_plan_verb_en = any(w in q_lower for w in ['plan ', 'schedule ', 'roadmap '])
    has_learning_en = any(w in q_lower for w in ['learning', 'study', 'learn'])

    has_plan_verb_cn = any(w in q_orig for w in ['计划', '规划', '安排', '制定'])
    has_learning_cn = any(w in q_orig for w in ['学习', '学', '课程'])

    if (has_plan_verb_en and has_learning_en) or (has_plan_verb_cn and has_learning_cn):
        print("[CMD] ✓ GENERATE-PLAN (DETECTED)")
        cmd = {
            'isCommand': True,
            'action': 'generate-plan',
            'params': {'goal': '', 'duration': '', 'currentLevel': ''},
            'explanation': get_explanation('generate-plan', '', 0, language)
        }
        return {'action': 'generate-plan', 'json_string': json.dumps(cmd, ensure_ascii=False)}

    # ========== PRACTICE ==========
    has_practice_en = any(w in q_lower for w in ['practice ', 'drill ', 'exercise '])
    has_practice_cn = any(w in q_orig for w in ['练习', '做题', '做一些'])

    if has_practice_en or has_practice_cn:
        print("[CMD] ✓ PRACTICE (DETECTED)")
        subj = extract_subject(question)
        qty = extract_quantity(question)
        cmd = {
            'isCommand': True,
            'action': 'practice',
            'params': {'subject': subj, 'type': '', 'quantity': qty},
            'explanation': get_explanation('practice', subj, qty, language)
        }
        return {'action': 'practice', 'json_string': json.dumps(cmd, ensure_ascii=False)}

    print("[CMD] ✗ No command pattern matched")
    return None


def extract_subject(question):
    """Extract subject/topic from question"""
    # Common topics (both English and Chinese)
    topics = {
        'quadratic equation': '二次方程', 'algebra': '代数', 'geometry': '几何',
        'trigonometry': '三角函数', 'calculus': '微积分', 'statistics': '统计',
        'factorization': '因式分解', 'polynomial': '多项式', 'matrix': '矩阵',
        'equation': '方程', 'function': '函数', 'binomial theorem': '二项式定理',
        '二次方程': '二次方程', '代数': '代数', '几何': '几何', '三角函数': '三角函数',
        '微积分': '微积分', '因式分解': '因式分解', '多项式': '多项式', '矩阵': '矩阵',
        '方程': '方程', '函数': '函数', '二项式定理': '二项式定理'
    }

    q_lower = question.lower()

    # Check for known topics
    for eng_topic, cn_topic in topics.items():
        if eng_topic in q_lower or eng_topic in question:
            return cn_topic
        if cn_topic in question:
            return cn_topic

    # Extract from "about", "for", "的", "关于"
    for sep in [' about ', ' for ', '的', '关于', '在']:
        if sep in q_lower or sep in question:
            parts = question.split(sep) if sep in question else q_lower.split(sep)
            if len(parts) > 1:
                extracted = parts[-1].strip().split()[0:3]  # Get last phrase
                extracted_str = ' '.join(extracted) if isinstance(extracted, list) else str(extracted)
                if len(extracted_str) > 0:
                    return extracted_str

    return 'math'


def extract_quantity(question):
    """Extract quantity/number from question"""
    # Look for numbers
    numbers = re.findall(r'\d+', question)
    if numbers:
        return int(numbers[0])
    return 10  # Default


def extract_difficulty(question):
    """Extract difficulty level from question"""
    question_lower = question.lower()

    # Check for easy
    if any(w in question_lower for w in ['easy', 'simple']) or any(w in question for w in ['简单', '容易', '基础']):
        return 'easy'

    # Check for hard
    if any(w in question_lower for w in ['hard', 'difficult', 'challenging']) or \
       any(w in question for w in ['难', '困难', '复杂', '高难']):
        return 'hard'

    # Default to intermediate
    return 'intermediate'


def get_explanation(action, subject, quantity, language):
    """Generate user-friendly explanation based on action and language"""
    if language == 'chinese':
        if action == 'generate-questions':
            return f"为您生成{quantity}道关于{subject}的题目..."
        elif action == 'check-answer':
            return "准备批改您的答案..."
        elif action == 'generate-plan':
            return "为您制定学习计划..."
        elif action == 'practice':
            return f"生成{quantity}道{subject}的练习题..."

    # English
    if action == 'generate-questions':
        return f"Generating {quantity} questions about {subject}..."
    elif action == 'check-answer':
        return "Checking your answer..."
    elif action == 'generate-plan':
        return "Creating a learning plan..."
    elif action == 'practice':
        return f"Generating {quantity} practice questions on {subject}..."

    return "Processing..."

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config[os.getenv('FLASK_ENV', 'development')])

# Enable CORS
CORS(app)

# Initialize services
try:
    ai_service = AIService(os.getenv('ZHIPU_API_KEY'))
    print(log_message('AI Service initialized successfully', 'success'))
except Exception as e:
    print(log_message(f'Failed to initialize AI Service: {str(e)}', 'error'))
    ai_service = None

try:
    speech_service = SpeechService(model_size='base')
    print(log_message('Speech Service initialized successfully', 'success'))
except Exception as e:
    print(log_message(f'Failed to initialize Speech Service: {str(e)}', 'error'))
    speech_service = None

# ============ Health & Status Endpoints ============

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    services_status = {
        'ai_service': 'ready' if ai_service else 'unavailable',
        'speech_service': 'ready' if speech_service else 'unavailable'
    }
    return jsonify({
        'status': 'healthy',
        'message': 'FutureTechFinalWebV1 is running',
        'services': services_status
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get detailed status"""
    return jsonify({
        'app_name': 'FutureTechFinalWebV1',
        'version': '1.0.0',
        'ai_service_available': ai_service is not None,
        'speech_service_available': speech_service is not None,
    })

# ============ AI Service Endpoints ============

@app.route('/api/ai/ask', methods=['POST'])
def ask_ai():
    """
    AI Question endpoint
    Expected JSON: {'question': 'your question here', 'language': 'english'}
    Returns: {'content': 'ai answer', 'question': 'user question', ...}
    """
    try:
        if not ai_service:
            return jsonify({'error': 'AI Service is not available'}), 503

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        question = data.get('question', '').strip()
        user_language = data.get('language', 'chinese')  # 获取用户的首选语言
        system_instruction = data.get('systemInstruction', '').strip()  # 获取前端的系统指示

        # Validate question
        is_valid, error_msg = is_valid_question(question)
        if not is_valid:
            return jsonify({'error': error_msg}), 400

        print(log_message(f"Processing question: {question[:50]}...", 'info'))
        print(log_message(f"User language: {user_language}", 'info'))

        # Map language code to full language name
        language_map = {
            'chinese': 'Chinese',
            'english': 'English',
            'spanish': 'Spanish',
            'french': 'French',
            'german': 'German',
            'japanese': 'Japanese',
            'korean': 'Korean',
            'portuguese': 'Portuguese'
        }

        target_language = language_map.get(user_language, 'Chinese')

        # Use ZhipuAI directly with system message (like chat endpoint)
        from zhipuai import ZhipuAI

        # Build messages with proper system message (keep simple like /ai/chat to avoid conflicts)
        system_message = f'Please respond entirely in {target_language}. All your responses must be in {target_language} language. Do not translate from other languages - generate your response directly in {target_language}.'

        messages = [
            {
                'role': 'system',
                'content': system_message
            },
            {
                'role': 'user',
                'content': question
            }
        ]

        try:
            response = ai_service.client.chat.completions.create(
                model=ai_service.model,
                messages=messages,
                temperature=0.7,
                top_p=0.9,
                max_tokens=2000
            )

            answer = response.choices[0].message.content

            print(log_message(f"Question response successful", 'success'))

            return jsonify({
                'content': answer,
                'question': question,
                'model': ai_service.model,
                'usage': {
                    'prompt_tokens': response.usage.prompt_tokens if hasattr(response.usage, 'prompt_tokens') else 0,
                    'completion_tokens': response.usage.completion_tokens if hasattr(response.usage, 'completion_tokens') else 0,
                }
            }), 200
        except Exception as e:
            print(log_message(f"Error with direct API call: {str(e)}", 'error'))
            raise

    except Exception as e:
        error_msg = f"Error processing question: {str(e)}"
        print(log_message(error_msg, 'error'))
        return jsonify({'error': error_msg}), 500

@app.route('/api/ai/regenerate', methods=['POST'])
def regenerate_response():
    """
    Regenerate the last AI response
    """
    try:
        if not ai_service:
            return jsonify({'error': 'AI Service is not available'}), 503

        response = ai_service.regenerate()

        if 'error' in response:
            return jsonify(response), 400

        return jsonify(response), 200

    except Exception as e:
        error_msg = f"Error regenerating response: {str(e)}"
        print(log_message(error_msg, 'error'))
        return jsonify({'error': error_msg}), 500

@app.route('/api/ai/history', methods=['GET'])
def get_conversation_history():
    """
    Get conversation history
    Query parameter: limit (default: 10)
    """
    try:
        if not ai_service:
            return jsonify({'error': 'AI Service is not available'}), 503

        limit = request.args.get('limit', 10, type=int)
        limit = max(1, min(limit, 50))  # Clamp between 1 and 50

        history = ai_service.get_history(limit)
        return jsonify({'history': history, 'count': len(history)}), 200

    except Exception as e:
        error_msg = f"Error retrieving history: {str(e)}"
        print(log_message(error_msg, 'error'))
        return jsonify({'error': error_msg}), 500

@app.route('/api/ai/clear-history', methods=['POST'])
def clear_history():
    """Clear conversation history"""
    try:
        if not ai_service:
            return jsonify({'error': 'AI Service is not available'}), 503

        ai_service.clear_history()
        print(log_message('Conversation history cleared', 'info'))
        return jsonify({'message': 'History cleared successfully'}), 200

    except Exception as e:
        error_msg = f"Error clearing history: {str(e)}"
        print(log_message(error_msg, 'error'))
        return jsonify({'error': error_msg}), 500

@app.route('/api/ai/chat', methods=['POST'])
def chat():
    """
    AI Chat endpoint (non-streaming version)
    Expected JSON: {
        'question': 'your question here',
        'history': [{'role': 'user', 'content': '...'}, {'role': 'assistant', 'content': '...'}]
    }
    Returns: {'content': 'ai answer', 'question': 'user question', ...}
    """
    try:
        if not ai_service:
            print(log_message('AI Service is not available', 'error'))
            return jsonify({'error': 'AI Service is not available'}), 503

        data = request.get_json()
        if not data:
            print(log_message('Invalid JSON data', 'error'))
            return jsonify({'error': 'Invalid JSON data'}), 400

        question = data.get('question', '').strip()
        history = data.get('history', [])
        user_language = data.get('language', 'chinese')  # 获取用户的首选语言
        custom_requirements = data.get('customRequirements', '').strip()  # 获取用户的学习要求
        system_instruction = data.get('systemInstruction', '').strip()  # 获取前端的系统指示

        # Validate question
        is_valid, error_msg = is_valid_question(question)
        if not is_valid:
            print(log_message(f'Invalid question: {error_msg}', 'error'))
            return jsonify({'error': error_msg}), 400

        print(log_message(f"Processing chat: {question[:50]}...", 'info'))
        print(log_message(f"Chat history length: {len(history)}", 'info'))
        print(log_message(f"User language: {user_language}", 'info'))
        if custom_requirements:
            print(log_message(f"Custom requirements: {custom_requirements[:50]}...", 'info'))

        # ============ PRE-COMMAND DETECTION ============
        # Check if this is a command request BEFORE calling AI
        print(log_message(f"[PRE-CHECK] Analyzing question for command patterns...", 'info'))
        command_result = detect_and_extract_command(question, user_language)
        if command_result:
            print(log_message(f"✓ COMMAND DETECTED: {command_result['action']}", 'success'))
            response_data = {
                'content': command_result['json_string'],
                'isCommand': True,
                'question': question,
                'model': 'command-detector'
            }
            print(log_message(f"Returning command response: {response_data['content'][:100]}", 'info'))
            return jsonify(response_data), 200
        else:
            print(log_message(f"✗ No command detected, proceeding to AI", 'info'))

        # If history is provided, use it directly for context
        if history:
            # Use the provided history for this request
            from zhipuai import ZhipuAI

            # Build messages including the provided history
            messages = []

            # Map language code to full language name for system instruction
            language_map = {
                'chinese': 'Chinese',
                'english': 'English',
                'spanish': 'Spanish',
                'french': 'French',
                'german': 'German',
                'japanese': 'Japanese',
                'korean': 'Korean',
                'portuguese': 'Portuguese'
            }

            target_language = language_map.get(user_language, 'English')

            # 【重要】如果前端提供了systemInstruction，优先使用它；否则使用默认的命令识别指示
            if system_instruction:
                print(log_message(f"✓ Using frontend systemInstruction ({len(system_instruction)} chars)", 'info'))
                # 使用前端提供的系统指示
                system_message = system_instruction + f'\n\nPlease respond entirely in {target_language}. All your responses must be in {target_language} language.\n\n'
            else:
                # 使用默认的命令识别指示
                print(log_message(f"Using default command recognition instructions", 'info'))
                system_message = '''[CRITICAL - READ FIRST]
YOU MUST CHECK EVERY USER REQUEST FOR COMMANDS BEFORE RESPONDING NORMALLY.
If user asks to: generate/make/create questions, check answers, plan learning, or practice - RESPOND WITH JSON ONLY.
Do NOT answer these requests directly in chat. Use JSON format only.

'''

                # Add language instruction
                system_message += f'Please respond entirely in {target_language}. All your responses must be in {target_language} language. Do not translate from other languages - generate your response directly in {target_language}.\n\n'

                # Add command recognition instructions
                system_message += '''[COMMAND RECOGNITION - MANDATORY]
THESE ARE NOT NORMAL CONVERSATIONAL REQUESTS - THEY ARE COMMANDS THAT MUST TRIGGER JSON RESPONSES.

When user asks ANY of these (regardless of phrasing):
- "make/generate/create/produce questions/problems/exercises" → JSON with "generate-questions"
- "check/grade/review/correct answer(s)" → JSON with "check-answer"
- "plan/schedule/roadmap for learning" → JSON with "generate-plan"
- "practice/drill/exercise on topic" → JSON with "practice"

RESPONSE FORMAT (DO NOT DEVIATE):
{
  "isCommand": true,
  "action": "generate-questions|check-answer|generate-plan|practice",
  "params": { subject, quantity, difficulty, grade, type },
  "explanation": "Brief explanation of what will happen"
}

IMPORTANT: The response should be ONLY JSON - no other text before or after.

COMMAND ACTION KEYWORDS TO WATCH FOR:
- GENERATE/MAKE/CREATE/PRODUCE questions/problems/exercises: → generate-questions
- CHECK/GRADE/REVIEW/CORRECT answer(s): → check-answer
- CREATE/MAKE/BUILD/DESIGN learning plan/study plan/schedule: → generate-plan
- PRACTICE/DO exercises/problems/drills: → practice

COMMAND ACTIONS AND PARAMETERS:
1. ACTION: "generate-questions"
   WHEN USER SAYS (English): "make", "generate", "create", "produce" + questions/problems/exercises + optional topic
   WHEN USER SAYS (Chinese): "生成题", "出题", "生成10道", "给我出题", "制作题目"

   EXAMPLES THAT MUST TRIGGER THIS:
   - "make me 10 questions for quadratic equations" ✓ MUST respond with JSON
   - "Generate 5 problems about algebra" ✓ MUST respond with JSON
   - "Create some math exercises" ✓ MUST respond with JSON

   PARAMETER EXTRACTION:
   - subject: The topic/subject (e.g., "quadratic equations", "algebra", "factorization")
   - quantity: Number of questions (extract number, or default 10)
   - difficulty: easy/intermediate/hard (default: "intermediate")
   - grade: Grade level if mentioned, else empty string
   - type: Question type if mentioned, else empty string

   EXAMPLE TRANSFORMATIONS:
   Input: "make me 10 questions for quadratic equations"
   Output: {"isCommand": true, "action": "generate-questions", "params": {"subject": "quadratic equations", "quantity": 10, "difficulty": "intermediate", "grade": "", "type": ""}, "explanation": "I'll generate 10 intermediate-level questions about quadratic equations for you."}

2. ACTION: "check-answer"
   WHEN USER SAYS: "check", "grade", "review", "correct", "mark" + answer
   EXAMPLES: "check this answer", "grade my response", "help me review this", "correct my answer"
   PARAMETERS: question, studentAnswer, standardAnswer

3. ACTION: "generate-plan"
   WHEN USER SAYS: "plan", "schedule", "roadmap", "create plan" for learning
   EXAMPLES: "create a learning plan", "make a study schedule", "plan my learning"
   PARAMETERS: goal, duration, currentLevel

4. ACTION: "practice"
   WHEN USER SAYS: "practice", "drill", "exercise" on topic
   EXAMPLES: "let me practice algebra", "give me some exercises", "I want to drill"
   PARAMETERS: subject, type, quantity

EXAMPLES OF COMMAND REQUESTS (should trigger JSON response):
Chinese:
- "生成10道二次方程的题"
- "帮我检查这道题的答案：2x+3=7，学生答案是x=2"
- "给我制定一个数学学习计划"
- "我想做关于因式分解的练习"

English:
- "Make me 10 questions for quadratic equations"
- "Generate 5 practice problems about factorization"
- "Check this answer: for x+5=10, student answer is x=5"
- "Create a learning plan for trigonometry"
- "I want to practice some algebra problems"

EXAMPLES OF NORMAL REQUESTS (should trigger normal text response):
Chinese:
- "什么是二次方程？"
- "怎样解这个问题？"
- "告诉我三角函数的用法"

English:
- "What is a quadratic equation?"
- "How do I solve this problem?"
- "Explain the concept of derivatives"

CRITICAL RULES - MUST FOLLOW:
✓ MUST respond with JSON when user mentions: generate, make, create, produce, check, grade, review, plan, practice, exercise, drill
✓ DO NOT answer these requests directly with text content
✓ DO NOT generate questions in the chat - always return JSON command
✓ DO NOT provide explanations of the topic - always return JSON command
✓ The response must be ONLY the JSON object - nothing before, nothing after
✓ Include all required fields: isCommand, action, params (with subject, quantity, difficulty, grade, type), explanation
✓ If any action keyword is present, treat as command and respond with JSON
✓ Parameter names must be EXACT: subject, quantity, difficulty, grade, type (not "topic", not "count", etc.)

WHAT NOT TO DO:
✗ Do NOT respond to "make me 10 questions for quadratic equations" with actual questions
✗ Do NOT provide explanations of quadratic equations
✗ Do NOT mix text with JSON
✗ Do NOT ask for clarification - extract parameters and return JSON
✗ Do NOT respond with normal conversational text for command requests

[END COMMAND RECOGNITION]
'''

            # Append custom requirements to system message if provided
            if custom_requirements:
                system_message += f'\n\nUser learning requirements/preferences: {custom_requirements}'

            messages.append({
                'role': 'system',
                'content': system_message
            })

            # Add provided history
            for msg in history:
                if msg.get('role') and msg.get('content'):
                    messages.append({
                        'role': msg['role'],
                        'content': msg['content']
                    })

            # Add current question
            messages.append({
                'role': 'user',
                'content': question
            })

            # Call ZhipuAI API with full conversation context
            try:
                response = ai_service.client.chat.completions.create(
                    model=ai_service.model,
                    messages=messages,
                    temperature=0.7,
                    top_p=0.9,
                    max_tokens=2000
                )

                answer = response.choices[0].message.content

                print(log_message(f"Chat response successful with history context", 'success'))

                return jsonify({
                    'content': answer,
                    'question': question,
                    'model': ai_service.model,
                    'usage': {
                        'prompt_tokens': response.usage.prompt_tokens if hasattr(response.usage, 'prompt_tokens') else 0,
                        'completion_tokens': response.usage.completion_tokens if hasattr(response.usage, 'completion_tokens') else 0,
                    }
                }), 200
            except Exception as e:
                print(log_message(f"Error with history context: {str(e)}", 'error'))
                raise
        else:
            # Fallback to language-aware request if no history provided
            from zhipuai import ZhipuAI

            # Map language code to full language name
            language_map = {
                'chinese': 'Chinese',
                'english': 'English',
                'spanish': 'Spanish',
                'french': 'French',
                'german': 'German',
                'japanese': 'Japanese',
                'korean': 'Korean',
                'portuguese': 'Portuguese'
            }

            target_language = language_map.get(user_language, 'English')

            # 【重要】如果前端提供了systemInstruction，优先使用它；否则使用默认的命令识别指示
            if system_instruction:
                print(log_message(f"✓ Using frontend systemInstruction ({len(system_instruction)} chars)", 'info'))
                # 使用前端提供的系统指示
                system_message = system_instruction + f'\n\nPlease respond entirely in {target_language}. All your responses must be in {target_language} language.\n\n'
            else:
                # 使用默认的命令识别指示
                print(log_message(f"Using default command recognition instructions", 'info'))
                system_message = '''[CRITICAL - READ FIRST]
YOU MUST CHECK EVERY USER REQUEST FOR COMMANDS BEFORE RESPONDING NORMALLY.
If user asks to: generate/make/create questions, check answers, plan learning, or practice - RESPOND WITH JSON ONLY.
Do NOT answer these requests directly in chat. Use JSON format only.

'''

                # Add language instruction
                system_message += f'Please respond entirely in {target_language}. All your responses must be in {target_language} language. Do not translate from other languages - generate your response directly in {target_language}.\n\n'

                # Add command recognition instructions
                system_message += '''[COMMAND RECOGNITION - MANDATORY]
THESE ARE NOT NORMAL CONVERSATIONAL REQUESTS - THEY ARE COMMANDS THAT MUST TRIGGER JSON RESPONSES.

When user asks ANY of these (regardless of phrasing):
- "make/generate/create/produce questions/problems/exercises" → JSON with "generate-questions"
- "check/grade/review/correct answer(s)" → JSON with "check-answer"
- "plan/schedule/roadmap for learning" → JSON with "generate-plan"
- "practice/drill/exercise on topic" → JSON with "practice"

RESPONSE FORMAT (DO NOT DEVIATE):
{
  "isCommand": true,
  "action": "generate-questions|check-answer|generate-plan|practice",
  "params": { subject, quantity, difficulty, grade, type },
  "explanation": "Brief explanation of what will happen"
}

IMPORTANT: The response should be ONLY JSON - no other text before or after.

COMMAND ACTION KEYWORDS TO WATCH FOR:
- GENERATE/MAKE/CREATE/PRODUCE questions/problems/exercises: → generate-questions
- CHECK/GRADE/REVIEW/CORRECT answer(s): → check-answer
- CREATE/MAKE/BUILD/DESIGN learning plan/study plan/schedule: → generate-plan
- PRACTICE/DO exercises/problems/drills: → practice

COMMAND ACTIONS AND PARAMETERS:
1. ACTION: "generate-questions"
   WHEN USER SAYS (English): "make", "generate", "create", "produce" + questions/problems/exercises + optional topic
   WHEN USER SAYS (Chinese): "生成题", "出题", "生成10道", "给我出题", "制作题目"

   EXAMPLES THAT MUST TRIGGER THIS:
   - "make me 10 questions for quadratic equations" ✓ MUST respond with JSON
   - "Generate 5 problems about algebra" ✓ MUST respond with JSON
   - "Create some math exercises" ✓ MUST respond with JSON

   PARAMETER EXTRACTION:
   - subject: The topic/subject (e.g., "quadratic equations", "algebra", "factorization")
   - quantity: Number of questions (extract number, or default 10)
   - difficulty: easy/intermediate/hard (default: "intermediate")
   - grade: Grade level if mentioned, else empty string
   - type: Question type if mentioned, else empty string

   EXAMPLE TRANSFORMATIONS:
   Input: "make me 10 questions for quadratic equations"
   Output: {"isCommand": true, "action": "generate-questions", "params": {"subject": "quadratic equations", "quantity": 10, "difficulty": "intermediate", "grade": "", "type": ""}, "explanation": "I'll generate 10 intermediate-level questions about quadratic equations for you."}

2. ACTION: "check-answer"
   WHEN USER SAYS: "check", "grade", "review", "correct", "mark" + answer
   EXAMPLES: "check this answer", "grade my response", "help me review this", "correct my answer"
   PARAMETERS: question, studentAnswer, standardAnswer

3. ACTION: "generate-plan"
   WHEN USER SAYS: "plan", "schedule", "roadmap", "create plan" for learning
   EXAMPLES: "create a learning plan", "make a study schedule", "plan my learning"
   PARAMETERS: goal, duration, currentLevel

4. ACTION: "practice"
   WHEN USER SAYS: "practice", "drill", "exercise" on topic
   EXAMPLES: "let me practice algebra", "give me some exercises", "I want to drill"
   PARAMETERS: subject, type, quantity

EXAMPLES OF COMMAND REQUESTS (should trigger JSON response):
Chinese:
- "生成10道二次方程的题"
- "帮我检查这道题的答案：2x+3=7，学生答案是x=2"
- "给我制定一个数学学习计划"
- "我想做关于因式分解的练习"

English:
- "Make me 10 questions for quadratic equations"
- "Generate 5 practice problems about factorization"
- "Check this answer: for x+5=10, student answer is x=5"
- "Create a learning plan for trigonometry"
- "I want to practice some algebra problems"

EXAMPLES OF NORMAL REQUESTS (should trigger normal text response):
Chinese:
- "什么是二次方程？"
- "怎样解这个问题？"
- "告诉我三角函数的用法"

English:
- "What is a quadratic equation?"
- "How do I solve this problem?"
- "Explain the concept of derivatives"

CRITICAL RULES - MUST FOLLOW:
✓ MUST respond with JSON when user mentions: generate, make, create, produce, check, grade, review, plan, practice, exercise, drill
✓ DO NOT answer these requests directly with text content
✓ DO NOT generate questions in the chat - always return JSON command
✓ DO NOT provide explanations of the topic - always return JSON command
✓ The response must be ONLY the JSON object - nothing before, nothing after
✓ Include all required fields: isCommand, action, params (with subject, quantity, difficulty, grade, type), explanation
✓ If any action keyword is present, treat as command and respond with JSON
✓ Parameter names must be EXACT: subject, quantity, difficulty, grade, type (not "topic", not "count", etc.)

WHAT NOT TO DO:
✗ Do NOT respond to "make me 10 questions for quadratic equations" with actual questions
✗ Do NOT provide explanations of quadratic equations
✗ Do NOT mix text with JSON
✗ Do NOT ask for clarification - extract parameters and return JSON
✗ Do NOT respond with normal conversational text for command requests

[END COMMAND RECOGNITION]
'''

            # Build messages with language instruction
            messages = [
                {
                    'role': 'system',
                    'content': system_message
                },
                {
                    'role': 'user',
                    'content': question
                }
            ]

            try:
                response = ai_service.client.chat.completions.create(
                    model=ai_service.model,
                    messages=messages,
                    temperature=0.7,
                    top_p=0.9,
                    max_tokens=2000
                )

                answer = response.choices[0].message.content

                print(log_message(f"Chat response successful without history context", 'success'))

                return jsonify({
                    'content': answer,
                    'question': question,
                    'model': ai_service.model,
                    'usage': {
                        'prompt_tokens': response.usage.prompt_tokens if hasattr(response.usage, 'prompt_tokens') else 0,
                        'completion_tokens': response.usage.completion_tokens if hasattr(response.usage, 'completion_tokens') else 0,
                    }
                }), 200
            except Exception as e:
                print(log_message(f"Error without history context: {str(e)}", 'error'))
                raise

    except Exception as e:
        error_msg = f"Error processing chat: {str(e)}"
        print(log_message(error_msg, 'error'))
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg}), 500

@app.route('/api/ai/chat-stream', methods=['POST'])
def chat_stream():
    """
    AI Chat with streaming response (SSE)
    Expected JSON: {'question': 'your question here', 'language': 'english'}
    Returns: Server-Sent Events stream with real-time response chunks
    """
    try:
        if not ai_service:
            return jsonify({'error': 'AI Service is not available'}), 503

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        question = data.get('question', '').strip()
        user_language = data.get('language', 'chinese')  # 获取用户的首选语言
        system_instruction = data.get('systemInstruction', '').strip()  # 获取前端的系统指示

        # Validate question
        is_valid, error_msg = is_valid_question(question)
        if not is_valid:
            return jsonify({'error': error_msg}), 400

        print(log_message(f"Processing streaming chat: {question[:50]}...", 'info'))
        print(log_message(f"User language: {user_language}", 'info'))

        # 映射语言代码到完整的语言名称
        language_map = {
            'chinese': 'Chinese',
            'english': 'English',
            'spanish': 'Spanish',
            'french': 'French',
            'german': 'German',
            'japanese': 'Japanese',
            'korean': 'Korean',
            'portuguese': 'Portuguese'
        }

        target_language = language_map.get(user_language, 'Chinese')

        # 添加语言指令到问题
        language_instruction = f"\n\n[Important] You must respond entirely in {target_language}. All content must be in {target_language}."
        enhanced_question = question + language_instruction

        def generate():
            """Generator for streaming response"""
            try:
                print(log_message(f"Starting stream for question: {enhanced_question[:50]}...", 'info'))
                # Stream the response
                chunk_count = 0
                for chunk in ai_service.ask_stream(enhanced_question):
                    if chunk:
                        chunk_count += 1
                        print(log_message(f"Streaming chunk {chunk_count}: {chunk[:50]}...", 'info'))
                        # Send chunk as SSE event
                        yield f"data: {chunk}\n\n"

                print(log_message(f"Stream complete. Total chunks: {chunk_count}", 'info'))
                # Send final marker
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_msg = f"Streaming Error: {str(e)}"
                print(log_message(error_msg, 'error'))
                import traceback
                traceback.print_exc()
                yield f"data: Error: {error_msg}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        error_msg = f"Error in chat stream: {str(e)}"
        print(log_message(error_msg, 'error'))
        return jsonify({'error': error_msg}), 500

# ============ Translation Endpoints ============

@app.route('/api/translate', methods=['POST'])
def translate_text():
    """
    Translate text to target language using ZhipuAI
    Expected JSON: {
        'texts': ['text1', 'text2', ...],
        'sourceLanguage': 'chinese',
        'targetLanguage': 'english'
    }
    Returns: {
        'translations': [{'original': 'text1', 'translated': 'translated1'}, ...],
        'targetLanguage': 'english'
    }
    """
    try:
        if not ai_service:
            return jsonify({'error': 'AI Service is not available'}), 503

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400

        texts = data.get('texts', [])
        target_language = data.get('targetLanguage', 'english')

        if not texts:
            return jsonify({'error': 'No texts to translate'}), 400

        # If target language is Chinese, return original texts
        if target_language == 'chinese':
            translations = [{'original': text, 'translated': text} for text in texts]
            return jsonify({
                'translations': translations,
                'targetLanguage': target_language
            }), 200

        print(log_message(f"Translating {len(texts)} texts to {target_language}", 'info'))

        # Build translation prompt
        texts_str = '\n'.join([f"{i+1}. {text}" for i, text in enumerate(texts)])

        translation_prompt = f"""Please translate the following Chinese text to {target_language}.
Return ONLY the translations, one per line, in the same order as the input.
Do not add numbers or any explanations. Just the translated text.

Texts to translate:
{texts_str}

Translations:"""

        # Call ZhipuAI API for translation
        response = ai_service.ask(translation_prompt)

        if 'error' in response:
            print(log_message(f"Translation error: {response['error']}", 'error'))
            return jsonify({'error': response['error']}), 500

        translated_text = response.get('content', '')

        # Parse translations (one per line)
        translated_lines = translated_text.strip().split('\n')
        translations = []

        for i, original in enumerate(texts):
            translated = translated_lines[i].strip() if i < len(translated_lines) else original
            # Remove common prefixes like "1. ", "- ", etc.
            translated = translated.lstrip('0123456789.-) ')
            translations.append({
                'original': original,
                'translated': translated
            })

        print(log_message(f"Translation completed successfully", 'success'))

        return jsonify({
            'translations': translations,
            'targetLanguage': target_language
        }), 200

    except Exception as e:
        error_msg = f"Translation error: {str(e)}"
        print(log_message(error_msg, 'error'))
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg}), 500

# ============ Speech Recognition Endpoints ============

@app.route('/api/speech/recognize', methods=['POST'])
def recognize_speech():
    """
    Speech Recognition endpoint
    Expects audio file in 'audio' form field
    Returns: {'text': 'recognized text', 'language': 'zh', ...}
    """
    try:
        if not speech_service:
            return jsonify({'error': 'Speech Service is not available'}), 503

        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400

        audio_file = request.files['audio']

        if audio_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Get language parameter from FormData or args (【重要】支持语言参数以提高识别准确度到90%)
        # 优先从 FormData 读取，然后从查询参数，最后默认为 'zh'
        language = request.form.get('language') or request.args.get('language', 'zh')

        # Convert frontend language codes to Whisper language codes
        language_map = {
            'chinese': 'zh',
            'english': 'en',
            'spanish': 'es',
            'french': 'fr',
            'german': 'de',
            'japanese': 'ja',
            'korean': 'ko',
            'portuguese': 'pt',
            'auto': None  # Auto-detect
        }
        language = language_map.get(language, language)  # Map if exists, otherwise use as-is

        print(log_message(f"Recognizing speech from {audio_file.filename}", 'info'))

        # Read audio bytes
        audio_bytes = audio_file.read()

        # Recognize speech
        result = speech_service.recognize_from_bytes(audio_bytes, language)

        if 'error' in result:
            return jsonify(result), 400

        print(log_message(f"Speech recognition result: {result['text'][:50]}...", 'success'))
        return jsonify(result), 200

    except Exception as e:
        error_msg = f"Error in speech recognition: {str(e)}"
        print(log_message(error_msg, 'error'))
        return jsonify({'error': error_msg}), 500

# ============ Error Handlers ============

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

# ============ Application Entry Point ============

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5001))
    print(log_message('Starting FutureTechFinalWebV1 Backend', 'info'))
    app.run(
        debug=app.config['DEBUG'],
        host='0.0.0.0',
        port=port,
        use_reloader=False  # Disable reloader to avoid loading models twice
    )
