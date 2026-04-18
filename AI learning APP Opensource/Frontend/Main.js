/**
 * FutureTechFinalWebV1 - Main Frontend JavaScript
 */

const API_BASE_URL = 'http://localhost:5001/api';

// Page configuration
const pageConfig = {
    'question-generator': {
        title: '智能出题器',
        subtitle: '智能语音和文本交互系统'
    },
    'answer-checker': {
        title: '智能批答案',
        subtitle: 'AI 自动评阅学生答案'
    },
    'learning-plan': {
        title: '学习规划',
        subtitle: '根据目标制定学习计划'
    },
    'ai-chat': {
        title: 'AI学习互动',
        subtitle: '与AI进行学习方面的自由讨论'
    },
    'plan-manager': {
        title: '学习计划',
        subtitle: '管理学习计划，设置定时提醒和倒计时'
    },
    'progress': {
        title: '学习进度',
        subtitle: '查看您的学习覆盖范围和进度统计'
    },
    'learning-settings': {
        title: '学习设置',
        subtitle: '配置您的学习偏好'
    },
    'user-settings': {
        title: '用户设置',
        subtitle: '自定义用户界面和显示选项'
    }
};

// Default settings
const defaultSettings = {
    // Study Settings
    language: 'english',
    grade: '',
    examType: '',
    subjects: [],
    learningStyle: 'detailed',
    learningStyleDescription: '',  // Custom learning style text description
    difficulty: 'intermediate',
    includeSolutions: true,
    includeAnalysis: true,
    useContext: true,
    // GUI Preferences
    fontSize: 100,
    dyslexiaFont: false,
    highContrast: false,
    lineSpacing: 'normal',
    theme: 'light',
    // Learning Profiles
    learningProfiles: [
        {
            id: 1,
            name: '默认配置',
            grade: '',
            subjects: [],
            learningStyle: 'detailed',
            difficulty: 'intermediate',
            includeSolutions: true,
            includeAnalysis: true,
            customRequirements: '',
            voiceRequirementsBlob: null
        }
    ],
    activeProfileId: 1,
    // Accessibility Settings
    accessibilitySettings: {
        enabled: false,
        navType: 'arrows',  // 'arrows' only
        buttonSize: 100,  // 80-150
        buttonSpacing: 'normal',  // 'tight', 'normal', 'relaxed'
        keySoundEnabled: true,
        voiceNavEnabled: true,
        errorAlertsEnabled: true,
        feedbackVolume: 50,  // 0-100
        readingSpeed: 1  // 0.5-2.0 speech rate multiplier
    },
    // Session-based adaptive difficulty tracking
    sessionDifficultyOptimal: {} // {subject_grade: 'intermediate', ...}
};

// 朗读功能的颜色配置（护眼配色方案）
const readAloudColors = {
    speakButton: '#1976d2',        // 蓝色 - 读出声按钮
    stopButton: '#d32f2f',         // 红色 - 停止按钮
    highlightBg: '#C8E6C9',        // 柔和浅绿色 - 高亮背景（护眼，更容易阅读）
    highlightBorder: '#81C784',    // 绿色边框（可选）
    highlightPadding: '2px 4px',   // 高亮内边距
    highlightBorderRadius: '3px'   // 高亮圆角
};

// ========== Session-Based Adaptive Difficulty ==========
// Difficulty progression levels
const difficultiesLevels = ['easy', 'intermediate', 'hard', 'expert'];

// Session performance tracking (in-memory)
let currentSessionPerformance = {
    subject: null,
    grade: null,
    difficulty: 'intermediate',
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    performanceHistory: [], // Array of {qIndex, correct, timestamp}
    performanceByDifficulty: {}, // {easy: {correct: N, total: M}, ...}
    lastAdjustmentMessage: null
};

function initializeSessionPerformance(subject, grade, startingDifficulty = 'intermediate') {
    currentSessionPerformance = {
        subject: subject,
        grade: grade,
        difficulty: startingDifficulty,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        performanceHistory: [],
        performanceByDifficulty: {
            easy: { correct: 0, total: 0 },
            intermediate: { correct: 0, total: 0 },
            hard: { correct: 0, total: 0 },
            expert: { correct: 0, total: 0 }
        },
        lastAdjustmentMessage: null
    };
}

// 考试系统特定的能力要求关键词
const examCommandWords = {
    'igcse': ['State', 'Describe', 'Explain', 'Analyse', 'Evaluate', 'Discuss', 'Outline', 'Identify', 'Define', 'Calculate', 'Comment', 'Compare', 'Justify', 'Predict', 'Sketch', 'Suggest', 'Summarize'],
    'a-level': ['Explain', 'Analyse', 'Evaluate', 'Discuss', 'Assess', 'Consider', 'Justify', 'Outline', 'Identify', 'Define', 'Compare', 'Contrast'],
    'ib': ['Discuss', 'Evaluate', 'Examine', 'Analyse', 'Explain', 'Compare', 'Contrast', 'Distinguish', 'Justify', 'Assess'],
    'ap': ['Analyze', 'Explain', 'Evaluate', 'Identify', 'Describe', 'Compare'],
    'sat': ['Explain', 'Analyze']
};

function getCommandWordsForExam(examType) {
    return examCommandWords[examType] || [];
}

// ========== Session Performance Tracking Functions ==========

function recordQuestionResult(questionIndex, isCorrect) {
    // Update session tracking
    currentSessionPerformance.totalQuestions++;
    if (isCorrect) {
        currentSessionPerformance.correctAnswers++;
        currentSessionPerformance.consecutiveCorrect++;
        currentSessionPerformance.consecutiveIncorrect = 0;
    } else {
        currentSessionPerformance.incorrectAnswers++;
        currentSessionPerformance.consecutiveIncorrect++;
        currentSessionPerformance.consecutiveCorrect = 0;
    }

    // Track by difficulty
    const diff = currentSessionPerformance.difficulty;
    if (currentSessionPerformance.performanceByDifficulty[diff]) {
        currentSessionPerformance.performanceByDifficulty[diff].total++;
        if (isCorrect) {
            currentSessionPerformance.performanceByDifficulty[diff].correct++;
        }
    }

    // Add to history
    currentSessionPerformance.performanceHistory.push({
        qIndex: questionIndex,
        correct: isCorrect,
        difficulty: diff,
        timestamp: Date.now()
    });

    // Check if difficulty adjustment is needed
    const newDifficulty = getAdjustedDifficulty(currentSessionPerformance.difficulty);
    if (newDifficulty !== currentSessionPerformance.difficulty) {
        return { shouldAdjust: true, newDifficulty: newDifficulty };
    }
    return { shouldAdjust: false, newDifficulty: null };
}

function getAdjustedDifficulty(currentDifficulty) {
    const { consecutiveCorrect, consecutiveIncorrect } = currentSessionPerformance;

    // Trigger: 5 consecutive correct → increase difficulty
    if (consecutiveCorrect >= 5) {
        const currentIndex = difficultiesLevels.indexOf(currentDifficulty);
        if (currentIndex < difficultiesLevels.length - 1) {
            return difficultiesLevels[currentIndex + 1];
        }
    }

    // Trigger: 2-3 wrong answers → decrease difficulty
    if (consecutiveIncorrect >= 2) {
        const currentIndex = difficultiesLevels.indexOf(currentDifficulty);
        if (currentIndex > 0) {
            return difficultiesLevels[currentIndex - 1];
        }
    }

    return currentDifficulty;
}

function getPerformancePercentage() {
    if (currentSessionPerformance.totalQuestions === 0) return 0;
    return Math.round((currentSessionPerformance.correctAnswers / currentSessionPerformance.totalQuestions) * 100);
}

function calculateOptimalDifficulty() {
    const perfByDiff = currentSessionPerformance.performanceByDifficulty;
    let bestDifficulty = 'intermediate';
    let bestDistance = 100;

    for (const [diff, stats] of Object.entries(perfByDiff)) {
        if (stats.total === 0) continue;
        const percentage = (stats.correct / stats.total) * 100;
        // Optimal is around 70-80% performance (challenging but achievable)
        const distance = Math.abs(75 - percentage);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestDifficulty = diff;
        }
    }

    return bestDifficulty;
}

// Translation Service for auto-translating to any language using ZhipuAI
class TranslationService {
    constructor() {
        this.cachePrefix = 'futuretech-translation-';
        this.supportedLanguages = ['chinese', 'english', 'spanish', 'french', 'german', 'japanese', 'korean', 'portuguese'];
    }

    /**
     * Get cache key for a specific language
     */
    getCacheKey(language) {
        return this.cachePrefix + language;
    }

    /**
     * Get cached translations for a language
     */
    getCachedTranslations(language) {
        const cached = localStorage.getItem(this.getCacheKey(language));
        return cached ? JSON.parse(cached) : {};
    }

    /**
     * Cache translations for a language
     */
    cacheTranslations(language, translations) {
        const cached = this.getCachedTranslations(language);
        const merged = { ...cached, ...translations };
        localStorage.setItem(this.getCacheKey(language), JSON.stringify(merged));
    }

    /**
     * Get single translation from cache
     */
    getTranslation(text, language) {
        const cached = this.getCachedTranslations(language);
        return cached[text] || null;
    }

    /**
     * Get translation for i18n key
     */
    getTranslationKey(key) {
        if (!LANGUAGES || !LANGUAGES[this.currentLanguage]) {
            return key;
        }
        return LANGUAGES[this.currentLanguage][key] || key;
    }

    /**
     * Translate batch of texts
     */
    async translateBatch(texts, targetLanguage, timeoutMs = 60000) {
        if (targetLanguage === 'chinese') {
            // Return original Chinese texts unchanged
            return texts.reduce((acc, text) => {
                acc[text] = text;
                return acc;
            }, {});
        }

        try {
            // Create timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`翻译超时（${timeoutMs/1000}秒）。请检查网络连接或稍后再试`)), timeoutMs)
            );

            // Create fetch promise with timeout
            const fetchPromise = fetch(`${API_BASE_URL}/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    texts: texts,
                    sourceLanguage: 'chinese',
                    targetLanguage: targetLanguage
                })
            });

            // Race between fetch and timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            if (!response.ok) {
                throw new Error(`翻译API错误: ${response.status}`);
            }

            const data = await response.json();
            const translations = {};

            // Map translations back to original texts
            if (data.translations && Array.isArray(data.translations)) {
                data.translations.forEach(item => {
                    translations[item.original] = item.translated;
                });
            }

            // Cache the translations
            this.cacheTranslations(targetLanguage, translations);

            return translations;
        } catch (error) {
            console.error('Translation error:', error);
            // Return original texts on error
            return texts.reduce((acc, text) => {
                acc[text] = text;
                return acc;
            }, {});
        }
    }

    /**
     * Clear cache for a language or all languages
     */
    clearCache(language = null) {
        if (language) {
            localStorage.removeItem(this.getCacheKey(language));
        } else {
            this.supportedLanguages.forEach(lang => {
                localStorage.removeItem(this.getCacheKey(lang));
            });
        }
    }

    /**
     * Get all translatable UI strings from the Chinese language definition
     */
    getAllTranslatableStrings() {
        const texts = new Set();

        // Get all strings from LANGUAGES.chinese (which contains all translatable keys)
        const flattenObject = (obj, prefix = '') => {
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                const fullKey = prefix ? `${prefix}.${key}` : key;

                if (typeof value === 'string' && value.trim().length > 0) {
                    texts.add(value);
                } else if (typeof value === 'object' && value !== null) {
                    flattenObject(value, fullKey);
                }
            });
        };

        if (LANGUAGES && LANGUAGES.chinese) {
            flattenObject(LANGUAGES.chinese);
        }

        return Array.from(texts);
    }
}

// ========== Performance Meter Display Functions ==========

function updatePerformanceMeterDisplay() {
    const meter = document.getElementById('qg-performance-meter');
    if (!meter) return;

    const percentage = getPerformancePercentage();
    const totalQuestions = currentSessionPerformance.totalQuestions;
    const correct = currentSessionPerformance.correctAnswers;

    document.getElementById('qg-perf-percentage').textContent = percentage;
    document.getElementById('qg-perf-count').textContent = `${correct}/${totalQuestions}`;

    // Get difficulty label for display using translations
    const diffLabels = {
        'easy': t('qg.difficulty-easy', window.app?.currentLanguage || 'chinese'),
        'intermediate': t('qg.difficulty-intermediate', window.app?.currentLanguage || 'chinese'),
        'hard': t('qg.difficulty-hard', window.app?.currentLanguage || 'chinese'),
        'expert': t('qg.difficulty-expert', window.app?.currentLanguage || 'chinese')
    };
    document.getElementById('qg-current-difficulty').textContent = diffLabels[currentSessionPerformance.difficulty] || t('qg.difficulty-intermediate', window.app?.currentLanguage || 'chinese');

    // Show feedback if difficulty recently adjusted
    const feedbackDiv = document.getElementById('qg-difficulty-feedback');
    if (currentSessionPerformance.lastAdjustmentMessage) {
        feedbackDiv.textContent = currentSessionPerformance.lastAdjustmentMessage;
        feedbackDiv.style.display = 'block';
    } else {
        feedbackDiv.style.display = 'none';
    }

    // Show meter
    meter.style.display = 'block';
}

function injectFeedbackButtons() {
    // Inject individual feedback buttons after each question
    const responseContainer = document.getElementById('response-container');
    if (!responseContainer) return;

    // Find all spans with question labels (they have the blue "Question N:" style)
    // The formatQuestionsWithColors function creates: <span style="color: #003DA5; ...">Question 1:</span>
    const allSpans = responseContainer.querySelectorAll('span[style*="003DA5"]');
    let questionIndex = 0;
    let feedbackButtonsAdded = 0;

    allSpans.forEach((span) => {
        // Check if this span is a question label
        const spanText = span.textContent.trim();
        if (spanText.match(/^(?:Question|题目|Pregunta|Frage|問題|문제|Pergunta)\s+\d+\s*[:：]/)) {
            // Find the parent div that contains this question
            let questionDiv = span.closest('div');
            if (!questionDiv) return;

            // Check if buttons already exist for this question
            let nextDiv = questionDiv.nextElementSibling;
            if (nextDiv && nextDiv.classList.contains('qg-question-feedback')) {
                questionIndex++;
                return; // Skip if already has buttons
            }

            // Create feedback buttons container
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'qg-question-feedback';
            feedbackDiv.style.cssText = `
                margin: 12px 20px 20px 20px;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 4px;
                display: flex;
                gap: 10px;
                align-items: center;
                flex-wrap: wrap;
            `;

            // Label
            const label = document.createElement('span');
            label.style.cssText = 'font-size: 13px; color: #666; font-weight: 500;';
            label.textContent = t('qg.feedback-label', window.app?.currentLanguage || 'chinese') || 'My Answer: ';

            // Correct button
            const correctBtn = document.createElement('button');
            correctBtn.className = 'qg-question-correct';
            correctBtn.textContent = t('qg.feedback-correct', window.app?.currentLanguage || 'chinese') || '✓ Correct';
            correctBtn.dataset.questionIndex = questionIndex;
            correctBtn.style.cssText = `
                padding: 6px 14px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: opacity 0.2s;
            `;

            // Incorrect button
            const incorrectBtn = document.createElement('button');
            incorrectBtn.className = 'qg-question-incorrect';
            incorrectBtn.textContent = t('qg.feedback-incorrect', window.app?.currentLanguage || 'chinese') || '✗ Incorrect';
            incorrectBtn.dataset.questionIndex = questionIndex;
            incorrectBtn.style.cssText = `
                padding: 6px 14px;
                background: #f44336;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: opacity 0.2s;
            `;

            feedbackDiv.appendChild(label);
            feedbackDiv.appendChild(correctBtn);
            feedbackDiv.appendChild(incorrectBtn);

            // Insert after the question div
            questionDiv.parentNode.insertBefore(feedbackDiv, questionDiv.nextSibling);

            questionIndex++;
            feedbackButtonsAdded++;
        }
    });

    // Log for debugging
    console.log(`Feedback buttons added for ${feedbackButtonsAdded} questions`);
}

function attachFeedbackListeners() {
    // Find all per-question feedback buttons and attach click handlers
    const correctButtons = document.querySelectorAll('.qg-question-correct');
    const incorrectButtons = document.querySelectorAll('.qg-question-incorrect');

    // Attach listeners to correct buttons
    correctButtons.forEach((btn) => {
        if (btn.hasListener) return; // Skip if already attached

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const questionIndex = parseInt(this.dataset.questionIndex || 0);
            const adjustment = recordQuestionResult(questionIndex, true);

            // Visually indicate the response - dim both buttons
            this.style.opacity = '0.6';
            this.disabled = true;
            const sibling = this.parentNode.querySelector('.qg-question-incorrect');
            if (sibling) {
                sibling.style.opacity = '0.6';
                sibling.disabled = true;
            }

            // Update meter
            updatePerformanceMeterDisplay();

            // If difficulty should auto-adjust, update it immediately
            if (adjustment.shouldAdjust) {
                const currentIndex = difficultiesLevels.indexOf(currentSessionPerformance.difficulty);
                const newIndex = difficultiesLevels.indexOf(adjustment.newDifficulty);

                currentSessionPerformance.difficulty = adjustment.newDifficulty;
                const diffLabels = {
                    'easy': t('qg.difficulty-easy', window.app?.currentLanguage || 'chinese'),
                    'intermediate': t('qg.difficulty-intermediate', window.app?.currentLanguage || 'chinese'),
                    'hard': t('qg.difficulty-hard', window.app?.currentLanguage || 'chinese'),
                    'expert': t('qg.difficulty-expert', window.app?.currentLanguage || 'chinese')
                };

                let msg;
                if (newIndex > currentIndex) {
                    msg = t('qg.difficulty-increased', window.app?.currentLanguage || 'chinese');
                } else {
                    msg = t('qg.difficulty-decreased', window.app?.currentLanguage || 'chinese');
                }

                currentSessionPerformance.lastAdjustmentMessage = msg;
                updatePerformanceMeterDisplay();
            }
        });

        btn.hasListener = true;
    });

    // Attach listeners to incorrect buttons
    incorrectButtons.forEach((btn) => {
        if (btn.hasListener) return; // Skip if already attached

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const questionIndex = parseInt(this.dataset.questionIndex || 0);
            const adjustment = recordQuestionResult(questionIndex, false);

            // Visually indicate the response - dim both buttons
            this.style.opacity = '0.6';
            this.disabled = true;
            const sibling = this.parentNode.querySelector('.qg-question-correct');
            if (sibling) {
                sibling.style.opacity = '0.6';
                sibling.disabled = true;
            }

            // Update meter
            updatePerformanceMeterDisplay();

            // If difficulty should auto-adjust, update it immediately
            if (adjustment.shouldAdjust) {
                const currentIndex = difficultiesLevels.indexOf(currentSessionPerformance.difficulty);
                const newIndex = difficultiesLevels.indexOf(adjustment.newDifficulty);

                currentSessionPerformance.difficulty = adjustment.newDifficulty;
                const diffLabels = {
                    'easy': t('qg.difficulty-easy', window.app?.currentLanguage || 'chinese'),
                    'intermediate': t('qg.difficulty-intermediate', window.app?.currentLanguage || 'chinese'),
                    'hard': t('qg.difficulty-hard', window.app?.currentLanguage || 'chinese'),
                    'expert': t('qg.difficulty-expert', window.app?.currentLanguage || 'chinese')
                };

                let msg;
                if (newIndex > currentIndex) {
                    msg = t('qg.difficulty-increased', window.app?.currentLanguage || 'chinese');
                } else {
                    msg = t('qg.difficulty-decreased', window.app?.currentLanguage || 'chinese');
                }

                currentSessionPerformance.lastAdjustmentMessage = msg;
                updatePerformanceMeterDisplay();
            }
        });

        btn.hasListener = true;
    });
}

// ActivityTracker - Tracks all user activities for progress calculation
class ActivityTracker {
    constructor() {
        this.storageKey = 'futuretech-activities';
        this.activities = [];
        this.loadActivities();
    }

    /**
     * Load activities from localStorage
     */
    loadActivities() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            this.activities = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading activities:', error);
            this.activities = [];
        }
    }

    /**
     * Save activities to localStorage
     */
    saveActivities() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.activities));
        } catch (error) {
            console.error('Error saving activities:', error);
        }
    }

    /**
     * Track a new activity
     */
    trackActivity(type, content, metadata = {}) {
        const activity = {
            id: Date.now(),
            type,
            content,
            timestamp: new Date().toISOString(),
            classifiedSubject: 'Other',
            metadata
        };

        this.activities.push(activity);
        console.log(`[ActivityTracker] Added activity, total count:`, this.activities.length);
        this.saveActivities();
        console.log(`[ActivityTracker] Saved to localStorage, activity:`, activity);
        return activity;
    }

    /**
     * Update activity's classified subject
     */
    updateActivitySubject(activityId, subject) {
        const activity = this.activities.find(a => a.id === activityId);
        if (activity) {
            activity.classifiedSubject = subject;
            this.saveActivities();
        }
    }

    /**
     * Get all activities
     */
    getActivities() {
        return this.activities;
    }

    /**
     * Clear all activities
     */
    clearActivities() {
        this.activities = [];
        this.saveActivities();
    }
}

class FutureTechApp {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isProcessing = false;
        this.currentQuestion = null;
        this.currentPage = 'question-generator';
        this.currentRecordingField = null;
        this.currentLanguage = 'english';
        this.translationService = new TranslationService();
        this.activityTracker = new ActivityTracker();
        this.currentUser = null;
        this.savedHistory = [];
        this.settings = { ...defaultSettings };
        this.currentQGContent = null;
        this.currentACContent = null;
        this.currentLPContent = null;
        this.currentChatContent = null;
        // 语音合成相关
        this.isSpeaking = false;
        this.currentUtterance = null;
        // 上传文件相关
        this.uploadedLearningPlan = null;
        this.uploadedQuestionFile = null;
        // 计划管理相关
        this.plans = [];
        this.currentPlanId = null;
        this.selectedWeekdays = [];
        this.timerRunning = false;
        this.timerPlanId = null;
        this.timerStartTime = null;
        this.timerDuration = 0;
        this.timerInterval = null;
        // User data storage (feedback, activity tracking, etc.)
        this.data = {};
        this.initElements();
        this.attachEventListeners();
        this.initPlanManager();
        this.initializeApp();
    }

    initElements() {
        this.navItems = document.querySelectorAll('.nav-item');
        this.pageTitle = document.getElementById('page-title');
        this.pageSubtitle = document.getElementById('page-subtitle');
        this.pageContents = document.querySelectorAll('.page-content');
        // Question Generator
        this.questionInput = document.getElementById('question-input');
        this.submitTextBtn = document.getElementById('submit-text-btn');
        this.responseContainer = document.getElementById('response-container');
        // Question Generator selection boxes
        this.qgGrade = document.getElementById('qg-grade');
        this.qgSubject = document.getElementById('qg-subject');
        this.qgDifficulty = document.getElementById('qg-difficulty');
        this.qgQuestionType = document.getElementById('qg-question-type');
        this.qgQuantity = document.getElementById('qg-quantity');
        this.qgIncludeAnswer = document.getElementById('qg-include-answer');
        this.answersSection = document.getElementById('answers-section');
        this.answersContainer = document.getElementById('answers-container');
        // Voice recording buttons
        this.recordQGBtn = document.getElementById('record-qg-btn');
        this.recordACStandardBtn = document.getElementById('record-ac-standard-btn');
        this.recordPlanGoalBtn = document.getElementById('record-plan-goal-btn');
        this.recordChatBtn = document.getElementById('record-chat-btn');
        this.chatFileBtn = document.getElementById('upload-chat-file-btn');
        this.chatFileInput = document.getElementById('chat-file-input');
        this.currentChatFile = null;  // Store uploaded file for chat
        // Login modal elements
        this.loginModal = document.getElementById('login-modal');
        this.userMenuBtn = document.getElementById('user-menu-btn');
        this.userDropdown = document.getElementById('user-dropdown');
        this.userDisplay = document.getElementById('user-display');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.loginTabBtn = document.getElementById('login-tab-btn');
        this.registerTabBtn = document.getElementById('register-tab-btn');
        // Save buttons
        this.saveQGBtn = document.getElementById('save-qg-btn');
        this.saveACBtn = document.getElementById('save-ac-btn');
        this.saveLPBtn = document.getElementById('save-lp-btn');
        this.saveChatBtn = document.getElementById('save-chat-btn');
        // History elements
        this.historyList = document.getElementById('history-list');
        this.historyClearBtn = document.getElementById('history-clear-btn');
        // AI Chat elements
        this.chatInput = document.getElementById('chat-input');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatSubmitBtn = document.getElementById('chat-submit-btn');
        this.chatClearBtn = document.getElementById('chat-clear-btn');
        // Chat state
        this.chatHistory = [];
        this.lastLearningTopic = null;  // Track the topic being learned for practice suggestion
        this.lastFollowUpTime = null;   // Track when we last asked a follow-up question
        this.loadChatHistory();

        // Learning Profiles
        this.learningProfiles = [];
        this.activeProfileId = 1;
        this.currentEditingProfileId = null;
        this.profileVoiceRecording = false;
        this.profileAudioChunks = [];

        // Accessibility
        this.accessibilityCheckbox = document.getElementById('accessibility-mode');
        this.accessibilityNavGroup = document.getElementById('accessibility-nav-group');
        this.accessibilityUIGroup = document.getElementById('accessibility-ui-group');
        this.accessibilityFeedbackGroup = document.getElementById('accessibility-feedback-group');
        this.navRadioButtons = document.querySelectorAll('input[name="accessibility-nav-type"]');
        this.buttonSizeSlider = document.getElementById('accessibility-button-size');
        this.buttonSpacingRadios = document.querySelectorAll('input[name="accessibility-spacing"]');
        this.keySoundCheckbox = document.getElementById('accessibility-key-sound');
        this.voiceNavCheckbox = document.getElementById('accessibility-voice-nav');
        this.errorAlertsCheckbox = document.getElementById('accessibility-error-alerts');
        this.feedbackVolumeSlider = document.getElementById('accessibility-feedback-volume');
        this.readingSpeedSlider = document.getElementById('settings-reading-speed');
        this.pageList = ['question-generator', 'answer-checker', 'learning-plan', 'ai-chat', 'plan-manager', 'progress', 'history', 'learning-settings', 'user-settings'];
    }

    attachEventListeners() {
        // Navigation items
        if (this.navItems && this.navItems.length > 0) {
            this.navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    try {
                        e.preventDefault();
                        e.stopPropagation();
                        const page = e.currentTarget.dataset.page;
                        console.log('Navigation clicked:', page);
                        if (page) {
                            this.switchPage(page);
                        }
                    } catch (error) {
                        console.error('Error in navigation click handler:', error);
                    }
                });
            });
        } else {
            console.warn('Navigation items not found');
        }

        // Question Generator - Text input submission
        if (this.submitTextBtn) {
            this.submitTextBtn.addEventListener('click', () => this.submitQuestion());
        }
        if (this.questionInput) {
            this.questionInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) {
                        // Shift+Enter: allow line break (default behavior)
                        return;
                    } else {
                        // Enter: submit
                        e.preventDefault();
                        this.submitQuestion();
                    }
                }
            });
        }

        // Question Generator - Monitor form validity
        const gradeSelect = document.getElementById('qg-grade');
        const subjectSelect = document.getElementById('qg-subject');
        const updateSubmitButtonState = () => {
            if (this.submitTextBtn) {
                const grade = gradeSelect ? gradeSelect.value : '';
                const subject = subjectSelect ? subjectSelect.value : '';
                const customDetails = this.questionInput ? this.questionInput.value.trim() : '';
                // Enable button if grade OR subject OR custom details is provided
                this.submitTextBtn.disabled = !grade && !subject && !customDetails;
            }
        };

        if (gradeSelect) {
            gradeSelect.addEventListener('change', updateSubmitButtonState);
        }
        if (subjectSelect) {
            subjectSelect.addEventListener('change', updateSubmitButtonState);
        }
        if (this.questionInput) {
            this.questionInput.addEventListener('input', updateSubmitButtonState);
        }

        // Question Generator - Include answer toggle
        if (this.qgIncludeAnswer) {
            this.qgIncludeAnswer.addEventListener('change', () => {
                if (this.answersSection) {
                    this.answersSection.style.display = this.qgIncludeAnswer.checked ? 'block' : 'none';
                }
            });
        }

        // Voice recording buttons
        if (this.recordQGBtn) {
            this.recordQGBtn.addEventListener('click', () => this.toggleRecordingForField('question-input'));
        }
        if (this.recordACStandardBtn) {
            this.recordACStandardBtn.addEventListener('click', () => this.toggleRecordingForField('answer-standard'));
        }
        if (this.recordPlanGoalBtn) {
            this.recordPlanGoalBtn.addEventListener('click', () => this.toggleRecordingForField('plan-goal'));
        }
        if (this.recordChatBtn) {
            this.recordChatBtn.addEventListener('click', () => this.toggleRecordingForField('chat-input'));
        }

        // Chat buttons - use direct ID query for better reliability
        const chatSubmitBtn = document.getElementById('chat-submit-btn');
        const chatClearBtn = document.getElementById('chat-clear-btn');
        const chatInput = document.getElementById('chat-input');

        if (chatSubmitBtn) {
            chatSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitChat();
            });
        }
        if (chatClearBtn) {
            chatClearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearChatHistory();
            });
        }

        // Chat file upload
        const uploadChatFileBtn = document.getElementById('upload-chat-file-btn');
        if (uploadChatFileBtn) {
            uploadChatFileBtn.addEventListener('click', () => {
                document.getElementById('chat-file-input').click();
            });
        }
        const chatFileInput = document.getElementById('chat-file-input');
        if (chatFileInput) {
            chatFileInput.addEventListener('change', (e) => this.handleChatFileUpload(e));
        }

        // Chat input - Enter to submit (Shift+Enter for newline)
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.submitChat();
                }
            });
        }

        // Answer Checker - Text inputs submission (Enter to submit, Shift+Enter for newline)
        const answerQuestionInput = document.getElementById('answer-question');
        const answerStudentInput = document.getElementById('answer-student');
        const answerStandardInput = document.getElementById('answer-standard');

        const setupAnswerInputHandler = (inputEl) => {
            if (inputEl) {
                inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        if (e.shiftKey) {
                            // Shift+Enter: allow line break (default behavior)
                            return;
                        } else {
                            // Enter: submit
                            e.preventDefault();
                            this.submitAnswer();
                        }
                    }
                });
            }
        };

        setupAnswerInputHandler(answerQuestionInput);
        setupAnswerInputHandler(answerStudentInput);
        setupAnswerInputHandler(answerStandardInput);

        // Learning Plan - Goal input submission (Enter to submit, Shift+Enter for newline)
        const planGoalInput = document.getElementById('plan-goal');
        if (planGoalInput) {
            planGoalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) {
                        // Shift+Enter: allow line break (default behavior for text input)
                        return;
                    } else {
                        // Enter: submit
                        e.preventDefault();
                        this.submitLearningPlan();
                    }
                }
            });
        }

        // User menu toggle
        if (this.userMenuBtn) {
            this.userMenuBtn.addEventListener('click', () => {
                this.userDropdown.classList.toggle('show');
                this.userMenuBtn.classList.toggle('active');
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                if (this.userDropdown) {
                    this.userDropdown.classList.remove('show');
                    this.userMenuBtn.classList.remove('active');
                }
            }
        });

        // Login form submission
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form submission
        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Login tab buttons
        if (this.loginTabBtn && this.registerTabBtn) {
            this.loginTabBtn.addEventListener('click', () => this.switchLoginTab('login'));
            this.registerTabBtn.addEventListener('click', () => this.switchLoginTab('register'));
        }

        // Language selector in settings
        const languageSelect = document.getElementById('settings-language');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }

        // Custom language button
        const customLanguageBtn = document.getElementById('custom-language-btn');
        if (customLanguageBtn) {
            customLanguageBtn.addEventListener('click', () => {
                this.handleCustomLanguageTranslation();
            });
        }

        // Custom language input - allow Enter key to trigger translation
        const customLanguageInput = document.getElementById('custom-language-input');
        if (customLanguageInput) {
            customLanguageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleCustomLanguageTranslation();
                }
            });
        }

        // GUI Preferences - Font Size (use arrow function to preserve 'this')
        const fontSizeSlider = document.getElementById('settings-font-size');
        if (fontSizeSlider) {
            fontSizeSlider.addEventListener('input', (e) => {
                const fontSize = e.target.value;
                const displayEl = document.getElementById('font-size-display');
                if (displayEl) {
                    displayEl.textContent = fontSize;
                }
                this.applyFontSize(parseInt(fontSize));
            });
        }

        // GUI Preferences - Dyslexia Font
        const dyslexiaFontCheckbox = document.getElementById('settings-dyslexia-font');
        if (dyslexiaFontCheckbox) {
            dyslexiaFontCheckbox.addEventListener('change', (e) => {
                this.applyDyslexiaFont(e.target.checked);
            });
        }

        // GUI Preferences - High Contrast
        const highContrastCheckbox = document.getElementById('settings-high-contrast');
        if (highContrastCheckbox) {
            highContrastCheckbox.addEventListener('change', (e) => {
                this.applyHighContrast(e.target.checked);
            });
        }

        // GUI Preferences - Line Spacing
        const lineSpacingRadios = document.querySelectorAll('input[name="line-spacing"]');
        if (lineSpacingRadios.length > 0) {
            lineSpacingRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.applyLineSpacing(e.target.value);
                });
            });
        }

        // GUI Preferences - Theme
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        if (themeRadios.length > 0) {
            themeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    this.applyTheme(e.target.value);
                });
            });
        }

        // Save buttons
        if (this.saveQGBtn) {
            this.saveQGBtn.addEventListener('click', () => this.saveContent('question-generator', this.currentQGContent));
        }
        if (this.saveACBtn) {
            this.saveACBtn.addEventListener('click', () => this.saveContent('answer-checker', this.currentACContent));
        }
        if (this.saveLPBtn) {
            this.saveLPBtn.addEventListener('click', () => this.saveContent('learning-plan', this.currentLPContent));
        }
        if (this.saveChatBtn) {
            this.saveChatBtn.addEventListener('click', () => this.saveContent('ai-chat', this.currentChatContent));
        }

        // History clear button
        if (this.historyClearBtn) {
            this.historyClearBtn.addEventListener('click', () => this.clearAllHistory());
        }

        // File upload for learning plan
        const planSyllabusFile = document.getElementById('plan-syllabus-file');
        if (planSyllabusFile) {
            planSyllabusFile.addEventListener('change', (e) => this.handleLearningPlanFileUpload(e));
        }

        // Accessibility Settings
        if (this.accessibilityCheckbox) {
            this.accessibilityCheckbox.addEventListener('change', (e) => {
                this.settings.accessibilitySettings.enabled = e.target.checked;
                this.toggleAccessibilityUI(e.target.checked);
                this.saveSettings();
                if (e.target.checked) {
                    this.initAccessibility();
                }
            });
        }

        // Navigation type radio buttons
        this.navRadioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.accessibilitySettings.navType = e.target.value;
                this.saveSettings();
            });
        });

        // Button size slider
        if (this.buttonSizeSlider) {
            this.buttonSizeSlider.addEventListener('change', (e) => {
                this.settings.accessibilitySettings.buttonSize = parseInt(e.target.value);
                this.applyButtonSizeCSS();
                this.saveSettings();
            });
        }

        // Button spacing radios
        this.buttonSpacingRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.settings.accessibilitySettings.buttonSpacing = e.target.value;
                this.applyButtonSpacingCSS();
                this.saveSettings();
            });
        });

        // Feedback checkboxes
        if (this.keySoundCheckbox) {
            this.keySoundCheckbox.addEventListener('change', (e) => {
                this.settings.accessibilitySettings.keySoundEnabled = e.target.checked;
                this.saveSettings();
            });
        }
        if (this.voiceNavCheckbox) {
            this.voiceNavCheckbox.addEventListener('change', (e) => {
                this.settings.accessibilitySettings.voiceNavEnabled = e.target.checked;
                this.saveSettings();
            });
        }
        if (this.errorAlertsCheckbox) {
            this.errorAlertsCheckbox.addEventListener('change', (e) => {
                this.settings.accessibilitySettings.errorAlertsEnabled = e.target.checked;
                this.saveSettings();
            });
        }

        // Feedback volume slider
        if (this.feedbackVolumeSlider) {
            this.feedbackVolumeSlider.addEventListener('change', (e) => {
                this.settings.accessibilitySettings.feedbackVolume = parseInt(e.target.value);
                this.saveSettings();
            });
        }

        // Set shortcut key button
    }

    /**
     * Handle learning plan file upload
     */
    async handleLearningPlanFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileNameSpan = document.getElementById('plan-file-name');
        const clearBtn = document.getElementById('plan-clear-file-btn');

        try {
            // Check file size (limit to 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('文件大小不能超过5MB');
                return;
            }

            // Handle different file types
            if (file.type.includes('text')) {
                // Text files - read content directly
                const text = await file.text();
                this.uploadedLearningPlan = {
                    fileName: file.name,
                    content: text,
                    type: 'text'
                };
                fileNameSpan.textContent = `✓ 已上传: ${file.name}`;
            } else if (file.type === 'application/pdf') {
                // PDF files - store for later extraction
                this.uploadedLearningPlan = {
                    fileName: file.name,
                    file: file,
                    type: 'pdf'
                };
                fileNameSpan.textContent = `✓ 已上传: ${file.name} (PDF - 将在生成规划时处理)`;
            } else if (file.type.includes('image')) {
                // Image files - store reference
                this.uploadedLearningPlan = {
                    fileName: file.name,
                    file: file,
                    type: 'image'
                };
                fileNameSpan.textContent = `✓ 已上传: ${file.name} (图片)`;
            } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                // Word files - store for later extraction
                this.uploadedLearningPlan = {
                    fileName: file.name,
                    file: file,
                    type: 'word'
                };
                fileNameSpan.textContent = `✓ 已上传: ${file.name} (Word文档)`;
            } else {
                alert('不支持的文件类型。请上传 txt、pdf、word 或图片文件');
                return;
            }

            clearBtn.style.display = 'inline-block';
            this.log(`✅ 文件已上传: ${file.name}`, 'success');
        } catch (error) {
            console.error('Error handling file upload:', error);
            alert(`处理文件时出错: ${error.message}`);
        }
    }

    /**
     * Clear uploaded file
     */
    clearUploadedFile(type) {
        if (type === 'plan') {
            this.uploadedLearningPlan = null;
            document.getElementById('plan-syllabus-file').value = '';
            document.getElementById('plan-file-name').textContent = '';
            document.getElementById('plan-clear-file-btn').style.display = 'none';
            this.log('✓ 已清除上传的文件', 'info');
        }
    }

    switchPage(pageName) {
        try {
            // ========== Save Session Optimal Difficulty (if switching away from Question Generator) ==========
            if (this.currentPage === 'question-generator' && currentSessionPerformance.totalQuestions >= 3) {
                const optimalKey = `${currentSessionPerformance.subject}_${currentSessionPerformance.grade}`;
                const optimal = calculateOptimalDifficulty();
                this.settings.sessionDifficultyOptimal = this.settings.sessionDifficultyOptimal || {};
                this.settings.sessionDifficultyOptimal[optimalKey] = optimal;
                this.saveSettings();
            }

            // Clear notification badge when visiting page
            this.clearNotificationBadge(pageName);

            // Update current page
            this.currentPage = pageName;

            // Update active nav item
            if (this.navItems && this.navItems.length > 0) {
                this.navItems.forEach(item => {
                    item.classList.toggle('active', item.dataset.page === pageName);
                });
            }

            // Hide all pages
            if (this.pageContents && this.pageContents.length > 0) {
                this.pageContents.forEach(content => {
                    content.classList.remove('active');
                });
            }

            // Show selected page
            const selectedPage = document.getElementById(pageName);
            if (selectedPage) {
                selectedPage.classList.add('active');
            }

            // Update header with translated text
            const pageHeaders = {
                'question-generator': {
                    title: t('header.question-generator', this.currentLanguage),
                    subtitle: t('header.question-generator-subtitle', this.currentLanguage)
                },
                'answer-checker': {
                    title: t('header.answer-checker', this.currentLanguage),
                    subtitle: t('header.answer-checker-subtitle', this.currentLanguage)
                },
                'learning-plan': {
                    title: t('header.learning-plan', this.currentLanguage),
                    subtitle: t('header.learning-plan-subtitle', this.currentLanguage)
                },
                'ai-chat': {
                    title: t('header.ai-chat', this.currentLanguage) || '💬 AI学习互动',
                    subtitle: t('header.ai-chat-subtitle', this.currentLanguage) || '与AI进行学习方面的自由讨论'
                },
                'plan-manager': {
                    title: t('header.plan-manager', this.currentLanguage) || '⏰ 学习计划',
                    subtitle: t('header.plan-manager-subtitle', this.currentLanguage) || '管理学习计划，设置定时提醒和倒计时'
                },
                'progress': {
                    title: t('header.progress', this.currentLanguage) || '📊 学习进度',
                    subtitle: t('header.progress-subtitle', this.currentLanguage) || '查看您的学习覆盖范围和进度统计'
                },
                'history': {
                    title: t('header.history', this.currentLanguage),
                    subtitle: t('header.history-subtitle', this.currentLanguage)
                },
                'learning-settings': {
                    title: t('header.learning-settings', this.currentLanguage) || '📚 学习设置',
                    subtitle: t('header.learning-settings-subtitle', this.currentLanguage) || '配置您的学习偏好'
                },
                'user-settings': {
                    title: t('header.user-settings', this.currentLanguage) || '🎨 用户设置',
                    subtitle: t('header.user-settings-subtitle', this.currentLanguage) || '自定义用户界面和显示选项'
                }
            };

            const config = pageHeaders[pageName];
            if (config) {
                if (this.pageTitle) {
                    this.pageTitle.textContent = config.title;
                }
                if (this.pageSubtitle) {
                    this.pageSubtitle.textContent = config.subtitle;
                }
            }

            // Update history display if on history page
            if (pageName === 'history') {
                try {
                    this.updateHistoryDisplay();
                } catch (e) {
                    console.error('Error updating history display:', e);
                }
            }

            // Update plan manager display if on plan-manager page
            if (pageName === 'plan-manager') {
                try {
                    this.displayPlanManager();
                } catch (e) {
                    console.error('Error updating plan manager display:', e);
                }
            }

            // Update question generator button state if on question-generator page
            if (pageName === 'question-generator') {
                try {
                    // Trigger button state update
                    const gradeSelect = document.getElementById('qg-grade');
                    const subjectSelect = document.getElementById('qg-subject');
                    if (gradeSelect) {
                        gradeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    } else if (subjectSelect) {
                        subjectSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } catch (e) {
                    console.error('Error updating QG button state:', e);
                }
            }

            // Update progress display if on progress page
            if (pageName === 'progress') {
                try {
                    this.displayProgressPage();
                } catch (e) {
                    console.error('Error updating progress display:', e);
                }
            }

            // Apply saved settings when switching to question-generator page
            if (pageName === 'question-generator') {
                try {
                    // Apply the saved grade from settings
                    if (this.qgGrade) {
                        this.qgGrade.value = this.settings.grade || '';
                    }
                    console.log('Applied saved grade setting:', this.settings.grade);
                    // Update command words section based on current exam type
                    this.updateCommandWordsSection();
                } catch (e) {
                    console.error('Error applying saved settings:', e);
                }
            }

            // Apply all saved settings when switching to settings page
            if (pageName === 'settings') {
                try {
                    // Use setTimeout to ensure DOM is fully ready
                    setTimeout(() => {
                        console.log('Applying settings to settings page, current settings:', this.settings);
                        this.applySettings();
                        console.log('Applied all settings to settings page');
                    }, 100);
                } catch (e) {
                    console.error('Error applying settings to settings page:', e);
                }
            }

            this.currentPage = pageName;

            // Apply select styles to all select elements on the new page
            try {
                this.applySelectStyles();
            } catch (e) {
                console.error('Error applying select styles:', e);
            }

            // Log page change with simple message
            try {
                this.log(`已切换到 ${config?.title || pageName}`, 'info');
            } catch (e) {
                console.log(`Switched to page: ${pageName}`);
            }

            console.log(`Navigation to page: ${pageName}`);

            // Update UI language to refresh all translations including placeholders
            this.updateUILanguage();
        } catch (error) {
            console.error('Error in switchPage:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    updateCommandWordsSection() {
        const examType = this.settings.examType;
        const commandWordsGroup = document.getElementById('command-words-group');
        const commandWordsCheckboxes = document.getElementById('command-words-checkboxes');
        const commandWordsDisabledMsg = document.getElementById('command-words-disabled-msg');

        if (!commandWordsGroup || !commandWordsCheckboxes) return; // Defensive

        if (!examType || !examCommandWords[examType]) {
            // Hide section, show message
            commandWordsGroup.style.display = 'none';
            if (commandWordsDisabledMsg) {
                commandWordsDisabledMsg.style.display = 'block';
            }
            commandWordsCheckboxes.innerHTML = '';
            return;
        }

        // Show section, hide message
        commandWordsGroup.style.display = 'block';
        if (commandWordsDisabledMsg) {
            commandWordsDisabledMsg.style.display = 'none';
        }

        // Generate checkboxes for this exam system using HTML string
        const words = getCommandWordsForExam(examType);
        let html = '';
        words.forEach(word => {
            const checkboxId = `cmd-word-${word.toLowerCase().replace(/\s+/g, '-')}`;
            html += `<label style="display: inline-block; padding: 6px 10px; margin-right: 4px; margin-bottom: 4px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 13px; background-color: #f9f9f9; transition: all 0.2s ease;">
                <input type="checkbox" value="${word}" id="${checkboxId}" style="margin-right: 4px; cursor: pointer;" class="cmd-word-checkbox">
                <span style="user-select: none;">${word}</span>
            </label>`;
        });
        commandWordsCheckboxes.innerHTML = html;

        // Add event listeners to all command word checkboxes
        const checkboxes = commandWordsCheckboxes.querySelectorAll('.cmd-word-checkbox');
        checkboxes.forEach(checkbox => {
            const label = checkbox.closest('label');

            // Set initial state
            if (checkbox.checked) {
                label.style.backgroundColor = '#D4EDDA';
                label.style.borderColor = '#4caf50';
                label.style.color = 'black';
            }

            // Add change listener
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    label.style.backgroundColor = '#D4EDDA';
                    label.style.borderColor = '#4caf50';
                    label.style.color = 'black';
                } else {
                    label.style.backgroundColor = '#f9f9f9';
                    label.style.borderColor = '#ddd';
                    label.style.color = 'black';
                }
            });
        });
    }

    async initializeApp() {
        try {
            this.log('应用正在加载...', 'info');

            // Load user from localStorage
            this.loadUser();

            // Load language preference
            this.loadLanguagePreference();

            // Load settings from localStorage
            this.loadSettings();

            // Load app data (feedback, etc.) from localStorage
            this.loadData();

            // Initialize settings event listeners
            this.initializeSettingsEventListeners();

            // Load learning profiles
            this.loadLearningProfiles();

            // Initialize answer checker events
            try {
                this.initAnswerCheckerEvents();
            } catch (e) {
                console.error('Error initializing answer checker events:', e);
            }

            // Update UI with current language
            try {
                this.updateUILanguage();
                this.updateSelectOptions();
                this.applySelectStyles();
            } catch (e) {
                console.error('Error updating UI language:', e);
            }

            // Load history
            try {
                this.loadHistory();
            } catch (e) {
                console.error('Error loading history:', e);
            }

            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                if (response.ok) {
                    const data = await response.json();
                    this.log(`应用启动完成 - AI服务：${data.services.ai_service}, 语音服务：${data.services.speech_service}`, 'success');
                    this.updateServiceStatus(data.services);
                }
            } catch (error) {
                this.log(`无法连接到后端服务：${error.message}`, 'error');
            }

            console.log('App initialization completed');
        } catch (error) {
            console.error('Critical error during app initialization:', error);
        }
    }

    updateServiceStatus(services) {
        console.log('Services status:', services);
    }

    switchTab(mode) {
        // Tab switching removed - no longer used after merging text and voice input
        // This function is kept for backward compatibility but does nothing
    }

    // ========== Question Generator Functions ==========

    async submitQuestion() {
        // Get default dropdown values
        const dropdownGrade = this.qgGrade ? this.qgGrade.value : '';
        const dropdownSubject = this.qgSubject ? this.qgSubject.value : '';
        const dropdownDifficulty = this.qgDifficulty ? this.qgDifficulty.value : 'intermediate';
        const dropdownQuestionType = this.qgQuestionType ? this.qgQuestionType.value : '';
        const dropdownQuantity = this.qgQuantity ? parseInt(this.qgQuantity.value) : 3;
        const includeAnswer = this.qgIncludeAnswer ? this.qgIncludeAnswer.checked : true;
        const customDetails = this.questionInput.value.trim();

        // Read selected command words (defensive - check if element exists)
        let selectedCommandWords = [];
        const commandWordsCheckboxes = document.querySelectorAll('#command-words-checkboxes input[type="checkbox"]:checked');
        if (commandWordsCheckboxes.length > 0) {
            selectedCommandWords = Array.from(commandWordsCheckboxes).map(cb => cb.value);
        }

        // ========== 优先从框里解析所有信息（框里的数据优先级最高）==========
        let quantity = dropdownQuantity;
        let subject = dropdownSubject;
        let difficulty = dropdownDifficulty;
        let questionType = dropdownQuestionType;
        let grade = dropdownGrade;
        let finalCustomDetails = customDetails;

        // 1. 解析框里的题目数量
        const quantityMatch = customDetails.match(/(\d+)\s*道\s*题|生成\s*(\d+)|出\s*(\d+)|共\s*(\d+)|(\d+)\s*个/);
        if (quantityMatch) {
            const extractedQty = quantityMatch[1] || quantityMatch[2] || quantityMatch[3] || quantityMatch[4] || quantityMatch[5];
            if (extractedQty) {
                quantity = parseInt(extractedQty);
                finalCustomDetails = customDetails.replace(quantityMatch[0], '').trim();
            }
        }

        // 2. 解析框里的难度信息（简单/容易/基础 vs 中等/普通 vs 困难/难/高难度）
        const difficultiesKeywords = {
            'simple|easy|容易|简单|基础|初级': 'easy',
            'intermediate|medium|中等|普通|一般': 'intermediate',
            'hard|difficult|困难|难|高难度|复杂': 'hard'
        };
        for (const [keywords, diffLevel] of Object.entries(difficultiesKeywords)) {
            const pattern = new RegExp(keywords, 'i');
            if (pattern.test(customDetails)) {
                difficulty = diffLevel;
                finalCustomDetails = finalCustomDetails.replace(pattern, '').trim();
                break;
            }
        }

        // 3. 解析框里的题型信息
        const questionTypeKeywords = {
            '多选|multi': '多选题',
            '填空|blank': '填空题',
            '简答|短答|answer': '简答题',
            '解答|步骤|solution': '解答题',
            '计算|应用': '计算应用题'
        };
        for (const [keywords, qType] of Object.entries(questionTypeKeywords)) {
            const pattern = new RegExp(keywords, 'i');
            if (pattern.test(customDetails)) {
                questionType = qType;
                finalCustomDetails = finalCustomDetails.replace(pattern, '').trim();
                break;
            }
        }

        // 4. 解析框里的学科/主题信息（需要保留这部分用于AI参考）
        const subjectKeywords = {
            '数学|math|equation|二次|因式|分解|三角|函数|微积分|几何|代数|概率|统计': '数学',
            '英文|english|grammar|写作|composition': '英文',
            '语文|chinese|文言文|古文|现代文|作文': '语文',
            '物理|physics': '物理',
            '化学|chemistry': '化学',
            '生物|biology': '生物',
            '历史|history': '历史',
            '地理|geography': '地理',
            '政治|civics|政治经济': '政治'
        };
        for (const [keywords, subj] of Object.entries(subjectKeywords)) {
            const pattern = new RegExp(keywords, 'i');
            if (pattern.test(customDetails)) {
                subject = subj;
                break;
            }
        }

        // ========== Session-Based Adaptive Difficulty Initialization ==========
        // Initialize or check session performance for adaptive difficulty
        const sessionSubject = subject || dropdownSubject || 'general';
        const sessionGrade = grade || dropdownGrade || 'general';

        // Check if this is a new subject/grade combination
        if (!currentSessionPerformance.subject ||
            currentSessionPerformance.subject !== sessionSubject ||
            currentSessionPerformance.grade !== sessionGrade) {
            // Check if we have optimal difficulty from previous sessions
            const optimalKey = `${sessionSubject}_${sessionGrade}`;
            if (this.settings.sessionDifficultyOptimal && this.settings.sessionDifficultyOptimal[optimalKey]) {
                // Start with previously discovered optimal difficulty
                initializeSessionPerformance(sessionSubject, sessionGrade, this.settings.sessionDifficultyOptimal[optimalKey]);
            } else {
                // Start with default intermediate difficulty
                initializeSessionPerformance(sessionSubject, sessionGrade, 'intermediate');
            }
        }

        // Use adaptive difficulty if session active (after first question), otherwise use dropdown
        let effectiveDifficulty = difficulty;
        if (currentSessionPerformance.totalQuestions > 0) {
            // Use adaptive difficulty after first session question
            effectiveDifficulty = currentSessionPerformance.difficulty;
        }
        // Override with adaptive difficulty for all future generations in this session
        difficulty = effectiveDifficulty;

        // Validate that at least grade or subject is selected, or custom details provided
        if (!grade && !subject && !customDetails) {
            const errorMsg = this.currentLanguage === 'chinese'
                ? '错误：请至少选择年级/学科，或输入具体要求'
                : 'Error: Please select at least a grade/subject or enter specific requirements';
            this.log(errorMsg, 'error');
            return;
        }

        if (this.isProcessing) {
            const processingMsg = this.currentLanguage === 'chinese'
                ? '正在处理中，请稍候...'
                : 'Processing, please wait...';
            this.log(processingMsg, 'warning');
            return;
        }

        this.isProcessing = true;
        this.submitTextBtn.disabled = true;

        // Build comprehensive question prompt
        // 注意：以下参数已从用户的输入框优先解析，框里提供的信息优先级最高

        // Define language-specific labels for prompts
        const langLabels = {
            'chinese': { question: '题目', answer: '答案', analysis: '解析', separator: '答案和解析' },
            'english': { question: 'Question', answer: 'Answer', analysis: 'Analysis', separator: 'Answers and Explanations' },
            'spanish': { question: 'Pregunta', answer: 'Respuesta', analysis: 'Análisis', separator: 'Respuestas y Análisis' },
            'french': { question: 'Question', answer: 'Réponse', analysis: 'Analyse', separator: 'Réponses et Analyses' },
            'german': { question: 'Frage', answer: 'Antwort', analysis: 'Analyse', separator: 'Antworten und Analysen' },
            'japanese': { question: '問題', answer: '答案', analysis: '解析', separator: '答えと説明' },
            'korean': { question: '문제', answer: '답안', analysis: '해석', separator: '답안 및 해석' },
            'portuguese': { question: 'Pergunta', answer: 'Resposta', analysis: 'Análise', separator: 'Respostas e Análises' }
        };

        const lang = this.currentLanguage || 'chinese';
        const lbl = langLabels[lang] || langLabels['chinese'];

        // Determine the language name for the prompt
        const langNames = {
            'chinese': 'Chinese',
            'english': 'English',
            'spanish': 'Spanish',
            'french': 'French',
            'german': 'German',
            'japanese': 'Japanese',
            'korean': 'Korean',
            'portuguese': 'Portuguese'
        };

        // 如果是多选题（无论何种语言），都要强调
        let question = '';
        const isMultipleChoice = questionType && (questionType.includes('多选') || questionType.includes('Multiple'));

        if (isMultipleChoice) {
            if (lang === 'chinese') {
                question = '【🔴 重要！这是多选题任务！🔴】\n\n';
                question += '⚠️  用户明确要求生成【多选题】。\n';
                question += '⚠️  多选题 = 题目 + 选项(A/B/C/D...)\n';
                question += '⚠️  没有选项的题目 = 不是多选题 = 完全错误\n';
                question += '⚠️  每一道题目都MUST有选项\n\n';
                question += '【格式示例 - 必须遵循】\n';
                question += '题目1: 一个苹果加两个苹果等于几个苹果？\n';
                question += 'A. 1个\nB. 2个\nC. 3个\nD. 4个\n\n';
                question += '【必须】每道题目后面【立即跟】选项！\n\n';
            } else {
                question = '【🔴 IMPORTANT: This is a Multiple Choice Questions task!🔴】\n\n';
                question += '⚠️  User explicitly requested Multiple Choice Questions.\n';
                question += '⚠️  Multiple Choice = Question + Options (A/B/C/D...)\n';
                question += '⚠️  Questions without options are WRONG - they are not multiple choice!\n';
                question += '⚠️  EVERY question MUST have options\n\n';
                question += '【Format Example - MUST follow】\n';
                question += 'Question 1: How many apples is one apple plus two apples?\n';
                question += 'A. 1\nB. 2\nC. 3\nD. 4\n\n';
                question += '【REQUIRED】Each question must be immediately followed by its options!\n\n';
            }
        }

        question += lang === 'chinese'
            ? '请生成一份学习题目，要求如下：\n\n'
            : `Please generate a set of study questions. The user's language is ${langNames[lang]}. Use labels in ${langNames[lang]}: "${lbl.question}", "${lbl.answer}", "${lbl.analysis}". Requirements:\n\n`;

        question += lang === 'chinese'
            ? '【用户的最终需求】（框里提供的信息优先级最高，如有冲突请以框里信息为准）\n'
            : '';

        if (grade) question += lang === 'chinese'
            ? `年级水平：${grade}\n`
            : `Grade level: ${grade}\n`;
        if (subject) question += lang === 'chinese'
            ? `学科：${subject}\n`
            : `Subject: ${subject}\n`;
        question += lang === 'chinese'
            ? `难度：${difficulty}\n`
            : `Difficulty: ${difficulty}\n`;
        if (questionType) question += lang === 'chinese'
            ? `题型：${questionType}\n`
            : `Question type: ${questionType}\n`;
        question += lang === 'chinese'
            ? `题目数量：${quantity}道\n\n`
            : `Number of questions: ${quantity}\n\n`;

        if (includeAnswer) {
            // 添加对题型的特殊说明（仅中文，且要在最前面）
            if (lang === 'chinese' && questionType) {
                if (questionType.includes('多选')) {
                    question += '【重要提示 - 多选题必须有选项】\n';
                    question += '您选择的题型是【多选题】，这意味着每一道题目都MUST包含选项A、B、C、D等。\n';
                    question += '如果不包含选项，就不是多选题，而是问答题，这不符合要求。\n';
                    question += '所以每道题目的格式必须如下：\n';
                    question += '题目1: [题目内容]\n';
                    question += 'A. [选项A内容]\n';
                    question += 'B. [选项B内容]\n';
                    question += 'C. [选项C内容]\n';
                    question += 'D. [选项D内容]\n';
                    question += '（可以是4个选项、5个选项或更多，但必须有多个选项）\n\n';
                }
            }

            question += lang === 'chinese'
                ? '生成步骤（必须按此顺序）：\n'
                : 'Steps (must be in this order):\n';

            // 针对多选题的特殊生成步骤
            if (lang === 'chinese' && questionType && questionType.includes('多选')) {
                question += '1. 生成题目时【必须立即紧跟选项】：\n';
                question += '   题目1: [题目内容]\n';
                question += '   A. [选项A]\n';
                question += '   B. [选项B]\n';
                question += '   C. [选项C]\n';
                question += '   D. [选项D]\n';
                question += '   （每道题目后面【必须】有选项，绝对不能只有题干！）\n';
                question += '   然后换行生成下一道题目：\n';
                question += '   题目2: [题目内容]\n';
                question += '   A. [选项A]\n';
                question += '   ...\n\n';
            } else {
                question += lang === 'chinese'
                    ? `1. 首先生成所有题目，每个题目用格式 "${lbl.question}1: [内容]" "${lbl.question}2: [内容]" 等\n`
                    : `1. First generate all questions using format "${lbl.question} 1: [content]" "${lbl.question} 2: [content]" etc\n`;
            }
            if (lang === 'chinese' && questionType && questionType.includes('多选')) {
                question += `2. 【多选题特殊要求】完成所有题目和选项后，添加分隔符：\n\n===== ${lbl.separator} =====\n\n`;
                question += '   【强制】上述所有题目都必须包含选项！缺少选项的题目是不完整的，不符合多选题要求！\n\n';
            } else {
                question += lang === 'chinese'
                    ? `2. 生成完所有题目后，添加分隔符：\n\n===== ${lbl.separator} =====\n\n`
                    : `2. After all questions, add separator: ===== ${lbl.separator} =====\n\n`;
            }
            question += lang === 'chinese'
                ? `3. 然后为每个题目生成答案和解析，格式为：\n   "${lbl.answer}1: [答案内容]\n${lbl.analysis}1: [详细解析]"\n\n`
                : `3. Then generate answers and explanations for each question in format: "${lbl.answer} 1: [content]\n${lbl.analysis} 1: [detailed explanation]"\n\n`;
            if (lang === 'chinese') {
                question += '【格式要求 - 非常重要】\n';
                question += '- 严格按顺序生成：先所有题目，后所有答案\n';
                question += '- 不要在题目部分出现答案\n';
                question += `- 答案和解析部分必须用"===== ${lbl.separator} ====="作为清晰的分隔符\n`;
                if (questionType && questionType.includes('多选')) {
                    question += '- 【多选题强制要求】每道题目下面都必须有选项A、B、C、D或更多，每个选项一行\n';
                    question += '  例如：\n';
                    question += '  题目1: 1+1等于几?\n';
                    question += '  A. 1\n';
                    question += '  B. 2\n';
                    question += '  C. 3\n';
                    question += '  D. 4\n';
                    question += '  绝对不能跳过选项，不能只有题干没有选项！\n';
                }
                question += '- 移除所有Markdown符号（如#、**、*等），使用纯文本\n';
                question += '- 【禁止】不要使用 \\\\begin{align}、\\\\begin{equation}、\\\\begin{}等复杂LaTeX环境\n';
                question += '- 【最重要】任何包含数学内容的句子或表达式，从头到尾都必须用一对 $...$ 包裹\n';
                question += '  - 正确：$x1 = 2, x2 = 3$ （整个答案都在 $...$ 内）\n';
                question += '  - 错误：\\\\begin{align}x=2\\\\end{align} （不要用这种复杂环境）\n';
                question += '  - 正确：$x^2 - 3x + 2 = 0$ （简单格式）\n';
            } else {
                question += 'Format requirements (VERY IMPORTANT):\n';
                question += '- Strict order: all questions first, then all answers\n';
                question += '- Do not show answers in the question section\n';
                question += `- Use "===== ${lbl.separator} =====" as clear separator\n`;
                question += '- Remove all Markdown symbols (#, **, *, etc), use plain text\n';
                question += '- FORBIDDEN: Do not use \\\\begin{align}, \\\\begin{equation}, \\\\begin{} and other complex LaTeX\n';
                question += '- MOST IMPORTANT: All math expressions must be wrapped with $...$\n';
                question += '  - Correct: $x = 2$ (entire equation in $...$)\n';
                question += '  - Wrong: x = 2 (missing $)\n';
                question += '  - Wrong: \\\\begin{equation}x=2\\\\end{equation} (forbidden complex LaTeX)\n';
            }
        } else {
            if (lang === 'chinese') {
                if (questionType && questionType.includes('多选')) {
                    question += `只需要：生成多选题，格式为：\n`;
                    question += `"${lbl.question}1: [题目内容]"\n`;
                    question += `A. [选项A内容]\n`;
                    question += `B. [选项B内容]\n`;
                    question += `C. [选项C内容]\n`;
                    question += `D. [选项D内容]\n`;
                    question += `然后"${lbl.question}2: [题目内容]" 和它的选项...\n\n`;
                    question += '【多选题强制说明】每道题目【必须】包含选项，没有选项就不是多选题！\n\n';
                } else {
                    question += `只需要：生成题目，格式为 "${lbl.question}1: [内容]" "${lbl.question}2: [内容]" 等\n`;
                }
                question += '【格式要求 - 非常重要】\n';
                question += '- 移除所有Markdown符号，使用纯文本\n';
                question += '- 【禁止】不要使用 \\\\begin{align}、\\\\begin{equation}、\\\\begin{}等复杂LaTeX环境\n';
                question += '- 【最重要】任何包含数学内容的句子或表达式，从头到尾都必须用一对 $...$ 包裹\n';
                question += '  - 正确：$x^2 - 3x + 2 = 0$ （整个方程在 $...$ 内）\n';
                question += '  - 错误：x^2 - 3x + 2 = 0 （没有 $）\n';
                question += '  - 错误：\\\\begin{equation}x=2\\\\end{equation} （禁止这种复杂环境）\n';
            } else {
                question += `Only generate questions using format: "${lbl.question} 1: [content]" "${lbl.question} 2: [content]" etc\n`;
                question += 'Format requirements (VERY IMPORTANT):\n';
                question += '- Remove all Markdown symbols, use plain text\n';
                question += '- FORBIDDEN: Do not use \\\\begin{align}, \\\\begin{equation}, \\\\begin{} and other complex LaTeX\n';
                question += '- MOST IMPORTANT: All math expressions must be wrapped with $...$\n';
                question += '  - Correct: $x^2 - 3x + 2 = 0$ (entire equation in $...$)\n';
                question += '  - Wrong: x^2 - 3x + 2 = 0 (missing $)\n';
            }
        }

        if (finalCustomDetails) question += `特殊要求：${finalCustomDetails}\n`;

        // Add command words requirement to prompt if selected
        if (selectedCommandWords && selectedCommandWords.length > 0) {
            if (lang === 'chinese') {
                question += `\n【重要】学生能力要求强制：\n`;
                question += `生成的【每一道题目】都必须明确要求学生使用以下能力之一：${selectedCommandWords.join('、')}。\n`;
                question += `【格式示例】\n`;
                question += `题目1：[题目内容]\n`;
                question += `此题要求学生【${selectedCommandWords[0]}】：[具体说明]\n\n`;
            } else {
                question += `\n[IMPORTANT] Command Words Requirement:\n`;
                question += `EVERY question must explicitly require students to use at least ONE of these skills: ${selectedCommandWords.join(', ')}.\n`;
                question += `Example format:\n`;
                question += `Question 1: [content]\n`;
                question += `This question requires students to [${selectedCommandWords[0]}]: [specific instruction]\n\n`;
            }
        }

        // Add student feedback context if available
        if (subject) {
            const feedbackContext = this.getFeedbackContext(subject);
            if (feedbackContext) {
                question += feedbackContext;
            }
        }

        // Add active profile's custom requirements and learning style if available
        const activeProfile = this.getActiveProfile();
        if (activeProfile && activeProfile.customRequirements) {
            question += `\n[用户学习要求]：${activeProfile.customRequirements}\n`;
        }

        // Add personalized learning style description if available
        if (this.settings && this.settings.learningStyleDescription) {
            question += `\n[个性化学习风格]：${this.settings.learningStyleDescription}\n`;
        }

        this.currentQuestion = question;

        const logMsg = lang === 'chinese'
            ? `📤 生成题目：${subject || '通用'} - ${difficulty} - ${quantity}道`
            : `📤 Generating questions: ${subject || 'General'} - ${difficulty} - ${quantity} questions`;
        this.log(logMsg, 'info');

        const generatingMsg = lang === 'chinese'
            ? '⏳ 正在生成题目，请稍候...'
            : '⏳ Generating questions, please wait...';
        this.displayResponse(generatingMsg);

        // Clear answers section initially
        if (this.answersContainer) {
            const generatingAnswerMsg = lang === 'chinese'
                ? '⏳ 正在生成...'
                : '⏳ Generating...';
            this.answersContainer.innerHTML = `<p class="placeholder">${generatingAnswerMsg}</p>`;
        }

        try {
            // Add timeout protection
            const timeoutMsg = lang === 'chinese'
                ? '生成超时（超过100秒），请检查网络连接后重试'
                : 'Generation timeout (over 100 seconds), please check your network connection and try again';
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(timeoutMsg)), 100000)
            );

            const fetchPromise = fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question,
                    language: this.currentLanguage  // 发送用户的首选语言
                })
            }).then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `HTTP error! status: ${response.status}`);
                    });
                }
                return response.json();
            });

            const data = await Promise.race([fetchPromise, timeoutPromise]);

            // Split response into questions and answers if includeAnswer is checked
            let questionsContent = data.content;
            let answersContent = '';
            let separatorMatch = null;

            if (includeAnswer) {
                // Try to separate questions and answers based on the clear separator
                // Support multiple languages: Chinese, English, Spanish, French, German, Japanese, Korean, Portuguese
                const separators = [
                    /={5,}\s*答案和解析\s*={5,}/,  // Chinese
                    /={5,}\s*Answers and Explanations\s*={5,}/i,  // English
                    /={5,}\s*Respuestas y Análisis\s*={5,}/i,  // Spanish
                    /={5,}\s*Réponses et Analyses\s*={5,}/i,  // French
                    /={5,}\s*Antworten und Analysen\s*={5,}/i,  // German
                    /={5,}\s*答えと説明\s*={5,}/,  // Japanese
                    /={5,}\s*답안 및 해석\s*={5,}/,  // Korean
                    /={5,}\s*Respostas e Análises\s*={5,}/i  // Portuguese
                ];
                for (const sep of separators) {
                    separatorMatch = data.content.match(sep);
                    if (separatorMatch) break;
                }

                if (separatorMatch) {
                    questionsContent = data.content.substring(0, separatorMatch.index).trim();
                    answersContent = data.content.substring(separatorMatch.index + separatorMatch[0].length).trim();
                } else {
                    // Fallback: Try to split based on answer patterns if separator not found
                    // Look for Answer 1: or 答案1: or similar patterns
                    const answerPatterns = [
                        /\n(?:Answer|答案|Respuesta|Réponse|Antwort|答え|답안)\s+1\s*[:：]/i
                    ];

                    for (const pattern of answerPatterns) {
                        const match = data.content.match(pattern);
                        if (match) {
                            questionsContent = data.content.substring(0, match.index).trim();
                            answersContent = data.content.substring(match.index).trim();
                            console.log('Content split using fallback answer pattern');
                            break;
                        }
                    }
                }
            }

            // Display questions
            this.displayResponse(questionsContent, data);

            // Update performance meter and inject feedback buttons
            setTimeout(() => {
                updatePerformanceMeterDisplay();
                injectFeedbackButtons();
                attachFeedbackListeners();
            }, 200); // After MathJax rendering

            // Log if separator wasn't found (debugging)
            if (!separatorMatch && answersContent === '') {
                console.warn('Warning: Content separator not found. Questions and answers may be mixed.');
            }

            // Show read aloud button for questions
            const speakQGBtn = document.getElementById('speak-qg-btn');
            const stopQGBtn = document.getElementById('stop-qg-btn');
            if (speakQGBtn) speakQGBtn.style.display = 'inline-block';
            if (stopQGBtn) stopQGBtn.style.display = 'inline-block';

            // Display answers if included
            if (includeAnswer && this.answersContainer) {
                // Clean up complex LaTeX first
                let cleanedAnswers = this.cleanupComplexLatex(answersContent);

                // Apply same preprocessing as questions to ensure proper line breaks
                // Separate next Answer/Analysis label from previous content
                cleanedAnswers = cleanedAnswers.replace(/([^\n])((?:Answer|答案|Respuesta|Réponse|Antwort|答え|답안|Resposta)\s+\d+\s*[:：])/g, '$1\n\n$2');
                cleanedAnswers = cleanedAnswers.replace(/([^\n])((?:Analysis|解析|分析|Análisis|Analyse|Analyse|Analyse|解説|해석|Análise)\s+\d+\s*[:：])/g, '$1\n\n$2');

                // Auto-wrap math expressions
                let wrappedAnswers = this.wrapUnmatchedMath(cleanedAnswers);
                // Use formatQuestionsWithColors to match question display with proper spacing and colors
                const formattedAnswers = this.formatQuestionsWithColors(wrappedAnswers);
                this.answersContainer.innerHTML = formattedAnswers;

                // Wrap sentences for reading highlight
                this.wrapSentencesInElement(this.answersContainer);

                // Render LaTeX formulas with MathJax
                if (window.MathJax) {
                    setTimeout(() => {
                        window.MathJax.typesetPromise([this.answersContainer]).catch(err => {
                            console.log('MathJax rendering error:', err);
                        });
                    }, 100);
                }

                // Show read aloud button for answers
                const speakAnswersBtn = document.getElementById('speak-answers-btn');
                const stopAnswersBtn = document.getElementById('stop-answers-btn');
                if (speakAnswersBtn) speakAnswersBtn.style.display = 'inline-block';
                if (stopAnswersBtn) stopAnswersBtn.style.display = 'inline-block';
            }

            this.log('✅ 题目已生成', 'success');

            // Show notification
            this.showPageNotification('question-generator', this.currentLanguage === 'chinese' ? `✅ 成功生成${quantity}道题目` : `✅ Successfully generated ${quantity} questions`);

            // Store current content for saving
            this.currentQGContent = {
                question: question,
                answer: questionsContent,
                answers: answersContent,
                grade: grade,
                subject: subject,
                difficulty: difficulty,
                questionType: questionType,
                quantity: quantity,
                includeAnswer: includeAnswer
            };

            // Track activity for progress
            await this.onQuestionGenerated(grade, subject, difficulty, questionType, quantity, questionsContent);

            // Show save button
            if (this.saveQGBtn) this.saveQGBtn.style.display = 'block';

            // Auto-clear input on success
            this.questionInput.value = '';

        } catch (error) {
            const langErr = this.currentLanguage === 'chinese' ? '错误' : 'Error';
            this.log(`❌ ${langErr}：${error.message}`, 'error');
            const displayMsg = this.currentLanguage === 'chinese' ? '出错' : 'Error';
            this.displayResponse(`${displayMsg}：${error.message}`);
        } finally {
            this.isProcessing = false;
            this.submitTextBtn.disabled = false;
        }
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            await this.stopRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                await this.processAudio();
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordBtn.textContent = '🛑 停止录音';
            this.recordBtn.classList.add('recording');
            this.recordStatus.textContent = '正在录音...';
            this.log('🎤 开始录音（按Alt+Space或点击按钮停止）', 'info');

        } catch (error) {
            this.log(`❌ 录音权限错误：${error.message}`, 'error');
            this.recordStatus.textContent = `权限被拒：${error.message}`;
        }
    }

    async stopRecording() {
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.recordBtn.textContent = '🎤 开始录音';
            this.recordBtn.classList.remove('recording');
            this.recordStatus.textContent = '正在处理音频...';
            this.log('⏹️ 已停止录音，正在识别...', 'info');
        }
    }

    async processAudio() {
        if (this.audioChunks.length === 0) {
            this.log('⚠️ 未检测到音频数据', 'warning');
            this.recordStatus.textContent = '未检测到音频，请重新录音';
            return;
        }

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        // 【重要】添加语言参数以提高识别准确度到90%
        formData.append('language', this.currentLanguage || 'english');

        this.recordStatus.textContent = '正在识别语音...';

        try {
            const response = await fetch(`${API_BASE_URL}/speech/recognize`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            this.questionInput.value = data.text;
            this.recordStatus.textContent = `✅ 识别完成：${data.text}`;
            this.log(`🔤 语音识别结果：${data.text}`, 'success');

            // Auto-submit after recognition
            setTimeout(() => {
                this.submitQuestion();
            }, 500);

        } catch (error) {
            this.log(`❌ 语音处理错误：${error.message}`, 'error');
            this.recordStatus.textContent = `错误：${error.message}`;
        }
    }

    cleanupComplexLatex(content) {
        /**
         * Convert complex LaTeX environments to simple format
         * Remove markdown symbols, LaTeX environments, and alignment issues
         */
        if (!content) return content;

        // Convert $$ ... $$ (display mode) to $ ... $ (inline)
        content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
            return `$${inner}$`;
        });

        // Remove \begin{...} and \end{...} tags but keep content
        content = content.replace(/\\begin\{[^\}]*\}/g, '');
        content = content.replace(/\\end\{[^\}]*\}/g, '');

        // Remove LaTeX alignment ampersands (&) that are left from alignment environments
        // Replace "&" with empty string, and clean up extra spaces
        content = content.replace(/\s*&\s*/g, ' ');
        // Clean up multiple spaces that may result from removing &
        content = content.replace(/\s{2,}/g, ' ');

        // 【Remove unnecessary markdown symbols】
        // Remove markdown bold (**text**)
        content = content.replace(/\*\*([^*]+)\*\*/g, '$1');
        // Remove markdown headers (#, ##, ###, ####)
        content = content.replace(/^#+\s+/gm, '');
        // Remove markdown list bullets (- at start of line)
        content = content.replace(/^[-*]\s+/gm, '');
        // Remove remaining single asterisks that are not in math mode (regex lookbehind/lookahead for $)
        // Safe removal: only remove asterisks not surrounded by $
        content = content.split(/(\$[^$]*\$)/).map((part, i) => {
            // Odd indices are math content ($...$), keep as-is
            if (i % 2 === 1) return part;
            // Even indices are regular text, remove asterisks
            return part.replace(/\*/g, '');
        }).join('');

        return content;
    }

    formatAnswerCheckerResponse(content, lang = 'chinese') {
        /**
         * Format Answer Checker response into three clean sections
         * Uses EXACT same equation handling as formatQuestionsWithColors
         * 1. Question: (blue)
         * 2. Justification: (red)
         * 3. Detailed Explanation: (gray)
         */
        if (!content) return content;

        const colors = {
            question: '#003DA5',      // Deep blue
            justification: '#C41E3A', // Deep red
            explanation: '#666666'    // Gray
        };

        const titles = lang === 'chinese' ? {
            question: '题目',
            justification: '答案论证',
            explanation: '详细解析'
        } : {
            question: 'Question',
            justification: 'Justification',
            explanation: 'Detailed Explanation'
        };

        // 【重要】Helper: escape content while preserving math - SAME as formatQuestionsWithColors
        const escapeContentWithLatex = (text) => {
            if (!text) return '';
            const parts = text.split(/(\$[\s\S]*?\$)/);
            return parts.map((part, idx) => {
                if (idx % 2 === 0) {
                    // Regular text: escape and convert newlines
                    let escaped = this.escapeHtml(part);
                    return escaped.replace(/\n/g, '<br>');
                } else {
                    // Math: don't escape, MathJax handles it
                    return part.replace(/\n/g, '<br>');
                }
            }).join('');
        };

        // 【简单可靠的方法】Split content by section headers
        let questionContent = '';
        let justificationContent = '';
        let explanationContent = '';

        // Split by section headers (more lenient matching)
        // Look for section headers anywhere, not just at line start
        const questionRegex = lang === 'chinese'
            ? /(题目|问题)[\s:：]*([\s\S]*?)(?=答案论证|答案|Justification|解析|详细解析|$)/i
            : /(Question|题目)[\s:：]*([\s\S]*?)(?=Justification|答案论证|Explanation|解析|$)/i;

        const justRegex = lang === 'chinese'
            ? /(?:答案论证|答案)[\s:：]*([\s\S]*?)(?=详细解析|解析|Explanation|$)/i
            : /(?:Justification|Answer)[\s:：]*([\s\S]*?)(?=Explanation|详细解析|$)/i;

        const explainRegex = lang === 'chinese'
            ? /(?:详细解析|解析)[\s:：]*([\s\S]*?)$/i
            : /(?:Detailed Explanation|Explanation)[\s:：]*([\s\S]*?)$/i;

        let qMatch = content.match(questionRegex);
        if (qMatch) questionContent = qMatch[2] ? qMatch[2].trim() : '';

        let jMatch = content.match(justRegex);
        if (jMatch) justificationContent = jMatch[1] ? jMatch[1].trim() : '';

        let eMatch = content.match(explainRegex);
        if (eMatch) explanationContent = eMatch[1] ? eMatch[1].trim() : '';

        // Fallback: if extraction failed, try to use entire content
        if (!questionContent && !justificationContent && !explanationContent) {
            questionContent = content;
        }

        let html = '';

        // Build sections with proper equation handling
        const renderSection = (sectionContent, color, title) => {
            if (!sectionContent) return '';
            // Apply equation wrapping FIRST
            let wrapped = this.wrapUnmatchedMath(sectionContent);
            // Then escape while preserving math
            let escaped = escapeContentWithLatex(wrapped);
            return `<div style="margin-bottom: 20px;">
                <div style="color: ${color}; font-weight: bold; font-size: 1.05em; margin-bottom: 8px;">${title}:</div>
                <div style="color: #333; line-height: 1.8; margin-left: 20px;">${escaped}</div>
            </div>`;
        };

        if (questionContent) {
            html += renderSection(questionContent, colors.question, titles.question);
        }
        if (justificationContent) {
            html += renderSection(justificationContent, colors.justification, titles.justification);
        }
        if (explanationContent) {
            html += renderSection(explanationContent, colors.explanation, titles.explanation);
        }

        return html || `<div style="color: #333; line-height: 1.8;">${escapeContentWithLatex(this.wrapUnmatchedMath(content))}</div>`;
    }

    formatQuestionsWithColors(content) {
        /**
         * Format questions and answers with colors
         * Support multiple languages: Chinese, English, Spanish, French, German, Japanese, Korean, Portuguese
         * 题目N: / Question N: → deep blue
         * 答案N: / Answer N: → deep red
         * 解析N: / Analysis N: → gray
         * Note: Content should be cleaned of complex LaTeX before calling this function
         */
        if (!content) return content;

        // Minimal cleanup: only remove obvious artifacts
        // Remove lines that are just $ symbols
        content = content.replace(/^\s*\$\s*$/gm, '');
        // Remove isolated $ between lines
        content = content.replace(/\n\s*\$\s*\n/g, '\n');

        // Define language-specific labels with variants
        const labels = {
            'chinese': {
                questions: ['题目', '问题'],  // Support both variants
                answers: ['答案'],
                analyses: ['分析', '解析']  // Support both variants
            },
            'english': {
                questions: ['Question'],
                answers: ['Answer'],
                analyses: ['Analysis']
            },
            'spanish': {
                questions: ['Pregunta'],
                answers: ['Respuesta'],
                analyses: ['Análisis']
            },
            'french': {
                questions: ['Question'],
                answers: ['Réponse'],
                analyses: ['Analyse']
            },
            'german': {
                questions: ['Frage'],
                answers: ['Antwort'],
                analyses: ['Analyse']
            },
            'japanese': {
                questions: ['問題'],
                answers: ['答案'],
                analyses: ['解析']
            },
            'korean': {
                questions: ['문제'],
                answers: ['답안'],
                analyses: ['해석']
            },
            'portuguese': {
                questions: ['Pergunta'],
                answers: ['Resposta'],
                analyses: ['Análise']
            }
        };

        const lang = this.currentLanguage || 'chinese';
        const currentLabels = labels[lang] || labels['chinese'];

        // Helper function to safely escape content that may contain LaTeX
        const escapeContentWithLatex = (text) => {
            if (!text) return '';

            // Split by $ delimiters to preserve LaTeX expressions
            // Use a more robust pattern that handles multiline and special characters
            const parts = text.split(/(\$[\s\S]*?\$)/);

            return parts.map((part, idx) => {
                // Even indices are non-LaTeX text, odd indices are LaTeX
                if (idx % 2 === 0) {
                    // Non-LaTeX text - escape HTML entities
                    return this.escapeHtml(part);
                } else {
                    // LaTeX content - don't escape, MathJax will handle it
                    return part;
                }
            }).join('');
        };

        // Split by lines and process
        const lines = content.split('\n');
        let result = '';
        let lastLineType = null; // Track the type of last line processed

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip completely empty lines but keep structure
            if (!line) {
                continue;
            }

            // Create regex patterns for current language's labels (support all variants)
            // Updated to handle optional numbers and colons
            const questionPattern = new RegExp(`^(${currentLabels.questions.join('|')})\\s*(\\d+)\\s*[:：]\\s*(.*)$`);
            const answerPattern = new RegExp(`^(${currentLabels.answers.join('|')})\\s*(\\d*)\\s*[:：]\\s*(.*)$`);
            const analysisPattern = new RegExp(`^(${currentLabels.analyses.join('|')})\\s*(\\d*)\\s*[:：]\\s*(.*)$`);

            // Handle Question pattern - color blue
            const questionMatch = line.match(questionPattern);
            if (questionMatch) {
                const [, label, num, contentPart] = questionMatch;
                // Add spacing before question - always add space between different items
                if (lastLineType !== null) {
                    // Add more space when transitioning to question from other types
                    result += '<div style="height: 18px;"></div>';
                }
                result += `<div style="margin-bottom: 8px; line-height: 1.8; color: #333;">
                    <span style="color: #003DA5; font-weight: bold; font-size: 1.05em;">${this.escapeHtml(label)} ${num}:</span><span style="color: #333;"> ${escapeContentWithLatex(contentPart.trim())}</span>
                </div>`;
                lastLineType = 'question';
                continue;
            }

            // Handle Answer pattern - color red
            const answerMatch = line.match(answerPattern);
            if (answerMatch) {
                const [, label, num, contentPart] = answerMatch;
                // Add spacing before answer - always add space between different items
                if (lastLineType !== null) {
                    result += '<div style="height: 14px;"></div>';
                }
                result += `<div style="margin-bottom: 8px; margin-left: 20px; line-height: 1.8; color: #333;">
                    <span style="color: #C41E3A; font-weight: bold; font-size: 1.05em;">${this.escapeHtml(label)} ${num}:</span><span style="color: #333;"> ${escapeContentWithLatex(contentPart.trim())}</span>
                </div>`;
                lastLineType = 'answer';
                continue;
            }

            // Handle Analysis pattern - color gray
            const analysisMatch = line.match(analysisPattern);
            if (analysisMatch) {
                const [, label, num, contentPart] = analysisMatch;
                // Add spacing before analysis
                if (lastLineType !== null) {
                    result += '<div style="height: 14px;"></div>';
                }
                result += `<div style="margin-bottom: 8px; margin-left: 20px; line-height: 1.8; color: #333;">
                    <span style="color: #999; font-weight: bold; font-size: 1.05em;">${this.escapeHtml(label)} ${num}:</span><span style="color: #333;"> ${escapeContentWithLatex(contentPart.trim())}</span>
                </div>`;
                lastLineType = 'analysis';
                continue;
            }

            // Regular content lines (continuation of previous content)
            let style = 'margin-bottom: 6px; line-height: 1.8; color: #333;';
            if (lastLineType === 'answer' || lastLineType === 'analysis') {
                style += ' margin-left: 20px;';
            }
            result += `<div style="${style}">${escapeContentWithLatex(line)}</div>`;
            // Keep lastLineType unchanged for continuation lines - don't reset it
        }

        return result;
    }

    /**
     * Escape HTML special characters
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    displayResponse(content, metadata = null) {
        // Clean up complex LaTeX first
        let cleanedContent = this.cleanupComplexLatex(content);

        // CRITICAL FIX 1: Separate next Question title from any content on same line
        // Pattern: "D. 3/4 Question 2:" → "D. 3/4\n\nQuestion 2:"
        // Pattern: "D. x = 10 Question 3:" → "D. x = 10\n\nQuestion 3:"
        // This handles all cases where a question title appears without a preceding newline
        cleanedContent = cleanedContent.replace(/([^\n])\s+((?:Question|题目|Pregunta|Frage|問題|문제|Pergunta)\s+\d+\s*[:：])/g, '$1\n\n$2');

        // Ensure proper spacing for MCQ questions (add blank line before each "Question X:" or "题目X:" that follows options on new lines)
        cleanedContent = cleanedContent.replace(/^([A-D]\..*?)(\n(?:Question|题目|Pregunta|Frage|問題|문제|Pergunta)\s+\d+)/gm, '$1\n\n$2');
        cleanedContent = cleanedContent.replace(/^([A-Z]\..*?)(\n(?:Question|题目|Pregunta|Frage|問題|문제|Pergunta)\s+\d+)/gm, '$1\n\n$2');

        // CRITICAL FIX 2: Ensure Answer and Analysis labels always start on new lines
        // This fixes cases where AI generates "Answer 2: contentAnalysis 2:" without line breaks
        // Support all languages: English (Answer, Analysis), Chinese (答案, 解析), Spanish, French, German, Japanese, Korean, Portuguese
        cleanedContent = cleanedContent.replace(/([^\n])((?:Answer|答案|Respuesta|Réponse|Antwort|答え|답안|Resposta)\s+\d+\s*[:：])/g, '$1\n$2');
        cleanedContent = cleanedContent.replace(/([^\n])((?:Analysis|解析|分析|Análisis|Analyse|Analyse|Analyse|解説|해석|Análise)\s+\d+\s*[:：])/g, '$1\n$2');

        // Auto-wrap any math expressions that AI didn't wrap (before formatting)
        let wrappedContent = this.wrapUnmatchedMath(cleanedContent);

        // Format the content with question colors and styling
        let html = this.formatQuestionsWithColors(wrappedContent);

        if (metadata) {
            if (metadata.timestamp) {
                const time = new Date(metadata.timestamp).toLocaleTimeString();
                html += `<p style="font-size: 0.85em; color: #999; margin-top: 10px;">📝 ${time}</p>`;
            }
            if (metadata.usage) {
                html += `<p style="font-size: 0.85em; color: #999;">🔢 Token使用：${metadata.usage.prompt_tokens || 0} → ${metadata.usage.completion_tokens || 0}</p>`;
            }
        }

        this.responseContainer.innerHTML = html;

        // Wrap sentences for reading highlight
        this.wrapSentencesInElement(this.responseContainer);

        // Render LaTeX formulas with MathJax
        if (window.MathJax) {
            setTimeout(() => {
                window.MathJax.typesetPromise([this.responseContainer]).catch(err => {
                    console.log('MathJax rendering error:', err);
                });
            }, 100);
        }

        // Save content for later saving
        this.currentQGContent = {
            question: this.currentQuestion,
            answer: content,
            timestamp: new Date().toISOString()
        };

        // Show save button
        if (this.saveQGBtn) {
            this.saveQGBtn.style.display = 'block';
        }
    }

    // ========== Answer Checker Functions ==========

    initAnswerCheckerEvents() {
        // Question voice recording
        const recordQuestionBtn = document.getElementById('record-question-btn');
        if (recordQuestionBtn) {
            recordQuestionBtn.addEventListener('click', () => this.toggleRecordingForField('question'));
        }

        // Answer voice recording
        const recordAnswerBtn = document.getElementById('record-answer-btn');
        if (recordAnswerBtn) {
            recordAnswerBtn.addEventListener('click', () => this.toggleRecordingForField('answer'));
        }

        // Question file upload
        const uploadQuestionBtn = document.getElementById('upload-question-btn');
        if (uploadQuestionBtn) {
            uploadQuestionBtn.addEventListener('click', () => {
                document.getElementById('question-file-input').click();
            });
        }
        const questionFileInput = document.getElementById('question-file-input');
        if (questionFileInput) {
            questionFileInput.addEventListener('change', (e) => this.handleFileUpload(e, 'question'));
        }

        // Answer file upload
        const uploadAnswerBtn = document.getElementById('upload-answer-btn');
        if (uploadAnswerBtn) {
            uploadAnswerBtn.addEventListener('click', () => {
                document.getElementById('answer-file-input').click();
            });
        }
        const answerFileInput = document.getElementById('answer-file-input');
        if (answerFileInput) {
            answerFileInput.addEventListener('change', (e) => this.handleFileUpload(e, 'answer'));
        }

        // Standard answer file upload
        const uploadStandardBtn = document.getElementById('upload-standard-btn');
        if (uploadStandardBtn) {
            uploadStandardBtn.addEventListener('click', () => {
                document.getElementById('standard-file-input').click();
            });
        }
        const standardFileInput = document.getElementById('standard-file-input');
        if (standardFileInput) {
            standardFileInput.addEventListener('change', (e) => this.handleFileUpload(e, 'standard'));
        }
    }

    toggleRecordingForField(fieldType) {
        if (!this.currentRecordingField) {
            this.startRecordingForField(fieldType);
        } else if (this.currentRecordingField === fieldType) {
            this.stopRecordingForField(fieldType);
        } else {
            this.log('⚠️ 已有其他字段在录音，请先停止', 'warning');
        }
    }

    async startRecordingForField(fieldType) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.currentRecordingField = fieldType;

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                await this.processAudioForField(fieldType);
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            // Find the button and update it
            const btnMap = {
                'question': document.getElementById('record-question-btn'),
                'answer': document.getElementById('record-answer-btn'),
                'question-input': document.getElementById('record-qg-btn'),
                'answer-standard': document.getElementById('record-ac-standard-btn'),
                'plan-goal': document.getElementById('record-plan-goal-btn'),
                'chat-input': document.getElementById('record-chat-btn')
            };

            const btn = btnMap[fieldType];
            if (btn) {
                btn.textContent = '🛑 停止录音';
                btn.classList.add('recording');
            }

            this.log(`🎤 正在录音...`, 'info');

        } catch (error) {
            this.log(`❌ 录音权限错误：${error.message}`, 'error');
        }
    }

    stopRecordingForField(fieldType) {
        if (this.mediaRecorder) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;

            // Find the button and reset it
            const btnMap = {
                'question': document.getElementById('record-question-btn'),
                'answer': document.getElementById('record-answer-btn'),
                'question-input': document.getElementById('record-qg-btn'),
                'answer-standard': document.getElementById('record-ac-standard-btn'),
                'plan-goal': document.getElementById('record-plan-goal-btn'),
                'chat-input': document.getElementById('record-chat-btn')
            };

            const btnLabels = {
                'question': '🎤 题目语音',
                'answer': '🎤 答案语音',
                'question-input': '🎤 语音输入',
                'answer-standard': '🎤 语音输入',
                'plan-goal': '🎤 语音输入',
                'chat-input': '🎤 语音输入'
            };

            const btn = btnMap[fieldType];
            if (btn) {
                btn.textContent = btnLabels[fieldType];
                btn.classList.remove('recording');
            }

            this.log(`⏹️ 已停止录音，正在识别...`, 'info');
            this.currentRecordingField = null;
        }
    }

    async processAudioForField(fieldType) {
        if (this.audioChunks.length === 0) {
            this.log('⚠️ 未检测到音频数据', 'warning');
            return;
        }

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        // 【重要】添加语言参数以提高识别准确度到90%
        formData.append('language', this.currentLanguage || 'english');

        try {
            const response = await fetch(`${API_BASE_URL}/speech/recognize`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            // Map field types to actual element IDs
            const fieldMap = {
                'question': 'answer-question',
                'answer': 'answer-student',
                'question-input': 'question-input',
                'answer-standard': 'answer-standard',
                'plan-goal': 'plan-goal',
                'chat-input': 'chat-input'
            };

            const targetField = document.getElementById(fieldMap[fieldType]);
            if (targetField) {
                targetField.value = data.text;
                this.log(`✅ 语音识别完成`, 'success');
            }

        } catch (error) {
            this.log(`❌ 语音处理错误：${error.message}`, 'error');
        }
    }

    async handleFileUpload(event, fieldType) {
        const file = event.target.files[0];
        if (!file) return;

        const fieldNames = {
            'question': '题目',
            'answer': '答案',
            'standard': '标准答案'
        };
        const fieldLabel = fieldNames[fieldType] || fieldType;
        this.log(`📁 正在处理${fieldLabel}文件：${file.name}...`, 'info');

        try {
            const text = await file.text();
            let targetField;

            if (fieldType === 'question') {
                targetField = document.getElementById('answer-question');
            } else if (fieldType === 'answer') {
                targetField = document.getElementById('answer-student');
            } else if (fieldType === 'standard') {
                targetField = document.getElementById('answer-standard');
            }

            if (targetField) {
                targetField.value = text;
                this.log(`✅ ${fieldLabel}文件已加载`, 'success');
            }

        } catch (error) {
            this.log(`❌ 文件读取错误：${error.message}`, 'error');
        }

        // Reset file input
        event.target.value = '';
    }

    async handleChatFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.log(`📎 正在加载文件：${file.name}...`, 'info');

        try {
            const text = await file.text();

            // Store file info for sending with chat
            this.currentChatFile = {
                name: file.name,
                content: text
            };

            // Show file info to user
            const chatFileInfo = document.getElementById('chat-file-info');
            const chatFileName = document.getElementById('chat-file-name');
            if (chatFileInfo && chatFileName) {
                chatFileName.textContent = file.name;
                chatFileInfo.style.display = 'block';
            }

            this.log(`✅ 文件已加载：${file.name}`, 'success');

        } catch (error) {
            this.log(`❌ 文件读取错误：${error.message}`, 'error');
            this.currentChatFile = null;
        }

        // Reset file input
        event.target.value = '';
    }

    extractResponseContent(response, sentPrompt) {
        /**
         * Extract actual AI response content and remove prompt text
         * Prevents prompt echoing from being displayed to users
         * 【策略】Only remove obvious prompt echoes that appear at the START of response
         */
        if (!response || typeof response !== 'string') {
            return response;
        }

        let content = response.trim();

        // ONLY remove if content clearly starts with prompt markers (not in the middle)
        // This avoids accidentally removing legitimate response content

        // Pattern 1: Response starts with prompt instructions/requirements
        if (content.match(/^【(用户输入|学生水平|批改要求|CRITICAL|格式要求|输出格式|MANDATORY|LANGUAGE ENFORCEMENT)/)) {
            // Find where the actual answer output starts (题目, Question, Answer, etc.)
            const outputStart = content.search(/\n(题目|问题|Question|Pregunta|Answer|答案|Response|解析|分析)/i);
            if (outputStart > -1) {
                // There's actual output content, skip the prompt part
                content = content.substring(outputStart + 1); // +1 to skip the \n
            }
        }

        // Pattern 2: If content is suspiciously long at the start before any actual output
        // Only do this if we can clearly identify separate sections
        const lines = content.split('\n');
        let contentStartLine = 0;

        // Find the first line that looks like actual output (题目/Question/Answer/etc)
        for (let i = 0; i < lines.length && i < 20; i++) {
            if (lines[i].match(/^(题目|问题|Question|Pregunta|Answer|答案|解析|分析)/i)) {
                contentStartLine = i;
                break;
            }
        }

        // If we found actual output content is not at the start, remove the preamble
        if (contentStartLine > 5) {
            // There are many lines of potential prompt text before the actual content
            // This is suspicious, remove the prefix
            content = lines.slice(contentStartLine).join('\n');
        }

        return content.trim();
    }

    async submitAnswer() {
        const question = document.getElementById('answer-question').value.trim();
        const studentAnswer = document.getElementById('answer-student').value.trim();
        const standardAnswer = document.getElementById('answer-standard').value.trim();

        if (!question || !studentAnswer) {
            const errorMsg = this.currentLanguage === 'chinese'
                ? '错误：题目和学生答案都必填'
                : 'Error: Both question and student answer are required';
            this.log(errorMsg, 'error');
            return;
        }

        const langForAC = this.currentLanguage || 'chinese';
        const loadingMsg = langForAC === 'chinese'
            ? '正在批改答案...'
            : 'Grading answer...';
        const evaluatingMsg = langForAC === 'chinese'
            ? '⏳ 等待批改...'
            : '⏳ Waiting for grading...';
        this.log(loadingMsg, 'info');
        const resultDiv = document.getElementById('answer-result');
        resultDiv.innerHTML = `<p class="placeholder">${evaluatingMsg}</p>`;

        try {
            // Define language-specific labels for answer checker prompts
            const acLabels = {
                'chinese': { answer: '答案', analysis: '解析' },
                'english': { answer: 'Answer', analysis: 'Analysis' },
                'spanish': { answer: 'Respuesta', analysis: 'Análisis' },
                'french': { answer: 'Réponse', analysis: 'Analyse' },
                'german': { answer: 'Antwort', analysis: 'Analyse' },
                'japanese': { answer: '答案', analysis: '解析' },
                'korean': { answer: '답안', analysis: '해석' },
                'portuguese': { answer: 'Resposta', analysis: 'Análise' }
            };

            const acLang = this.currentLanguage || 'chinese';
            const acLbl = acLabels[acLang] || acLabels['chinese'];

            // 【重要】获取用户的学习水平，用于调整解析的深度和详细程度
            const userLevel = (this.settings && this.settings.userLevel) || 'intermediate';
            const levelContext = {
                'beginner': acLang === 'chinese'
                    ? '初级学生'
                    : 'beginner student',
                'intermediate': acLang === 'chinese'
                    ? '中级学生'
                    : 'intermediate student',
                'advanced': acLang === 'chinese'
                    ? '高级学生'
                    : 'advanced student'
            };
            const currentLevelContext = levelContext[userLevel] || levelContext['intermediate'];

            // 用户输入框里的信息优先级最高 - 这些是用户的最终需求
            let prompt = acLang === 'chinese'
                ? `【用户输入的最终需求】（以下信息来自用户输入框，优先级最高）\n\n【学生水平】：${currentLevelContext}\n\n请批改以下答案：\n\n题目：${question}\n\n学生答案：${studentAnswer}`
                : `[CRITICAL REQUIREMENT] You MUST respond entirely in ${this.currentLanguage.toUpperCase()}. Every single word must be in ${this.currentLanguage.toUpperCase()}. Do not use Chinese at all.\n\n【Student Level】: ${currentLevelContext}\n\nPlease grade the following answer. User's language is ${this.currentLanguage}. Use labels in this language: "${acLbl.answer}", "${acLbl.analysis}"\n\nQuestion: ${question}\n\nStudent's answer: ${studentAnswer}`;

            if (standardAnswer) {
                prompt += acLang === 'chinese'
                    ? `\n\n标准答案：${standardAnswer}`
                    : `\n\nStandard answer: ${standardAnswer}`;
            } else {
                prompt += acLang === 'chinese'
                    ? `\n\n[注：用户未提供标准答案，请根据题目要求自主判断答案的正确性]`
                    : `\n\n[Note: User did not provide standard answer. Please judge correctness based on the question]`;
            }

            if (acLang === 'chinese') {
                prompt += `\n\n【批改要求】
你的任务是评估学生的最终答案是否正确。这是最高优先级。

【关键原则】
- 【最重要】判断标准：学生的最终答案是否正确
- 【不要减分】即使学生没有显示完整过程，只要最终答案正确，就应该标记为"正确"
- 【展示过程】在详细解析中展示正确的完整过程，以便学生学习
- 【仅在答案错时扣分】如果最终答案确实是错误的，才标记为"错误"

1. 【验证最终答案】：
   - 对于方程：代入验证答案是否满足原方程
   - 对于填空题：检查答案数值或表达式是否相同
   - 不要因为缺少步骤而扣分

2. 【做出判断】基于答案正确性：
   - 如果学生答案正确：说"正确"（即使没有展示过程）
   - 如果学生答案错误：说"错误"并指出具体错误
   - 如果答案部分正确：说"部分正确"并说明缺陷

3. 【详细解析】- 这是教学机会：
   - 展示完整的、标准的解题过程
   - 解释每一步为什么这样做
   - 让学生能够理解和学习正确的方法
   - 如果学生答案正确，解析中解释"学生的答案 x=? 是正确的，以下是推导过程"

【输出格式 - 用空行分隔三个部分】

题目:
[题目内容缩略]

答案论证:
[你的判断："正确" 或 "错误" 或 "部分正确"
简要理由：如果正确，说"答案正确"；如果错误，说具体错误]

详细解析:
[完整的解题过程：
1. 验证学生答案是否满足要求
2. 展示标准的完整解题步骤
3. 如果学生答案正确，确认正确；如果错误，指出错在哪里]

【格式要求】
- 使用纯文本，无需Markdown
- 数学表达式用 $...$ 包裹，如：$x^2 + 2x = 0$
- 禁止：\\\\begin{align}等复杂LaTeX，禁止孤立的$符号`;
            } else {
                prompt += `\n\n【Grading Requirements】
Your task is to evaluate whether the student's final answer is correct. This is your highest priority.

【Key Principles】
- 【MOST IMPORTANT】Grading standard: Is the student's final answer correct?
- 【NO DEDUCTIONS】Even if the student didn't show complete work, if the final answer is correct, mark it as "Correct"
- 【SHOW PROCEDURE】In Detailed Explanation, show the complete correct procedure so the student can learn
- 【ONLY DEDUCT FOR WRONG ANSWERS】Only mark as "Incorrect" if the final answer is actually wrong

1. 【Verify the Final Answer】:
   - For equations: Substitute to verify if answer satisfies the original equation
   - For fill-in-blank: Check if the answer value or expression matches
   - Do NOT deduct points for missing steps

2. 【Make a Judgment】Based on answer correctness:
   - If answer is correct: Say "Correct" (even without shown work)
   - If answer is wrong: Say "Incorrect" and point out the specific error
   - If answer is partially correct: Say "Partially Correct" and explain the deficiency

3. 【Detailed Explanation】- This is a teaching opportunity:
   - Show complete, standard solution process
   - Explain why each step is done this way
   - Let the student understand and learn the correct method
   - If student answer is correct, explain "The student's answer x=? is correct. Here is the derivation process:"

【OUTPUT FORMAT - Use blank lines to separate three sections】

Question:
[Question content summary]

Justification:
[Your verdict: "Correct" or "Incorrect" or "Partially Correct"
Brief reason: If correct, say "Answer is correct"; if wrong, state specific error]

Detailed Explanation:
[Complete solution process:
1. Verify if student answer satisfies the requirement
2. Show standard complete solution steps
3. If student answer is correct, confirm it; if wrong, point out the error]

【Format Requirements】
- Use plain text, no Markdown needed
- Math expressions wrapped in $...$, like: $x^2 + 2x = 0$
- Forbidden: \\\\begin{align} and complex LaTeX, forbidden: isolated $ symbols`;
            }

            // Add active profile's custom requirements if available
            const activeProfile = this.getActiveProfile();
            if (activeProfile && activeProfile.customRequirements) {
                prompt += `\n\n[用户学习要求]：${activeProfile.customRequirements}`;
            }

            // Add personalized learning style description if available
            if (this.settings && this.settings.learningStyleDescription) {
                prompt += `\n[个性化学习风格]：${this.settings.learningStyleDescription}`;
            }

            // Add timeout protection
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('生成超时（超过100秒），请检查网络连接后重试')), 100000)
            );

            const fetchPromise = fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: prompt })
            }).then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `HTTP ${response.status}`);
                    });
                }
                return response.json();
            });

            const data = await Promise.race([fetchPromise, timeoutPromise]);

            // Extract content from response, handling both plain text and JSON responses
            let responseContent = data.content;

            // Try to extract explanation field if response is JSON
            try {
                if (typeof responseContent === 'string' && responseContent.trim().startsWith('{')) {
                    const parsed = JSON.parse(responseContent);
                    if (parsed.explanation) {
                        responseContent = parsed.explanation;
                    }
                }
            } catch (parseErr) {
                // Not JSON, use response as-is
                console.log('Answer checker response is not JSON, using as plain text');
            }

            // CRITICAL FIX: Remove prompt text from response
            // The prompt might be echoed back by the API, we need to extract only the actual response
            responseContent = this.extractResponseContent(responseContent, prompt);

            // Clean up complex LaTeX first
            let cleanedContent = this.cleanupComplexLatex(responseContent);
            // Remove ### symbols (Markdown headers) before formatting
            cleanedContent = cleanedContent.replace(/^###\s*/gm, '').replace(/\s+###\s*/g, '');

            // Remove orphaned/unmatched dollar signs AGGRESSIVELY
            // These often appear as standalone $ characters from formatting issues
            cleanedContent = cleanedContent.split('\n').map(line => {
                // Count $ symbols in the line
                const dollarCount = (line.match(/\$/g) || []).length;

                // If odd number of $, there's an unmatched pair
                if (dollarCount % 2 === 1) {
                    // Remove the last $ if it's isolated at the end
                    line = line.replace(/\s+\$\s*$/, '');  // Trailing isolated $
                }

                // Remove $ surrounded by spaces (orphaned)
                line = line.replace(/\s\$\s/g, ' ');
                // Remove $ at line start (orphaned)
                line = line.replace(/^\$\s+/, '');
                // Remove lines that are just a single $
                if (line.trim() === '$') {
                    return '';
                }

                return line;
            }).join('\n');

            // 【修复】使用 wrapUnmatchedMath 确保一致的方程格式化
            // 就像问题生成器一样，这样可以处理 AI 没有完全包装的方程
            let wrappedContent = this.wrapUnmatchedMath(cleanedContent);

            // Format Answer Checker response into 3 clear sections with colored titles
            const formattedContent = this.formatAnswerCheckerResponse(wrappedContent, acLang);

            // Final cleanup: remove any remaining orphaned $ symbols from formatted HTML
            // 【重要】最后的清理必须保护 $...$ 方程对
            // 使用与 formatQuestionsWithColors 和 formatSection 相同的分割模式
            let finalContent = formattedContent
                // Remove any remaining ### symbols
                .replace(/###/g, '')
                // Final pass: remove any isolated $ not part of matched pairs
                // 【重要】使用与 formatQuestionsWithColors 和 formatSection 相同的分割模式
                // /(\$[\s\S]*?\$)/ 可以匹配任何字符，包括换行符和特殊字符
                // 这确保了方程不会被错误地识别为孤立 $ 符号而被删除
                .split(/(\$[\s\S]*?\$)/)  // Split preserving math expressions - MUST match any chars
                .map((part, idx) => {
                    if (idx % 2 === 0) {
                        // Regular text: remove any remaining orphaned $
                        return part.replace(/\$(?!\$)/g, '');  // Remove unmatched $
                    }
                    return part;  // Keep math expressions as-is
                })
                .join('');

            resultDiv.innerHTML = finalContent;

            // Wrap sentences for reading highlight
            this.wrapSentencesInElement(resultDiv);

            // Render LaTeX formulas with MathJax
            if (window.MathJax) {
                setTimeout(() => {
                    window.MathJax.typesetPromise([resultDiv]).catch(err => {
                        console.log('MathJax rendering error:', err);
                    });
                }, 100);
            }

            this.log('✅ 批改完成', 'success');

            // Show notification
            this.showPageNotification('answer-checker', this.currentLanguage === 'chinese' ? '✅ 答案已批改' : '✅ Answer graded successfully');

            // Show read aloud button
            const speakACBtn = document.getElementById('speak-ac-btn');
            const stopACBtn = document.getElementById('stop-ac-btn');
            if (speakACBtn) speakACBtn.style.display = 'inline-block';
            if (stopACBtn) stopACBtn.style.display = 'inline-block';

            // Save content for later saving
            this.currentACContent = {
                question: question,
                studentAnswer: studentAnswer,
                standardAnswer: standardAnswer,
                answer: responseContent,
                timestamp: new Date().toISOString()
            };

            // Track activity for progress
            await this.onAnswerChecked(question, studentAnswer, standardAnswer, responseContent);

            // Show save button
            if (this.saveACBtn) {
                this.saveACBtn.style.display = 'block';
            }
        } catch (error) {
            resultDiv.innerHTML = `<p class="response-text">❌ 错误：${error.message}</p>`;
            this.log(`❌ 批改错误：${error.message}`, 'error');
        }
    }

    // ========== Learning Plan Functions ==========

    displayLearningPlan(content) {
        // Hide the original result container
        const resultDiv = document.getElementById('plan-result');
        resultDiv.style.display = 'none';

        // Show the structured plan sections
        const planSectionsDiv = document.getElementById('plan-sections');
        planSectionsDiv.style.display = 'block';

        // Parse the content by sections with improved regex to handle various formats
        let opinion, resources, schedule;

        // Clean up extracted content - remove leading colons and extra whitespace
        const cleanContent = (text) => {
            return text
                .replace(/^[:：\s]+/, '') // Remove leading colons and whitespace
                .replace(/\n\n+/g, '\n') // Normalize multiple newlines to single
                // Remove markdown symbols that AI might have included
                .replace(/\*\*([^*]*?)\*\*/g, '$1') // Remove bold markers
                .replace(/(?<!\$)\*(?!\$)/g, '') // Remove asterisks not in math
                .replace(/^#+\s+/gm, '') // Remove markdown headers
                .replace(/^[-•]\s+/gm, '') // Remove list bullets
                .trim();
        };

        // 【严格分割策略】MUST follow this order - find exact markers first
        // Support both Chinese and English markers

        // Find all section markers (Chinese or English)
        const opinionMarkers = ['【整体学习意见】', '【Overall Learning Opinion】'];
        const resourcesMarkers = ['【推荐学习方法】', '【推荐学习资料与网站】', '【Recommended Learning Methods】'];
        const scheduleMarkers = ['【详细时间计划表】', '【Detailed Time Schedule】'];

        // Find first occurrence of each section type
        let opinionIdx = -1, opinionLabel = '';
        for (const marker of opinionMarkers) {
            const idx = content.indexOf(marker);
            if (idx !== -1 && (opinionIdx === -1 || idx < opinionIdx)) {
                opinionIdx = idx;
                opinionLabel = marker;
            }
        }

        let resourcesIdx = -1, resourcesLabel = '';
        for (const marker of resourcesMarkers) {
            const idx = content.indexOf(marker);
            if (idx !== -1 && (resourcesIdx === -1 || idx < resourcesIdx)) {
                resourcesIdx = idx;
                resourcesLabel = marker;
            }
        }

        let scheduleIdx = -1, scheduleLabel = '';
        for (const marker of scheduleMarkers) {
            const idx = content.indexOf(marker);
            if (idx !== -1 && (scheduleIdx === -1 || idx < scheduleIdx)) {
                scheduleIdx = idx;
                scheduleLabel = marker;
            }
        }

        // Build array of found markers in order
        const marks = [];
        if (opinionIdx !== -1) marks.push({ idx: opinionIdx, type: 'opinion', label: opinionLabel });
        if (resourcesIdx !== -1) marks.push({ idx: resourcesIdx, type: 'resources', label: resourcesLabel });
        if (scheduleIdx !== -1) marks.push({ idx: scheduleIdx, type: 'schedule', label: scheduleLabel });

        // Sort by position
        marks.sort((a, b) => a.idx - b.idx);

        // Extract sections using markers as boundaries
        if (marks.length >= 3) {
            // All three markers found - use exact boundaries
            for (let i = 0; i < marks.length; i++) {
                const mark = marks[i];
                const startIdx = mark.idx + mark.label.length;
                const endIdx = (i + 1 < marks.length) ? marks[i + 1].idx : content.length;

                const sectionContent = cleanContent(content.substring(startIdx, endIdx));

                if (mark.type === 'opinion') {
                    opinion = sectionContent;
                } else if (mark.type === 'resources') {
                    resources = sectionContent;
                } else if (mark.type === 'schedule') {
                    schedule = sectionContent;
                }
            }
        } else if (marks.length >= 2) {
            // Partial markers found - still use them as reference
            for (let i = 0; i < marks.length; i++) {
                const mark = marks[i];
                const startIdx = mark.idx + mark.label.length;
                const endIdx = (i + 1 < marks.length) ? marks[i + 1].idx : content.length;

                const sectionContent = cleanContent(content.substring(startIdx, endIdx));

                if (mark.type === 'opinion') {
                    opinion = sectionContent;
                } else if (mark.type === 'resources') {
                    resources = sectionContent;
                } else if (mark.type === 'schedule') {
                    schedule = sectionContent;
                }
            }
        } else if (marks.length === 1) {
            // Only one marker - use it and split remainder
            const mark = marks[0];
            const startIdx = mark.idx + mark.label.length;
            const remainder = content.substring(startIdx);

            if (mark.type === 'opinion') {
                opinion = cleanContent(remainder);
            } else if (mark.type === 'resources') {
                resources = cleanContent(remainder);
            } else if (mark.type === 'schedule') {
                schedule = cleanContent(remainder);
            }
        }

        // Language-aware no content message
        const noContentMsg = this.currentLanguage === 'chinese' ? '暂无内容' : 'No content';

        // Final fallback - if still missing any section, try equal division
        if (!opinion || !resources || !schedule) {
            const lines = content.split('\n').filter(l => l.trim());
            const thirdLength = Math.ceil(lines.length / 3);

            if (!opinion) opinion = cleanContent(lines.slice(0, thirdLength).join('\n'));
            if (!resources) resources = cleanContent(lines.slice(thirdLength, thirdLength * 2).join('\n'));
            if (!schedule) schedule = cleanContent(lines.slice(thirdLength * 2).join('\n'));
        }

        // Final fallback - provide default content if completely empty
        if (!opinion) opinion = content.trim();
        if (!resources) resources = noContentMsg;
        if (!schedule) schedule = noContentMsg;

        console.log('Learning Plan Sections:', {
            opinion: opinion?.substring(0, 80) || '(empty)',
            resources: resources?.substring(0, 80) || '(empty)',
            schedule: schedule?.substring(0, 80) || '(empty)'
        });

        // Display parsed content with formatting and auto-wrap math expressions
        const opinionEl = document.getElementById('plan-opinion');
        const resourcesEl = document.getElementById('plan-resources');
        const scheduleEl = document.getElementById('plan-schedule');

        // Clean up complex LaTeX, then auto-wrap and format content (same as question generator)
        let opinionCleaned = this.cleanupComplexLatex(opinion || noContentMsg);
        let opinionWrapped = this.wrapUnmatchedMath(opinionCleaned);
        opinionEl.innerHTML = this.formatQuestionsWithColors(opinionWrapped);

        let resourcesCleaned = this.cleanupComplexLatex(resources || noContentMsg);
        let resourcesWrapped = this.wrapUnmatchedMath(resourcesCleaned);
        resourcesEl.innerHTML = this.formatQuestionsWithColors(resourcesWrapped);

        // For schedule, add extra spacing between time units
        let scheduleCleaned = this.cleanupComplexLatex(schedule || noContentMsg);
        const formattedSchedule = this.formatScheduleWithSpacing(scheduleCleaned);
        let scheduleWrapped = this.wrapUnmatchedMath(formattedSchedule);
        scheduleEl.innerHTML = this.formatQuestionsWithColors(scheduleWrapped);

        // Wrap sentences for reading highlight
        this.wrapSentencesInElement(opinionEl);
        this.wrapSentencesInElement(resourcesEl);
        this.wrapSentencesInElement(scheduleEl);

        // Render LaTeX formulas with MathJax in all plan sections
        if (window.MathJax) {
            setTimeout(() => {
                window.MathJax.typesetPromise([
                    opinionEl,
                    resourcesEl,
                    scheduleEl
                ]).catch(err => {
                    console.log('MathJax rendering error:', err);
                });
            }, 100);
        }

        // Initialize accordion state: all collapsed initially
        this.updatePlanSectionState();
    }

    /**
     * Format schedule content with extra spacing between time units
     * Puts blank line BETWEEN weeks/days, not between header and content
     */
    formatScheduleWithSpacing(schedule) {
        const noContentMsg = this.currentLanguage === 'chinese' ? '暂无内容' : 'No content';
        if (!schedule || schedule === '暂无内容' || schedule === noContentMsg) {
            return schedule;
        }

        let text = schedule;

        // 【CRITICAL】Remove ALL unnecessary markdown symbols
        // Remove asterisks and related markdown - this is the user's main complaint
        text = text.replace(/\*\*/g, '');  // Remove bold markers (**)
        text = text.replace(/(?<!\$)\*(?!\$)/g, '');  // Remove single asterisks (but not within $...$)
        text = text.replace(/^#+\s+/gm, '');  // Remove markdown headers (#, ##, ###)
        text = text.replace(/^[-*]\s+/gm, '');  // Remove markdown list bullets
        text = text.replace(/__/g, '');  // Remove underscores used for formatting

        // First, clean up each line by trimming leading/trailing whitespace
        // This fixes alignment issues
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        text = lines.join('\n');

        // Remove colons from time unit headers to keep clean formatting
        const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        weekdays.forEach(day => {
            text = text.replace(new RegExp(`${day}[：:]+`, 'g'), day);
        });

        // Remove colons from other time unit headers
        text = text.replace(/(Day\s*\d+)[：:]+/g, '$1');
        text = text.replace(/(第[一二三四五六七八九十]+天)[：:]+/g, '$1');
        text = text.replace(/(Week\s*\d+)[：:]+/g, '$1');
        text = text.replace(/(第[一二三四五六七八九十]+周)[：:]+/g, '$1');
        text = text.replace(/(\d{4}年\d{1,2}月\d{1,2}日)[：:]+/g, '$1');
        text = text.replace(/(\d{1,2}\/\d{1,2})[：:]+/g, '$1');

        // Add blank lines BEFORE each time unit header (except the first one)
        // This puts spacing between the previous week's content and the next week's header
        text = text.replace(/\n(周[一二三四五六日]|Day\s*\d+|第[一二三四五六七八九十]+(天|周)|Week\s*\d+|\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2})/g, '\n\n$1');

        // Remove double blank lines at the start if they exist
        text = text.replace(/^\n\n/, '');

        // Add extra line at the end to separate from AI suggestions
        text = text.trim() + '\n';

        return text;
    }

    /**
     * Toggle learning plan section (accordion)
     */
    togglePlanSection(index) {
        const sections = document.querySelectorAll('.plan-section-accordion');
        if (index >= sections.length) return;

        const section = sections[index];
        const content = section.querySelector('.plan-section-content');
        const toggle = section.querySelector('.plan-section-toggle');
        const isExpanded = content.classList.contains('plan-section-expanded');

        // Toggle current section independently (allow multiple open)
        if (isExpanded) {
            content.classList.remove('plan-section-expanded');
            content.classList.add('plan-section-collapsed');
            // Hide buttons for collapsed section
            const buttons = section.querySelectorAll('.btn-plan-speak, .btn-plan-stop');
            buttons.forEach(btn => btn.classList.remove('visible'));
            // Update toggle arrow
            if (toggle) toggle.textContent = '▶';
        } else {
            // Expand this section (don't collapse others)
            content.classList.remove('plan-section-collapsed');
            content.classList.add('plan-section-expanded');
            // Show buttons for expanded section
            const buttons = section.querySelectorAll('.btn-plan-speak, .btn-plan-stop');
            buttons.forEach(btn => btn.classList.add('visible'));
            // Update toggle arrow
            if (toggle) toggle.textContent = '▼';
        }
    }

    /**
     * Update plan section initial state - All collapsed initially
     */
    updatePlanSectionState() {
        const sections = document.querySelectorAll('.plan-section-accordion');
        sections.forEach((section, index) => {
            const content = section.querySelector('.plan-section-content');
            const buttons = section.querySelectorAll('.btn-plan-speak, .btn-plan-stop');
            const toggle = section.querySelector('.plan-section-toggle');

            // All sections collapsed initially
            content.classList.add('plan-section-collapsed');
            content.classList.remove('plan-section-expanded');
            // Hide buttons for collapsed sections
            buttons.forEach(btn => btn.classList.remove('visible'));
            // Set toggle arrow to right-pointing
            if (toggle) {
                toggle.textContent = '▶';
            }
        });
    }

    /**
     * Speak learning plan section with tracking and scrolling
     * @param {number} sectionIndex - 0: opinion, 1: resources, 2: schedule
     */
    speakLearningPlan(sectionIndex) {
        const sectionIds = ['plan-opinion', 'plan-resources', 'plan-schedule'];
        if (sectionIndex >= sectionIds.length) return;

        const elementId = sectionIds[sectionIndex];
        const container = document.getElementById(elementId);

        if (!container) {
            console.error('Plan section not found:', elementId);
            return;
        }

        // Get the text content
        const text = container.innerHTML;

        if (!text.trim()) {
            alert('此部分没有内容');
            return;
        }

        // Wrap sentences for tracking and highlighting
        this.wrapSentencesInElement(container);

        // Call speakText with elementId for tracking and scrolling
        this.speakText(text, this.currentLanguage, elementId);
    }

    async submitLearningPlan() {
        const goal = document.getElementById('plan-goal').value.trim();
        const duration = document.getElementById('plan-duration').value;
        const currentLevel = document.getElementById('plan-current-level').value;

        const lang = this.currentLanguage || 'chinese';
        const lpLang = lang; // Alias for consistency with later code
        const errorEmptyMsg = lang === 'chinese' ? '错误：学习目标不能为空' : 'Error: Learning goal cannot be empty';
        const loadingMsg = lang === 'chinese' ? '正在制定学习规划...' : 'Creating learning plan...';
        const generatingMsg = lang === 'chinese' ? '⏳ AI 正在为您制定个性化学习规划...' : '⏳ AI is creating a personalized learning plan for you...';

        if (!goal) {
            this.log(errorEmptyMsg, 'error');
            return;
        }

        this.log(loadingMsg, 'info');
        const resultDiv = document.getElementById('plan-result');
        const planSectionsDiv = document.getElementById('plan-sections');
        resultDiv.style.display = 'block';
        planSectionsDiv.style.display = 'none';
        resultDiv.innerHTML = `<p class="placeholder">${generatingMsg}</p>`;

        // Language-aware text - responds to current language setting
        const durationText = lpLang === 'chinese' ? {
            '1week': '1周',
            '1month': '1个月',
            '3month': '3个月',
            '6month': '6个月',
            '1year': '1年'
        } : {
            '1week': '1 week',
            '1month': '1 month',
            '3month': '3 months',
            '6month': '6 months',
            '1year': '1 year'
        };

        const levelText = lpLang === 'chinese' ? {
            'beginner': '初级',
            'intermediate': '中级',
            'advanced': '高级'
        } : {
            'beginner': 'beginner',
            'intermediate': 'intermediate',
            'advanced': 'advanced'
        };

        try {
            // Gather user personalization context
            let personalizationInfo = '';
            let learningStyleDescription = '';

            // Get user's subjects from settings
            const subjects = this.settings.subjects || [];
            const learningStyle = this.settings.learningStyle || 'detailed';
            const examType = this.settings.examType || '';
            const customLearningStyle = this.settings.learningStyleDescription || '';

            if (lpLang === 'chinese') {
                if (subjects.length > 0) {
                    personalizationInfo += `\n学生的主要学科：${subjects.join('、')}`;
                }
                if (learningStyle === 'detailed') {
                    personalizationInfo += `\n学生偏好：详细讲解（适合打基础）`;
                } else if (learningStyle === 'concise') {
                    personalizationInfo += `\n学生偏好：精简概括（快速了解）`;
                } else if (learningStyle === 'interactive') {
                    personalizationInfo += `\n学生偏好：互动式（问答和讨论）`;
                }
                if (examType) {
                    personalizationInfo += `\n参加的考试类型：${examType}`;
                }
                if (customLearningStyle) {
                    learningStyleDescription = `\n\n【学生的个性化学习风格描述】\n${customLearningStyle}`;
                }
            } else {
                if (subjects.length > 0) {
                    personalizationInfo += `\nStudent's main subjects: ${subjects.join(', ')}`;
                }
                if (learningStyle === 'detailed') {
                    personalizationInfo += `\nStudent preference: Detailed Explanation`;
                } else if (learningStyle === 'concise') {
                    personalizationInfo += `\nStudent preference: Concise Summary`;
                } else if (learningStyle === 'interactive') {
                    personalizationInfo += `\nStudent preference: Interactive`;
                }
                if (examType) {
                    personalizationInfo += `\nExam type: ${examType}`;
                }
                if (customLearningStyle) {
                    learningStyleDescription = `\n\n【Student's Personalized Learning Style Description】\n${customLearningStyle}`;
                }
            }

            // Build prompt with optional curriculum/syllabus information
            let syllabusInfo = '';
            if (this.uploadedLearningPlan) {
                if (this.uploadedLearningPlan.type === 'text') {
                    syllabusInfo = `\n\n【学生上传的课程大纲/学习清单】\n${this.uploadedLearningPlan.content.substring(0, 2000)}\n(如果内容过长，只显示前2000字)`;
                } else {
                    syllabusInfo = `\n\n【学生上传了课程文件：${this.uploadedLearningPlan.fileName}】\n请参考此文件的内容来制定学习规划。`;
                }
            }

            // 用户输入框里的信息优先级最高 - 这些是用户的最终需求
            let prompt = lpLang === 'chinese'
                ? `【用户输入的最终需求】（以下信息来自用户输入框，优先级最高）\n\n请为当前水平为"${levelText[currentLevel]}"的学生，在"${durationText[duration]}"内掌握"${goal}"制定详细的学习规划。${personalizationInfo}${learningStyleDescription}

【时间规划策略说明 - 根据学习周期调整粒度】
${duration === '1week' ? '对于1周：生成每日详细计划（周一-周日，每天一行）' : ''}
${duration === '1month' ? '对于1个月：生成每周计划（4周，每周一行）' : ''}
${duration === '3month' ? '对于3个月：生成双周或月度计划（推荐：Week 1-2, 3-4, 5-6, 7-8, 9-10, 11-12，每个时间段一行）' : ''}
${duration === '6month' ? '对于6个月：生成月度计划（6个月，每月一行）' : ''}
${duration === '1year' ? '对于1年：生成月度计划（12个月，每月一行）' : ''}

【输出格式 - 必须严格按照以下格式】

【整体学习意见】
[完整的学习目标分解、学习策略、成果评估 - 这一部分的【所有内容】都在这里，不要有时间表细节，不要有学习方法讨论]

【推荐学习方法】
[推荐一些有效的学习方法和技巧（例如番茄钟工作法、SQ3R阅读法、主动回忆、间隔重复等），不需要推荐网站 - 这一部分的【所有内容】都在这里，不要有时间表内容，不要有总体策略分析]

【详细时间计划表】
[仅包含时间计划，按照上述时间粒度生成。【极其重要 - 必须完整覆盖整个"${durationText[duration]}"学习周期】：无论选择何种时间粒度，都必须覆盖【全部时间段】，不能有任何遗漏！
【禁止】不要在这部分讨论学习方法]${syllabusInfo}

【严格的格式要求 - 必须完全遵守】
- 【必须】输出必须包含这三个部分，且标签必须精确匹配：【整体学习意见】、【推荐学习方法】、【详细时间计划表】
- 【必须】用这些标签严格分离内容 - 不能混淆！
- 第1部分（整体学习意见）：仅策略、分析、难点 - 【禁止】时间/日程/方法细节
- 第2部分（推荐学习方法）：仅方法和技巧 - 【禁止】时间表，【禁止】总体策略分析
- 第3部分（详细时间计划表）：仅日程表 - 必须有：周一/Day 1/Week 1等时间标记，具体的时间块，【完整覆盖"${durationText[duration]}"的整个周期】
- 系统将使用【标签】作为分割线来解析内容，所以标签必须单独成行，格式必须完全相同
- 【最关键】：移除【所有】Markdown符号 - 【禁止】星号(*)、【禁止】井号(#)、【禁止】双星号(**)、【禁止】下划线(_)，使用纯文本
- 【禁止】不要使用 \\begin{align}、\\begin{equation}、\\begin{}等复杂LaTeX环境
- 【最重要】任何包含数学内容的句子或表达式，从头到尾都必须用一对 $...$ 包裹
  - 正确：$x^2 - 3x + 2 = 0$ （整个表达式在 $...$ 内）
  - 错误：x^2 - 3x + 2 = 0 （没有 $）
  - 规则：如果一句话或一行中有任何数学符号或变量或数字，整句都要用 $...$ 包裹

【个性化要求 - 根据学生的学习偏好、学科背景和特定主题定制内容】
- 【整体学习意见】：针对学生当前的"${levelText[currentLevel]}"水平和学科背景（${subjects.length > 0 ? subjects.join('、') : '未指定'}），分析掌握"${goal}"需要克服的关键难点
- 【推荐学习方法】：根据学生的学习风格${customLearningStyle ? '和个性化学习描述' : ''}选择最合适的方法。${customLearningStyle ? '【CRITICAL】必须基于学生的个性化学习风格描述（' + customLearningStyle.substring(0, 100) + '...）来推荐策略' : ''}不要推荐通用方法，要根据学生偏好、学科背景（${subjects.length > 0 ? subjects.join('、') : '全科'}）和学习主题"${goal}"推荐具体的、切实可行的策略
- 【详细时间计划表】：【最重要】必须考虑：
  1. 学生的学科背景和专业水平（${subjects.length > 0 ? subjects.join('、') : '未指定'}）
  2. 学生的学习风格偏好${customLearningStyle ? '和个性化学习方式' : ''}
  3. 学习主题"${goal}"的具体知识层次和难度
  4. 设计真实可行的学习进度【NOT平均分配时间】
  5. 【必须覆盖用户选择的完整学习周期】
- 【关键提示】：计划应该体现学生的具体学习目标"${goal}"和所学科目特点（${subjects.length > 0 ? subjects.join('、') : '通用'}），而不是通用的学科学习方案`
                : `User's language: ${this.currentLanguage}\n\nPlease create a detailed learning plan for a student at "${levelText[currentLevel]}" level to master "${goal}" within "${durationText[duration]}".${personalizationInfo}${learningStyleDescription}

【Time Planning Strategy - Adjust granularity based on duration】
${duration === '1week' ? 'For 1 week: Generate daily detailed plan (Monday-Sunday, one line per day)' : ''}
${duration === '1month' ? 'For 1 month: Generate weekly plan (4 weeks, one line per week)' : ''}
${duration === '3month' ? 'For 3 months: Generate bi-weekly or monthly plan (Recommended: Week 1-2, 3-4, 5-6, 7-8, 9-10, 11-12, one line per period)' : ''}
${duration === '6month' ? 'For 6 months: Generate monthly plan (6 months, one line per month)' : ''}
${duration === '1year' ? 'For 1 year: Generate monthly plan (12 months, one line per month)' : ''}

【OUTPUT FORMAT - Strictly follow this format with exact labels】
MUST OUTPUT EXACTLY THIS FORMAT:

【Overall Learning Opinion】
[COMPLETE learning goal breakdown, strategy analysis, and assessment - ALL opinion content here, NOTHING ELSE. NO time-related details, NO methods discussion]

【Recommended Learning Methods】
[ONLY effective learning techniques and tips here - examples: Pomodoro technique, SQ3R reading method, active recall, spaced repetition, etc. NO time schedule content, NO overall strategy analysis]

【Detailed Time Schedule】
[ONLY the time schedule here, following the granularity strategy described above. CRITICAL - Must completely cover entire "${durationText[duration]}" period with NO gaps!
NO general methods discussion]${syllabusInfo}

【CRITICAL FORMATTING RULES - MUST FOLLOW EXACTLY】
- EVERY output MUST have all three sections with these EXACT labels: 【Overall Learning Opinion】, 【Recommended Learning Methods】, 【Detailed Time Schedule】
- Sections MUST be separated by these labels - DO NOT mix content types!
- Section 1 (Overall Learning Opinion): Strategy, analysis, challenges ONLY - NO time/schedule/methods details
- Section 2 (Recommended Learning Methods): Methods and techniques ONLY - NO timeline, NO overall strategy
- Section 3 (Detailed Time Schedule): Schedule ONLY - must have: Week 1/Day 1/Monday markers, specific time blocks, complete coverage of "${durationText[duration]}"
- The system will parse these sections using the 【labels】 as boundaries, so labels MUST be on their own lines and must be exact
- Remove all Markdown symbols (# ** * etc), use plain text
- FORBIDDEN: Do not use \\begin{align}, \\begin{equation}, \\begin{} etc
- MOST IMPORTANT: All math expressions must be wrapped with $...$
  - Correct: $x^2 - 3x + 2 = 0$ (entire in $...$)
  - Wrong: x^2 - 3x + 2 = 0 (missing $)

【Personalization Requirements - Customize based on student's learning preferences, subjects, and specific learning topics】
- 【Overall Learning Opinion】: Analyze the key difficulties and challenges for a "${levelText[currentLevel]}" level student with subject background (${subjects.length > 0 ? subjects.join(', ') : 'not specified'}) to master "${goal}"
- 【Recommended Learning Methods】: ${customLearningStyle ? '【CRITICAL】Base recommendations on student\'s personalized learning style: "' + customLearningStyle.substring(0, 100) + '..."' : 'Choose methods based on student\'s learning style, not generic advice'}. Tailor strategies to the specific topic "${goal}" and student preferences for subject(s): ${subjects.length > 0 ? subjects.join(', ') : 'General'}
- 【Detailed Time Schedule】: 【MOST IMPORTANT】Consider all factors:
  1. Student's subject background and expertise level (${subjects.length > 0 ? subjects.join(', ') : 'not specified'})
  2. Student's learning style preference${customLearningStyle ? ' and personalized learning method' : ''}
  3. Specific learning topic "${goal}" and its knowledge depth/difficulty
  4. Design realistic, achievable progress - NOT just uniform time distribution
  5. 【Must cover the entire "${durationText[duration]}" period with no gaps】
- 【KEY HINT】: The plan should reflect the specific learning goal "${goal}", the specific subject(s) (${subjects.length > 0 ? subjects.join(', ') : 'General'}), and the student's learning preferences, NOT generic subject learning`;

            // Add active profile's custom requirements if available
            const activeProfile = this.getActiveProfile();
            if (activeProfile && activeProfile.customRequirements) {
                prompt += `\n\n[用户学习要求]：${activeProfile.customRequirements}`;
            }

            // Add personalized learning style description if available
            if (this.settings && this.settings.learningStyleDescription) {
                prompt += `\n[个性化学习风格]：${this.settings.learningStyleDescription}`;
            }

            // Add timeout protection
            const timeoutMsg = lang === 'chinese'
                ? '生成超时（超过100秒），请检查网络连接后重试'
                : 'Generation timeout (over 100 seconds), please check your network connection and try again';
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(timeoutMsg)), 100000)
            );

            const fetchPromise = fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: prompt, language: this.currentLanguage })
            }).then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `HTTP ${response.status}`);
                    });
                }
                return response.json();
            });

            const data = await Promise.race([fetchPromise, timeoutPromise]);

            const hidePlaceholderMsg = lang === 'chinese' ? '⏳ AI 正在为您制定个性化学习规划...' : '⏳ AI is creating a personalized learning plan for you...';
            resultDiv.innerHTML = `<p class="placeholder" style="display: none;">${hidePlaceholderMsg}</p>`;

            // Parse the response into three sections
            this.displayLearningPlan(data.content);

            this.currentLPContent = {
                goal: goal,
                duration: duration,
                currentLevel: currentLevel,
                answer: data.content,
                timestamp: new Date().toISOString()
            };

            // Track activity for progress
            await this.onLearningPlanGenerated(goal, duration, currentLevel, data.content);

            if (this.saveLPBtn) {
                this.saveLPBtn.style.display = 'block';
            }

            const successMsg = lang === 'chinese' ? '✅ 学习规划已生成' : '✅ Learning plan generated';
            this.log(successMsg, 'success');

            // Show notification
            this.showPageNotification('learning-plan', successMsg);
        } catch (error) {
            const errorLabel = lang === 'chinese' ? '❌ 错误' : '❌ Error';
            const errorGenLabel = lang === 'chinese' ? '❌ 生成错误' : '❌ Generation error';
            resultDiv.innerHTML = `<p class="response-text">${errorLabel}：${error.message}</p>`;
            this.log(`${errorGenLabel}：${error.message}`, 'error');
        }
    }

    // ========== AI Chat Functions ==========

    selectChatTemplate(template) {
        // Template prompts for different languages
        const templatePrompts = {
            'concept': {
                'chinese': '请解释一下[输入概念]的定义和核心要点',
                'english': 'Please explain the definition and key points of [input concept]',
                'spanish': 'Por favor, explique la definición y los puntos clave de [concepto de entrada]',
                'french': 'Veuillez expliquer la définition et les points clés de [concept saisi]',
                'german': 'Bitte erklären Sie die Definition und Schlüsselpunkte von [eingegebenem Konzept]',
                'japanese': '[入力概念]の定義と重要なポイントについて説明してください',
                'korean': '[입력 개념]의 정의와 핵심 포인트를 설명해주세요',
                'portuguese': 'Por favor, explique a definição e os pontos-chave de [conceito inserido]'
            },
            'analysis': {
                'chinese': '请分析这道题目的解题思路和方法：[输入题目]',
                'english': 'Please analyze the problem-solving approach and methods for this problem: [input problem]',
                'spanish': 'Por favor, analice el enfoque y métodos de resolución de problemas: [problema de entrada]',
                'french': 'Veuillez analyser l\'approche et les méthodes de résolution de ce problème: [problème saisi]',
                'german': 'Bitte analysieren Sie den Lösungsansatz und die Methoden für dieses Problem: [eingegebenes Problem]',
                'japanese': 'この問題の問題解決のアプローチと方法を分析してください：[入力問題]',
                'korean': '이 문제의 문제 해결 접근 방식과 방법을 분석해주세요: [입력 문제]',
                'portuguese': 'Por favor, analise a abordagem e os métodos para resolver este problema: [problema inserido]'
            },
            'advice': {
                'chinese': '我在学习[输入科目/知识点]时遇到了困难，请给出学习建议',
                'english': 'I encountered difficulty learning [input subject/concept], please provide learning suggestions',
                'spanish': 'Encontré dificultad al aprender [asignatura/concepto de entrada], por favor proporcione sugerencias de aprendizaje',
                'french': 'J\'ai eu du mal à apprendre [sujet/concept saisi], veuillez fournir des suggestions d\'apprentissage',
                'german': 'Ich bin beim Erlernen von [eingegebenem Fach/Konzept] auf Schwierigkeiten gestoßen, bitte geben Sie Lernvorschläge',
                'japanese': '[入力科目/概念]の学習で困難に遭遇しました、学習提案を提供してください',
                'korean': '[입력 과목/개념]을 배우다가 어려움을 만났습니다, 학습 제안을 제공해주세요',
                'portuguese': 'Encontrei dificuldade ao aprender [assunto/conceito inserido], por favor forneça sugestões de aprendizagem'
            },
            'breakthrough': {
                'chinese': '我在[输入具体难点]这个部分一直不理解，请详细讲解',
                'english': 'I don\'t understand the [input specific difficulty] part, please explain it in detail',
                'spanish': 'No entiendo la parte [dificultad específica de entrada], por favor explique en detalle',
                'french': 'Je ne comprends pas la partie [difficulté spécifique saisie], veuillez l\'expliquer en détail',
                'german': 'Ich verstehe den Teil [eingegebene spezifische Schwierigkeit] nicht, bitte erklären Sie ihn detailliert',
                'japanese': '[入力された具体的な困難]の部分がずっと理解できません、詳しく説明してください',
                'korean': '[입력된 구체적인 어려움] 부분을 계속 이해하지 못합니다, 자세히 설명해주세요',
                'portuguese': 'Não entendo a parte [dificuldade específica inserida], por favor explique em detalhes'
            },
            'extend': {
                'chinese': '请从[输入知识点]扩展讲解相关的知识内容',
                'english': 'Please expand and explain the related knowledge content from [input knowledge point]',
                'spanish': 'Por favor, expanda y explique el contenido de conocimiento relacionado de [punto de conocimiento de entrada]',
                'french': 'Veuillez développer et expliquer le contenu de connaissance connexe à partir de [point de connaissance saisi]',
                'german': 'Bitte erklären und erweitern Sie verwandte Inhalte basierend auf [eingegebenem Wissenspunkt]',
                'japanese': '[入力知識ポイント]から拡張して関連知識内容を説明してください',
                'korean': '[입력 지식 포인트]에서 확장하여 관련 지식 내용을 설명해주세요',
                'portuguese': 'Por favor, expanda e explique o conteúdo de conhecimento relacionado a partir de [ponto de conhecimento inserido]'
            },
            'summary': {
                'chinese': '请帮我总结和复习[输入科目/单元]的重点内容',
                'english': 'Please help me summarize and review the key content of [input subject/unit]',
                'spanish': 'Por favor, ayúdame a resumir y revisar el contenido clave de [asignatura/unidad de entrada]',
                'french': 'Veuillez m\'aider à résumer et à examiner le contenu clé de [sujet/unité saisi]',
                'german': 'Bitte helfen Sie mir, die wichtigsten Inhalte von [eingegebenem Fach/Einheit] zusammenzufassen und zu überprüfen',
                'japanese': '[入力科目/ユニット]の重要な内容をまとめて復習するのを手伝ってください',
                'korean': '[입력 과목/단원]의 핵심 내용을 정리하고 검토하는 것을 도와주세요',
                'portuguese': 'Por favor, me ajude a resumir e revisar o conteúdo-chave de [assunto/unidade inserido]'
            }
        };

        // Get the current language code from currentLanguage (chinese, english, spanish, etc.)
        const langCode = this.currentLanguage || 'chinese';
        const prompts = templatePrompts[template];

        if (prompts) {
            const prompt = prompts[langCode] || prompts['chinese'];
            if (this.chatInput) {
                this.chatInput.value = prompt;
                this.chatInput.focus();
            }
        }
    }

    /**
     * 将文本按句子分割并包装成 span 元素
     * 支持中英文混合的文本
     */
    wrapSentences(text) {
        // 分割句子的正则表达式（支持中文和英文）
        // 中文句号：。？！
        // 英文句号：. ? !
        const sentenceRegex = /([^。？！.!?\n]+[。？！.!?]?)/g;
        const sentences = [];
        let match;

        while ((match = sentenceRegex.exec(text)) !== null) {
            // FIX: Don't trim sentences - preserve original spacing for accurate character position mapping
            const sentence = match[0];
            if (sentence.trim().length > 0) {
                sentences.push(sentence);
            }
        }

        return sentences;
    }

    /**
     * 将文本转换为带有句子索引的 HTML
     * 用于在朗读时进行高亮
     */
    formatTextWithSentenceIndices(text) {
        const sentences = this.wrapSentences(text);
        let html = '';

        sentences.forEach((sentence, index) => {
            // 转义 HTML 特殊字符
            const escapedSentence = sentence
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            html += `<span data-sentence-index="${index}" class="sentence">${escapedSentence}</span>`;

            // 添加空格（在句子之间）
            if (index < sentences.length - 1) {
                html += ' ';
            }
        });

        return html;
    }

    /**
     * 在 DOM 元素中包装文本节点的句子，添加 data-sentence-index 属性
     * 用于在朗读时进行高亮
     */
    wrapSentencesInElement(element) {
        let sentenceIndex = 0;

        const processNode = (node) => {
            if (node.nodeType === 3) { // 文本节点
                const text = node.textContent;
                const sentences = this.wrapSentences(text);

                if (sentences.length === 0) {
                    return;
                }

                // 创建一个 fragment 来替换文本节点
                const fragment = document.createDocumentFragment();

                sentences.forEach((sentence, index) => {
                    const span = document.createElement('span');
                    span.setAttribute('data-sentence-index', sentenceIndex.toString());
                    span.className = 'sentence';
                    // FIX: Don't trim the sentence - preserve original spacing for accurate mapping
                    span.textContent = sentence;
                    fragment.appendChild(span);

                    // 在句子之间添加空格（但不在最后）
                    if (index < sentences.length - 1) {
                        // Add a single space node to match plainText spacing
                        fragment.appendChild(document.createTextNode(' '));
                    }

                    sentenceIndex++;
                });

                // 用 fragment 替换文本节点
                node.parentNode.replaceChild(fragment, node);
            } else if (node.nodeType === 1) { // 元素节点
                // 对于某些特殊的元素，我们跳过处理（比如代码块）
                if (node.tagName !== 'CODE' && node.tagName !== 'PRE') {
                    const childNodes = Array.from(node.childNodes);
                    childNodes.forEach(child => {
                        processNode(child);
                    });
                }
            }
        };

        processNode(element);
    }

    async speakText(text, lang = 'zh-CN', elementId = null) {
        /**
         * 使用 Web Speech API 读出文本
         * 对学习困难的学生友好 - 优化的语音参数
         * @param {string} text - 要读出的文本
         * @param {string} lang - 语言代码（默认 zh-CN）
         * @param {string} elementId - 要同步滚动的元素 ID
         */
        // 停止当前的读出
        if (this.isSpeaking) {
            window.speechSynthesis.cancel();
            this.isSpeaking = false;
            return;
        }

        // 提取纯文本（移除HTML标签）
        let plainText = text;

        // 如果文本包含 HTML 标签，则需要提取纯文本
        if (text.includes('<') && text.includes('>')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            plainText = tempDiv.innerText || tempDiv.textContent;
        }

        if (!plainText.trim()) {
            alert('没有内容可以读出');
            return;
        }

        // 创建语音对象
        const utterance = new SpeechSynthesisUtterance(plainText);

        // 设置语言（根据当前选择的语言）
        const langMap = {
            'chinese': 'zh-CN',
            'english': 'en-US',
            'spanish': 'es-ES',
            'french': 'fr-FR',
            'german': 'de-DE',
            'japanese': 'ja-JP',
            'korean': 'ko-KR',
            'portuguese': 'pt-BR'
        };
        utterance.lang = langMap[this.currentLanguage] || 'zh-CN';

        // 获取可用的语音列表，选择最合适的高质量语音
        let voices = window.speechSynthesis.getVoices();

        // 如果语音列表为空，等待加载
        if (voices.length === 0) {
            // Chrome 和某些浏览器需要等待 voiceschanged 事件
            await new Promise(resolve => {
                window.speechSynthesis.onvoiceschanged = () => {
                    voices = window.speechSynthesis.getVoices();
                    resolve();
                };
                // 如果 5 秒后仍未加载，继续
                setTimeout(resolve, 5000);
            });
        }

        let selectedVoice = null;

        const currentLangCode = utterance.lang;

        // Safari特定的优化 - Safari有其特定的语音库
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

        // Safari语音优先级映射（Safari上高质量的本地语音）
        const safariVoiceMap = {
            'zh-CN': ['Ting Ting', 'Huihui', 'Liang Liang'],  // Safari中文语音
            'en-US': ['Samantha', 'Victoria', 'Karen'],
            'es-ES': ['Monica'],
            'fr-FR': ['Amelie'],
            'de-DE': ['Anna'],
            'ja-JP': ['Kyoko'],
            'ko-KR': ['Sanook'],
            'pt-BR': ['Luciana']
        };

        // 如果是Safari，优先使用Safari优化的语音列表
        if (isSafari) {
            const preferredNames = safariVoiceMap[currentLangCode] || [];
            for (let prefName of preferredNames) {
                const voice = voices.find(v => v.name.includes(prefName));
                if (voice) {
                    selectedVoice = voice;
                    break;
                }
            }
        }

        // 如果没有找到Safari优化的语音，或者不是Safari浏览器，查找该语言的任何语音
        if (!selectedVoice) {
            const langVoices = voices.filter(v => {
                const voiceLang = v.lang.split('-')[0];
                const targetLang = currentLangCode.split('-')[0];
                return voiceLang === targetLang;
            });

            if (langVoices.length > 0) {
                // 优先选择本地语音（质量通常更好）
                selectedVoice = langVoices.find(v => v.localService === true) || langVoices[0];
            }
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log('Selected voice:', selectedVoice.name, 'lang:', selectedVoice.lang, 'local:', selectedVoice.localService);
        } else {
            console.log('No matching voice found for language:', currentLangCode);
            console.log('Available voices:', voices.map(v => v.name + ' (' + v.lang + ')' + (v.localService ? ' [local]' : '')));
        }

        // Get reading speed from user settings
        const baseRate = 0.85;  // Default reading speed
        const readingSpeedMultiplier = (this.settings.accessibilitySettings && this.settings.accessibilitySettings.readingSpeed) || 1;
        const finalRate = baseRate * readingSpeedMultiplier;

        // Safari特定的参数优化 - 恢复原音调，适度调整速度
        if (isSafari) {
            // Safari对语速和音调的处理与Chrome不同
            utterance.rate = finalRate;     // 应用用户设置的速率
            utterance.pitch = 1.0;     // 恢复原来的音调
            utterance.volume = 1.0;    // 完整音量

            console.log('Safari Speech Parameters:', {
                rate: finalRate,
                baseRate: baseRate,
                readingSpeedMultiplier: readingSpeedMultiplier,
                pitch: 1.0,
                volume: 1.0,
                selectedVoice: selectedVoice ? selectedVoice.name : 'default'
            });
        } else {
            utterance.rate = finalRate;     // 应用用户设置的速率
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
        }


        // 事件处理
        utterance.onstart = () => {
            this.isSpeaking = true;
            console.log('开始朗读');
        };

        // 获取已经包装好的sentence spans（而不是重新分割）
        let sentenceSpans = [];
        let sentenceCharPositions = [];
        let charCount = 0;

        if (elementId) {
            const container = document.getElementById(elementId);
            if (container) {
                sentenceSpans = Array.from(container.querySelectorAll('span[data-sentence-index]'));
                console.log(`[speakText] Found ${sentenceSpans.length} sentence spans in ${elementId}`);
                console.log(`[speakText] plainText length: ${plainText.length}`);
                console.log(`[speakText] plainText preview: ${plainText.substring(0, 100)}`);

                // FIX: Use plainText directly to find sentence positions
                // This ensures perfect alignment with the actual speech synthesis text
                let charPos = 0;
                sentenceSpans.forEach((span, idx) => {
                    const sentenceText = span.textContent;
                    const sentenceTrimmed = sentenceText.trim();

                    // First try to find the trimmed text
                    let foundIndex = plainText.indexOf(sentenceTrimmed, Math.max(0, charPos - 50));

                    // If not found, try with original spacing
                    if (foundIndex < 0) {
                        foundIndex = plainText.indexOf(sentenceText, Math.max(0, charPos - 50));
                    }

                    if (foundIndex >= 0) {
                        sentenceCharPositions.push({
                            index: idx,
                            start: foundIndex,
                            end: foundIndex + sentenceTrimmed.length,
                            text: sentenceTrimmed,
                            element: span
                        });
                        charPos = foundIndex + sentenceTrimmed.length;
                        console.log(`[speakText] Sentence ${idx}: "${sentenceTrimmed.substring(0, 30)}..." pos ${foundIndex}-${foundIndex + sentenceTrimmed.length}`);
                    } else {
                        console.warn(`[speakText] Could not find sentence in plainText: "${sentenceTrimmed.substring(0, 30)}..."`);
                        // Fallback: use character count approximation
                        sentenceCharPositions.push({
                            index: idx,
                            start: charPos,
                            end: charPos + sentenceTrimmed.length,
                            text: sentenceTrimmed,
                            element: span
                        });
                        charPos += sentenceTrimmed.length + 1; // +1 for space
                    }
                });
            }
        }

        let currentHighlightedSentenceIndex = -1;

        // 同步滚动和高亮处理
        if (elementId && sentenceSpans.length > 0) {
            utterance.onboundary = (event) => {
                const container = document.getElementById(elementId);
                if (container && event.charIndex !== undefined) {
                    const charIndex = event.charIndex;
                    console.log(`[onboundary] charIndex: ${charIndex}, total sentences: ${sentenceCharPositions.length}`);

                    // FIX: Proper sentence boundary detection
                    // Find the sentence that contains this character position
                    let currentSentenceIndex = -1;
                    for (let pos of sentenceCharPositions) {
                        // Use proper boundary: >= start AND < end (not <=)
                        // This prevents overlap with the next sentence
                        if (charIndex >= pos.start && charIndex < pos.end) {
                            currentSentenceIndex = pos.index;
                            console.log(`[onboundary] Found sentence index: ${currentSentenceIndex} (pos: ${pos.start}-${pos.end})`);
                            break;
                        }
                    }

                    // If not found in exact range, find the closest sentence after this position
                    if (currentSentenceIndex === -1) {
                        for (let pos of sentenceCharPositions) {
                            if (charIndex < pos.start) {
                                currentSentenceIndex = pos.index;
                                console.log(`[onboundary] Using next sentence: ${currentSentenceIndex}`);
                                break;
                            }
                        }
                    }

                    // 更新高亮和滚动
                    if (currentSentenceIndex !== currentHighlightedSentenceIndex && currentSentenceIndex >= 0) {
                        // 取消前一句的高亮
                        if (currentHighlightedSentenceIndex >= 0 && sentenceSpans[currentHighlightedSentenceIndex]) {
                            const prevSpan = sentenceSpans[currentHighlightedSentenceIndex];
                            prevSpan.style.backgroundColor = 'transparent';
                            prevSpan.style.borderRadius = '';
                            prevSpan.style.padding = '';
                            prevSpan.style.transition = '';
                        }

                        // 高亮当前句子
                        if (sentenceSpans[currentSentenceIndex]) {
                            const currentSpan = sentenceSpans[currentSentenceIndex];
                            currentSpan.style.backgroundColor = readAloudColors.highlightBg;
                            currentSpan.style.borderRadius = readAloudColors.highlightBorderRadius;
                            currentSpan.style.padding = readAloudColors.highlightPadding;
                            currentSpan.style.transition = 'background-color 0.05s ease';

                            // 立即滚动到当前句子（不使用smooth，改为instant以减少延迟）
                            try {
                                currentSpan.scrollIntoView({
                                    behavior: 'auto',  // Changed from 'smooth' to 'auto' for faster response
                                    block: 'nearest'    // Changed from 'center' to 'nearest' for minimal scroll
                                });
                            } catch (e) {
                                console.log('scrollIntoView 出错:', e);
                            }
                        }

                        currentHighlightedSentenceIndex = currentSentenceIndex;
                        console.log(`高亮句子: ${currentSentenceIndex}`);
                    }
                }
            };
        }

        utterance.onend = () => {
            this.isSpeaking = false;
            console.log('朗读完成');
            // 朗读完成后清除所有高亮
            if (elementId) {
                const container = document.getElementById(elementId);
                if (container) {
                    // 清除所有高亮
                    const highlightedSpans = container.querySelectorAll('span[data-sentence-index]');
                    highlightedSpans.forEach(span => {
                        span.style.backgroundColor = 'transparent';
                        span.style.borderRadius = '';
                        span.style.padding = '';
                        span.style.transition = '';
                    });
                    // 滚动到底部
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight;
                    }, 100);
                }
            }
        };

        utterance.onerror = (event) => {
            console.error('朗读错误:', event.error);
            this.isSpeaking = false;
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    stopSpeaking() {
        /**
         * 停止读出声音并清除所有高亮
         */
        if (this.isSpeaking) {
            window.speechSynthesis.cancel();
            this.isSpeaking = false;

            // 清除所有的高亮
            const highlightedSpans = document.querySelectorAll('span[data-sentence-index]');
            highlightedSpans.forEach(span => {
                span.style.backgroundColor = 'transparent';
                span.style.borderRadius = '';
                span.style.padding = '';
                span.style.transition = '';
            });
        }
    }

    speakChatMessages() {
        /**
         * 读出聊天中的所有 AI 消息
         * 并在朗读时高亮和滚动到对应句子
         */
        // 收集所有 AI 消息
        const chatMessages = document.querySelectorAll('.chat-message.assistant .chat-bubble');
        if (chatMessages.length === 0) {
            alert('没有 AI 回复可以读出');
            return;
        }

        // 获取 chat-messages 容器
        const chatMessagesContainer = document.getElementById('chat-messages');
        if (!chatMessagesContainer) {
            alert('聊天容器未找到');
            return;
        }

        // 首先，为所有 AI 消息包装句子索引
        chatMessages.forEach((msg) => {
            this.wrapSentencesInElement(msg);
        });

        // 提取所有AI消息的文本并合并
        let allText = '';
        chatMessages.forEach((msg, index) => {
            const text = msg.innerText || msg.textContent;
            if (text.trim()) {
                allText += text.trim();
                if (index < chatMessages.length - 1) {
                    allText += '\n\n';
                }
            }
        });

        if (allText.trim()) {
            // 获取 chat-messages 的 ID 或创建一个临时引用
            this.speakText(allText, this.currentLanguage, 'chat-messages');
        } else {
            alert('没有内容可以读出');
        }
    }

    wrapUnmatchedMath(text) {
        /**
         * Auto-wrap unmatched math expressions with $...$
         * 【重要】严格处理，避免误包装列表项
         * 1. 跳过列表项（以数字或符号开头）
         * 2. 只包装真正的数学内容
         * 3. 修复不匹配的 $ 符号
         * 4. 移除孤立的 $ 符号
         */
        if (!text) return text;

        let result = text;

        // 【第一步】移除 ### 符号（如果存在）
        result = result.replace(/^###\s+/gm, '');

        // 【第二步】首先移除已存在的孤立 $ 符号（行首或行末的单个 $）
        // 这避免了在处理中重复出现
        result = result.split('\n').map(line => {
            // 移除行首的孤立 $
            line = line.replace(/^\$\s+/, '');
            // 移除行末的孤立 $
            line = line.replace(/\s+\$\s*$/, '');
            // 移除只是 $ 的行
            if (line.trim() === '$') {
                return '';
            }
            return line;
        }).join('\n');

        // 【第三步】修复不匹配的 $ 符号
        result = result.split('\n').map(line => {
            const dollarCount = (line.match(/\$/g) || []).length;

            // 如果 $ 数量是奇数，说明有不匹配
            if (dollarCount % 2 === 1) {
                // 找到最后一个 $，检查是否应该关闭
                const lastDollarIdx = line.lastIndexOf('$');
                if (lastDollarIdx !== -1) {
                    const afterDollar = line.substring(lastDollarIdx + 1).trim();
                    // 只在末尾有明确的数学符号后内容时添加关闭 $（不是纯文本）
                    if (afterDollar && afterDollar.length < 20 && afterDollar.match(/^[\d\s.,:;）】\]]+$/)) {
                        return line + '$';
                    }
                }
            }

            return line;
        }).join('\n');

        // 【第四步】检测并包装包含数学符号的句子
        result = result.split('\n').map(line => {
            // 跳过已经正确包装的行（偶数个$符号）
            const dollarCount = (line.match(/\$/g) || []).length;
            if (dollarCount % 2 === 0 && dollarCount > 0) {
                return line; // 已正确包装，跳过
            }

            // 【关键】跳过列表项：以数字、符号、或标题开头（包括中文列表符号）
            if (line.match(/^(\d+\.|[-•*－—]|#|【|[①②③④⑤]|题目|答案|解析|分析|Question|Answer|Analysis|Solution)/i)) {
                return line;
            }

            // 【关键】跳过太短的行（避免误包装）
            if (line.trim().length < 5) {
                return line;
            }

            // 检查是否包含数学内容（但排除列表）
            // 【非常保守的匹配】只匹配非常明确的数学模式
            // MUST NOT wrap regular text with single letters
            const hasMathContent =
                // LaTeX commands like \frac, \sqrt, \sin, etc.
                /\\[a-z]+\{/i.test(line) ||
                // Explicit equations with operators: "x = 5", "2x + 3"
                /[a-zA-Z0-9]\s*[\+\-\*\/\=\±]\s*[a-zA-Z0-9]/.test(line) ||
                // Powers and exponents: "x^2", "y^3"
                /[a-zA-Z0-9]\^[0-9]/.test(line) ||
                // Subscripts: "x_1", "a_b" (but not common English like "T_his")
                /[a-z0-9]_[0-9]/.test(line) ||
                // Greek letters or special math symbols
                /[Δ∆β∂∫∑√π∞]/.test(line) ||
                // Scientific notation: 1e-5, 2.5e+3
                /\d+\.?\d*[eE][\+\-]?\d+/.test(line) ||
                // Multiple variables with operators: x=y, x+y, etc
                /[xy]\s*[\+\-\*\/\=\<\>]\s*[xy0-9]/.test(line) ||
                // Matrix or vector notation [...]
                /\[[\s\d,\-\.\+*\/e]+\]/.test(line) ||
                // Fractions: "1/2", "3/4"
                /\d+\s*\/\s*\d+/.test(line) ||
                // Parentheses with operations: "(x+1)", "(a-b)"
                /\([a-zA-Z0-9\+\-\*\/\s]+\)/.test(line) ||
                // Common math expressions with multiple terms
                /[a-zA-Z0-9]+\s*[\+\-]\s*[a-zA-Z0-9]+\s*[\+\-]\s*[a-zA-Z0-9]+/.test(line);

            if (hasMathContent && !line.includes('$')) {
                return `$${line}$`;
            }

            return line;
        }).join('\n');

        return result;
    }

    formatChatResponse(text) {
        /**
         * 格式化 AI 响应文本 - 简化版本，更可靠
         * 按照格式标准处理：
         * - 【标题】分隔各部分
         * - 编号列表（1. 标签：内容）用蓝色标签
         * - 符号列表（- 标签：内容）用蓝色标签
         * - 适当分行和间距
         */
        if (!text) return '';

        let html = text;

        // 1. Try to extract explanation field from JSON if present
        try {
            if (html.trim().startsWith('{')) {
                const parsed = JSON.parse(html);
                if (parsed.explanation) html = parsed.explanation;
            }
        } catch (e) {
            // Not JSON, continue
        }

        // 2. Remove Markdown heading symbols
        html = html.replace(/^#+\s*/gm, '');  // Remove #, ##, ### from line start
        html = html.replace(/\s+#+\s*/g, ' ');  // Remove middle ###

        // 3. 【KEY】Ensure section titles 【Title】 have blank lines before and after
        // This ensures they are treated as separate sections
        html = html.replace(/^(【[^】]+】)\s*$/gm, '\n\n$1\n\n');  // Section title alone on line
        html = html.replace(/(【[^】]+】)\s+([^\n])/gm, '$1\n\n$2');  // Title with same-line content

        // 4. 【KEY】Process numbered lists: "1. Label: Content"
        // Format: create blue span for label, add blank lines around
        // 【重要】不使用 ^ 锚点，因为列表项可能不在行首（可能在同一行中）
        // 使用更灵活的模式，可以匹配任何位置的 "数字. 标签:"
        html = html.replace(/(\d+)\.\s+([^:\n]+):\s*([\s\S]*?)(?=\s\d+\.|\n【|$)/g, (match, num, label, content) => {
            const contentTrimmed = content.trim();
            return `\n\n<span style="color: #007bff; font-weight: 600; font-size: 1.05em; display: block; margin-bottom: 6px;">${num}. ${label}:</span>\n${contentTrimmed}\n\n`;
        });

        // 5. Process bullet lists: "- Label: Content" or "• Label: Content"
        html = html.replace(/^([-•*])\s+([^:\n]+):\s*([\s\S]*?)(?=\n\n|\n[-•*]|\n【|$)/gm, (match, bullet, label, content) => {
            const contentTrimmed = content.trim();
            return `\n\n<span style="color: #007bff; font-weight: 600; font-size: 1.05em; display: block; margin-bottom: 6px;">${bullet} ${label}:</span>\n${contentTrimmed}\n\n`;
        });

        // 6. Handle list items without colons (simple bullet points)
        html = html.replace(/^(\d+)\.\s+(?!.*:)(.+)$/gm, '\n\n<li style="margin-left: 20px; margin-bottom: 8px;">$1. $2</li>\n\n');
        html = html.replace(/^([-•*])\s+(?!.*:)(.+)$/gm, '\n\n<li style="margin-left: 20px; margin-bottom: 8px;">$1 $2</li>\n\n');

        // 7. Handle bold **text**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #007bff; font-weight: 600;">$1</strong>');

        // 8. Handle italic *text* (not already part of bold)
        html = html.replace(/(?<!\*)\*([^\*]+)\*(?!\*)/g, '<em style="color: #666; font-style: italic;">$1</em>');

        // 9. Handle code blocks ```code```
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
            return '<div style="background-color: #f5f5f5; border-left: 3px solid #007bff; padding: 12px; margin: 12px 0; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 0.9em; color: #333;"><code>' + code.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></div>';
        });

        // 10. Handle inline code `code`
        html = html.replace(/`([^`]+)`/g, '<code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #d63384;">$1</code>');

        // 11. 【KEY】Convert blank lines to paragraph breaks
        // First protect section titles and block elements
        let protectedHtml = html;
        protectedHtml = protectedHtml.replace(/(【[^】]+】)/g, '\n:::PROTECT_TITLE:::$1:::END_PROTECT:::\n');
        protectedHtml = protectedHtml.replace(/(<div|<li|<code)/g, '\n:::PROTECT_BLOCK:::$&');

        // Convert double newlines to paragraph separator
        protectedHtml = protectedHtml.replace(/\n\n+/g, ':::PARA_BREAK:::');
        // Convert single newlines to <br> (but not around protected content)
        protectedHtml = protectedHtml.replace(/\n(?!:::)/g, '<br>');
        // Restore paragraph breaks with </p><p>
        protectedHtml = protectedHtml.replace(/:::PARA_BREAK:::/g, '</p><p style="margin: 0 0 12px 0; line-height: 1.8; color: #333;">');
        // Restore protected titles
        protectedHtml = protectedHtml.replace(/:::PROTECT_TITLE:::(【[^】]+】):::END_PROTECT:::/g, (match, title) => {
            return `</p><div style="margin-top: 16px; margin-bottom: 12px; padding-bottom: 8px; font-size: 1.05em; font-weight: 600; color: #333; border-bottom: 1px solid #f0f0f0;">${title}</div><p style="margin: 0 0 12px 0; line-height: 1.8; color: #333;">`;
        });
        protectedHtml = protectedHtml.replace(/:::PROTECT_BLOCK:::/g, '\n$&');

        html = protectedHtml;

        // 12. Wrap in paragraph tags if not already wrapped
        if (!html.includes('<p>')) {
            html = '<p style="margin: 0 0 12px 0; line-height: 1.8; color: #333;">' + html + '</p>';
        } else {
            html = '<p style="margin: 0 0 12px 0; line-height: 1.8; color: #333;">' + html + '</p>';
        }

        // 13. Clean up orphaned $ symbols (preserve math expressions)
        html = html.split(/(\$[\s\S]*?\$)/).map((part, idx) => {
            if (idx % 2 === 0) {
                // Regular text: remove orphaned $
                return part.replace(/\$(?!\$)/g, '');
            }
            return part;  // Keep math expressions
        }).join('');

        return html;
    }

    async submitChat() {
        // Re-query elements to ensure they exist
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        const chatSubmitBtn = document.getElementById('chat-submit-btn');

        let question = chatInput ? chatInput.value.trim() : '';

        // If no text question but file is uploaded, allow it
        if (!question && !this.currentChatFile) {
            alert('请输入问题或上传文件');
            return;
        }

        if (!chatMessages) {
            alert('聊天框未找到，请刷新页面');
            console.error('chat-messages element not found');
            return;
        }

        // Disable submit button
        if (chatSubmitBtn) {
            chatSubmitBtn.disabled = true;
        }

        // Append file content to question if file is uploaded
        if (this.currentChatFile) {
            const fileContent = this.currentChatFile.content;
            const fileName = this.currentChatFile.name;
            if (question) {
                question += `\n\n【上传文件：${fileName}】\n${fileContent}`;
            } else {
                question = `【上传文件：${fileName}】\n${fileContent}`;
            }
        }

        // Clear input
        if (chatInput) {
            chatInput.value = '';
        }

        // Clear file and file info display
        this.currentChatFile = null;
        const chatFileInfo = document.getElementById('chat-file-info');
        const chatFileInput = document.getElementById('chat-file-input');
        if (chatFileInfo) {
            chatFileInfo.style.display = 'none';
        }
        if (chatFileInput) {
            chatFileInput.value = '';
        }

        // Clear suggestions when sending a new message
        this.updateSuggestedQuestions([]);

        // Remove empty message if exists
        const emptyMsg = chatMessages.querySelector('.chat-empty-message');
        if (emptyMsg) {
            emptyMsg.remove();
        }

        // Display user message immediately
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chat-message user';
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble';
        userBubble.textContent = question;
        const userTimestamp = document.createElement('div');
        userTimestamp.className = 'chat-timestamp';
        userTimestamp.textContent = new Date().toLocaleTimeString();
        userMessageDiv.appendChild(userBubble);
        userMessageDiv.appendChild(userTimestamp);
        chatMessages.appendChild(userMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add to chat history
        this.chatHistory.push({
            role: 'user',
            content: question,
            timestamp: new Date().toISOString()
        });

        // Check if user is confirming no more questions (for practice suggestion)
        // If they are, show practice suggestion instead of asking AI
        const isConfirmingNoMoreQuestions = this.detectConfirmingAnswer(question);

        if (isConfirmingNoMoreQuestions) {
            console.log('[Chat] ✓ User confirmed no more questions!');

            // User confirmed no more questions - show practice suggestion
            // Use lastLearningTopic if available, otherwise try to extract from chat history
            let topicForSuggestion = this.lastLearningTopic;

            if (!topicForSuggestion && this.chatHistory.length > 1) {
                // Try to extract topic from the first user message (skip the current "no" message)
                const firstMessage = this.chatHistory.find(msg => msg.role === 'user' && !this.detectConfirmingAnswer(msg.content));
                if (firstMessage) {
                    topicForSuggestion = firstMessage.content.substring(0, 100);
                }
            }

            if (topicForSuggestion) {
                console.log('[Chat] User confirmed. Showing practice suggestion for:', topicForSuggestion);
                await this.showPracticeSuggestion(topicForSuggestion);
                return;  // 重要：不要继续执行下面的AI聊天逻辑
            } else {
                console.log('[Chat] No topic found for suggestion, but user confirmed no more questions');
                // Still prevent AI chat even if we don't have a topic
                // Just let the user see they confirmed
                return;
            }
        } else {
            // Normal conversation - send to AI

            // Create AI message container with loading state
            const aiMessageId = `ai-msg-${Date.now()}`;
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'chat-message assistant';
            const aiBubble = document.createElement('div');
            aiBubble.id = aiMessageId;
            aiBubble.className = 'chat-bubble';
            const thinkingMsg = this.currentLanguage === 'chinese' ? '⏳ AI正在思考中...' : '⏳ AI is thinking...';
            aiBubble.textContent = thinkingMsg;
            const aiTimestamp = document.createElement('div');
            aiTimestamp.className = 'chat-timestamp';
            aiTimestamp.textContent = new Date().toLocaleTimeString();
            aiMessageDiv.appendChild(aiBubble);
            aiMessageDiv.appendChild(aiTimestamp);
            chatMessages.appendChild(aiMessageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            try {
                // Try non-streaming first (more reliable)
                await this.attemptNonStreamingChat(question, aiMessageId, chatMessages);
            } catch (error) {
                console.error('Chat error:', error);
                const messageContainer = document.getElementById(aiMessageId);
                if (messageContainer) {
                    let errorMsg = error.message || error.toString();

                    // Parse and format error message
                    if (errorMsg.includes('Failed to fetch')) {
                        errorMsg = '❌ 无法连接后端服务\n\n请检查：\n1. 后端是否运行？\n   cd backend\n   python app.py\n2. 端口是否正确？应为 5001\n3. API 地址？应为 http://localhost:5001/api';
                    } else if (errorMsg.includes('HTTP')) {
                        // Extract HTTP error
                        const httpMatch = errorMsg.match(/HTTP \d+/);
                        if (httpMatch) {
                            errorMsg = `❌ 服务器错误 (${httpMatch[0]})\n\n请查看浏览器控制台获取详细信息\n(F12 -> Console)`;
                        }
                    } else if (errorMsg.includes('ZHIPU_API_KEY')) {
                        errorMsg = '❌ API 密钥未设置\n\n在后端目录运行：\nexport ZHIPU_API_KEY="your-key"\npython app.py';
                    } else if (errorMsg === 'Load failed') {
                        errorMsg = '❌ 后端返回加载失败\n\n可能原因：\n• AI 服务初始化失败\n• API 密钥无效\n• 网络连接问题\n\n请检查后端日志';
                    }

                    messageContainer.textContent = errorMsg;
                    messageContainer.style.whiteSpace = 'pre-wrap';
                    messageContainer.style.fontSize = '0.9em';
                    messageContainer.style.lineHeight = '1.6';
                }
            }
        }

        // Always execute finally block
        if (chatSubmitBtn) {
            chatSubmitBtn.disabled = false;
        }
        if (chatInput) {
            chatInput.focus();
        }
        this.saveChatHistory();
    }

    async attemptStreamingChat(question, aiMessageId, chatMessages) {
        console.log('Attempting streaming chat...');
        const response = await fetch(`${API_BASE_URL}/ai/chat-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
        });

        console.log('Streaming response status:', response.status);

        if (!response.ok) {
            let errorMsg = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Ignore JSON parse error
            }
            throw new Error(errorMsg);
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        let buffer = '';

        // Clear loading message
        const messageContainer = document.getElementById(aiMessageId);
        if (!messageContainer) {
            throw new Error('消息容器未找到');
        }
        messageContainer.textContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // Process complete lines (keep last incomplete line in buffer)
            for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i];

                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();

                    if (data === '[DONE]') {
                        console.log('Stream complete');
                    } else if (data && data !== '' && !data.startsWith('Error:')) {
                        // Append to response
                        aiResponse += data;
                        messageContainer.textContent = aiResponse;
                        if (chatMessages) {
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    }
                }
            }

            // Keep the last incomplete line in buffer
            buffer = lines[lines.length - 1];
        }

        // Process any remaining data in buffer
        if (buffer && buffer.startsWith('data: ')) {
            const data = buffer.slice(6).trim();
            if (data && data !== '[DONE]' && !data.startsWith('Error:')) {
                aiResponse += data;
                messageContainer.textContent = aiResponse;
            }
        }

        // 清理LaTeX，然后格式化最终的流式响应
        let cleanedAiResponse = this.cleanupComplexLatex(aiResponse);
        messageContainer.innerHTML = this.formatChatResponse(cleanedAiResponse);

        // 包装句子以便在朗读时高亮
        this.wrapSentencesInElement(messageContainer);

        // Render LaTeX formulas with MathJax
        if (window.MathJax) {
            setTimeout(() => {
                window.MathJax.typesetPromise([messageContainer]).catch(err => {
                    console.log('MathJax rendering error:', err);
                });
            }, 100);
        }

        // Add AI response to history only if we got content
        if (aiResponse) {
            this.chatHistory.push({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date().toISOString()
            });

            // Store for save functionality
            this.currentChatContent = {
                question: question,
                answer: aiResponse,
                timestamp: new Date().toISOString()
            };

            // Show save button for AI Chat
            if (this.saveChatBtn) this.saveChatBtn.style.display = 'block';
        } else {
            throw new Error('未收到AI回复');
        }
    }

    /**
     * Parse AI response to check if it's a command
     */
    parseCommandResponse(responseText) {
        try {
            // Trim the response text
            const text = responseText.trim();

            // Try multiple strategies to find and parse JSON

            // Strategy 1: Look for JSON object enclosed in curly braces
            let jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                // Strategy 2: If response starts with { and is likely JSON
                if (text.startsWith('{')) {
                    jsonMatch = [text];
                } else {
                    // Strategy 3: Look for JSON after newlines
                    const lines = text.split('\n');
                    for (const line of lines) {
                        if (line.trim().startsWith('{')) {
                            jsonMatch = line.trim().match(/\{[\s\S]*\}/);
                            if (jsonMatch) break;
                        }
                    }
                }
            }

            if (!jsonMatch) {
                console.log('[Command Parser] No JSON found in response');
                return null;
            }

            let parsed;
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
                console.warn('[Command Parser] Failed to parse JSON:', parseError);
                // Try to clean up and parse again
                let cleanedJson = jsonMatch[0]
                    .replace(/\/\/.*$/gm, '') // Remove comments
                    .replace(/,\s*}/g, '}')   // Remove trailing commas
                    .replace(/,\s*]/g, ']');
                parsed = JSON.parse(cleanedJson);
            }

            // Check if it's a valid command object
            if (parsed.isCommand === true && parsed.action && parsed.params) {
                console.log('[Command Parser] Valid command detected:', parsed.action);
                return {
                    isCommand: true,
                    action: parsed.action,
                    params: parsed.params,
                    explanation: parsed.explanation || '指令已执行'
                };
            }

            console.log('[Command Parser] JSON found but not a valid command:', parsed);
            return null;
        } catch (error) {
            console.error('[Command Parser] Error parsing command:', error);
            return null;
        }
    }

    /**
     * Execute a command based on action and parameters
     */
    async executeCommand(command) {
        try {
            console.log('[Command Executor] Executing command:', command.action, command.params);

            switch (command.action) {
                case 'generate-questions':
                    return await this.handleCommandGenerateQuestions(command.params);
                case 'check-answer':
                    return await this.handleCommandCheckAnswer(command.params);
                case 'generate-plan':
                    return await this.handleCommandGeneratePlan(command.params);
                case 'practice':
                    return await this.handleCommandPractice(command.params);
                default:
                    console.warn('[Command Executor] Unknown command:', command.action);
                    return null;
            }
        } catch (error) {
            console.error('[Command Executor] Error executing command:', error);
            throw error;
        }
    }

    /**
     * Build requirement text in the current language
     */
    buildRequirementText(params, includeAnalysis = true) {
        const lang = this.currentLanguage || 'english';
        let requirement = '';

        // Multi-language templates
        if (lang === 'chinese') {
            if (params.quantity && params.subject) {
                requirement = `请出${params.quantity}道关于${params.subject}的题目`;
            } else if (params.subject) {
                requirement = `请出关于${params.subject}的题目`;
            } else {
                requirement = '请出题目';
            }

            if (params.difficulty && params.difficulty !== 'intermediate') {
                const diffMap = { 'easy': '简单', 'hard': '困难' };
                requirement += `（难度：${diffMap[params.difficulty] || params.difficulty}）`;
            }

            if (includeAnalysis) {
                requirement += '，需要包含详细的答案和解析';
            }
        } else {
            // English
            if (params.quantity && params.subject) {
                requirement = `Please generate ${params.quantity} questions about ${params.subject}`;
            } else if (params.subject) {
                requirement = `Please generate questions about ${params.subject}`;
            } else {
                requirement = 'Please generate some questions';
            }

            if (params.difficulty && params.difficulty !== 'intermediate') {
                const diffMap = { 'easy': 'easy', 'hard': 'difficult' };
                requirement += ` (Difficulty: ${diffMap[params.difficulty] || params.difficulty})`;
            }

            if (includeAnalysis) {
                requirement += ', with detailed answers and explanations';
            }
        }

        return requirement;
    }

    /**
     * Handle generate-questions command
     */
    async handleCommandGenerateQuestions(params) {
        console.log('[Command] Generating questions:', params);
        this.switchPage('question-generator');

        // Wait for page switch to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        // Build requirement text from parameters (supports multiple languages)
        const requirement = this.buildRequirementText(params, true);

        console.log('[Command] Setting requirement text:', requirement);

        // Fill the question requirement field
        const questionInput = document.getElementById('question-input');
        if (questionInput) {
            questionInput.value = requirement;
            questionInput.dispatchEvent(new Event('input', { bubbles: true }));
            questionInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Set grade and subject from params or current settings
        if (params.subject) {
            const subjectSelect = document.getElementById('qg-subject');
            if (subjectSelect) {
                const options = Array.from(subjectSelect.options).map(opt => opt.value);
                if (options.includes(params.subject)) {
                    subjectSelect.value = params.subject;
                    subjectSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('[Command] Set subject to:', params.subject);
                }
            }
        }

        // If no subject provided in params, use current settings
        const gradeSelect = document.getElementById('qg-grade');
        const subjectSelect = document.getElementById('qg-subject');

        if (!params.subject && gradeSelect) {
            const currentGrade = this.settings.grade;
            if (currentGrade && gradeSelect.value !== currentGrade) {
                gradeSelect.value = currentGrade;
                gradeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[Command] Set grade to:', currentGrade);
            }
        }

        if (!params.subject && subjectSelect) {
            const currentSubjects = this.settings.subjects;
            if (currentSubjects && currentSubjects.length > 0) {
                subjectSelect.value = currentSubjects[0];
                subjectSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[Command] Set subject to:', currentSubjects[0]);
            }
        }

        // Trigger submission after a short delay
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[Command] Submitting form...');
        this.submitQuestion();

        return { success: true, action: 'question-generator' };
    }

    /**
     * Handle check-answer command
     */
    async handleCommandCheckAnswer(params) {
        console.log('[Command] Checking answer:', params);
        this.switchPage('answer-checker');

        // Wait for page switch, then populate fields
        await new Promise(resolve => setTimeout(resolve, 200));

        if (params.question) this.setFormValue('answer-question', params.question);
        if (params.studentAnswer) this.setFormValue('answer-student', params.studentAnswer);
        if (params.standardAnswer) this.setFormValue('answer-standard', params.standardAnswer);

        // Trigger submission
        await new Promise(resolve => setTimeout(resolve, 100));
        this.submitAnswer();

        return { success: true, action: 'answer-checker' };
    }

    /**
     * Handle generate-plan command
     */
    async handleCommandGeneratePlan(params) {
        console.log('[Command] Generating learning plan:', params);
        this.switchPage('learning-plan');

        // Wait for page switch to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        // Fill the goal field
        if (params.goal) {
            this.setFormValue('plan-goal', params.goal);
        }

        // Fill the duration field if specified
        if (params.duration) {
            this.setFormValue('plan-duration', params.duration);
        } else {
            // Default to 3-month plan
            this.setFormValue('plan-duration', '3-month');
        }

        // Fill the current level if specified
        if (params.currentLevel) {
            this.setFormValue('plan-current-level', params.currentLevel);
        } else {
            // Default to intermediate
            this.setFormValue('plan-current-level', 'intermediate');
        }

        // Trigger submission after a short delay
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[Command] Submitting learning plan form...');
        this.submitLearningPlan();

        return { success: true, action: 'learning-plan' };
    }

    /**
     * Handle practice command
     */
    async handleCommandPractice(params) {
        console.log('[Command] Starting practice:', params);
        this.switchPage('question-generator');

        // Wait for page switch to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        // Build requirement text for practice (supports multiple languages)
        const lang = this.currentLanguage || 'english';
        let requirement = '';

        if (lang === 'chinese') {
            if (params.quantity && params.subject) {
                requirement = `请出${params.quantity}道关于${params.subject}的练习题`;
            } else if (params.subject) {
                requirement = `请出关于${params.subject}的练习题`;
            } else {
                requirement = '请出一些练习题';
            }
            requirement += '，需要包含答案和解析';
        } else {
            // English
            if (params.quantity && params.subject) {
                requirement = `Please generate ${params.quantity} practice problems about ${params.subject}`;
            } else if (params.subject) {
                requirement = `Please generate practice problems about ${params.subject}`;
            } else {
                requirement = 'Please generate some practice problems';
            }
            requirement += ', with answers and explanations';
        }

        console.log('[Command] Setting requirement text:', requirement);

        // Fill the question requirement field
        const questionInput = document.getElementById('question-input');
        if (questionInput) {
            questionInput.value = requirement;
            questionInput.dispatchEvent(new Event('input', { bubbles: true }));
            questionInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // If subject is provided in params, set it in the form
        if (params.subject) {
            const subjectSelect = document.getElementById('qg-subject');
            if (subjectSelect) {
                // Check if this subject option exists
                const options = Array.from(subjectSelect.options).map(opt => opt.value);
                if (options.includes(params.subject)) {
                    subjectSelect.value = params.subject;
                    subjectSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('[Command] Set subject to:', params.subject);
                }
            }
        }

        // If no grade or subject, use current settings
        const gradeSelect = document.getElementById('qg-grade');
        const subjectSelect = document.getElementById('qg-subject');

        if (!params.subject && gradeSelect) {
            // Use current settings grade if available
            const currentGrade = this.settings.grade;
            if (currentGrade && gradeSelect.value !== currentGrade) {
                gradeSelect.value = currentGrade;
                gradeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[Command] Set grade to:', currentGrade);
            }
        }

        if (!params.subject && subjectSelect) {
            // Use current settings subjects if available
            const currentSubjects = this.settings.subjects;
            if (currentSubjects && currentSubjects.length > 0) {
                subjectSelect.value = currentSubjects[0];
                subjectSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[Command] Set subject to:', currentSubjects[0]);
            }
        }

        // Trigger submission after a short delay
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[Command] Submitting form...');
        this.submitQuestion();

        return { success: true, action: 'question-generator' };
    }

    /**
     * Get localized label for command action based on current language
     */
    getActionLabel(action) {
        const labels = {
            'generate-questions': {
                'chinese': '出题',
                'english': 'Question Generator',
                'spanish': 'Generador de Preguntas',
                'french': 'Générateur de Questions',
                'german': 'Fragegenerator',
                'japanese': '問題生成',
                'korean': '문제 생성기',
                'portuguese': 'Gerador de Perguntas'
            },
            'check-answer': {
                'chinese': '批改答案',
                'english': 'Answer Checker',
                'spanish': 'Verificador de Respuestas',
                'french': 'Vérificateur de Réponses',
                'german': 'Antwortprüfer',
                'japanese': '回答チェッカー',
                'korean': '답변 검사기',
                'portuguese': 'Verificador de Respostas'
            },
            'generate-plan': {
                'chinese': '学习规划',
                'english': 'Learning Plan',
                'spanish': 'Plan de Aprendizaje',
                'french': 'Plan d\'Apprentissage',
                'german': 'Lernplan',
                'japanese': '学習計画',
                'korean': '학습 계획',
                'portuguese': 'Plano de Aprendizagem'
            },
            'practice': {
                'chinese': '练习',
                'english': 'Practice',
                'spanish': 'Práctica',
                'french': 'Pratique',
                'german': 'Übung',
                'japanese': '練習',
                'korean': '연습',
                'portuguese': 'Prática'
            }
        };
        const actionLabels = labels[action] || {};
        return actionLabels[this.currentLanguage] || actionLabels['english'] || '执行';
    }

    /**
     * Get localized button text based on current language
     */
    getLocalizedButtonText(key) {
        const texts = {
            'go_to': {
                'chinese': '前往',
                'english': 'Go to',
                'spanish': 'Ir a',
                'french': 'Aller à',
                'german': 'Gehen zu',
                'japanese': '進む',
                'korean': '이동',
                'portuguese': 'Ir para'
            },
            'close': {
                'chinese': '关闭',
                'english': 'Close',
                'spanish': 'Cerrar',
                'french': 'Fermer',
                'german': 'Schließen',
                'japanese': '閉じる',
                'korean': '닫기',
                'portuguese': 'Fechar'
            }
        };
        const textMap = texts[key] || {};
        return textMap[this.currentLanguage] || textMap['english'] || '';
    }

    /**
     * Execute command without delay (for button click)
     */
    async executeCommandWithoutDelay(action, params) {
        console.log('[Quick Execute] Action:', action, params);
        const command = {
            isCommand: true,
            action: action,
            params: params || {},
            explanation: ''
        };
        await this.executeCommand(command);
    }

    /**
     * Safely set form value using proper DOM manipulation
     */
    setFormValue(elementId, value) {
        const el = document.getElementById(elementId);
        if (!el) {
            console.warn(`[Form Helper] Element ${elementId} not found`);
            return false;
        }

        try {
            if (el.tagName === 'SELECT') {
                el.value = value;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            console.log(`[Form Helper] Set ${elementId} = ${value}`);
            return true;
        } catch (error) {
            console.error(`[Form Helper] Error setting ${elementId}:`, error);
            return false;
        }
    }

    async attemptNonStreamingChat(question, aiMessageId, chatMessages) {
        console.log('Attempting non-streaming chat with question:', question);
        console.log('API endpoint:', `${API_BASE_URL}/ai/chat`);
        console.log('Chat history:', this.chatHistory);

        try {
            // 构建请求体，包含当前问题、对话历史和用户的首选语言
            const activeProfile = this.getActiveProfile();
            const requestBody = {
                question: question,
                // 发送对话历史给后端，让AI能借鉴之前的内容
                history: this.chatHistory.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                // 发送用户的首选语言，让ZhipuAI用该语言生成响应
                language: this.currentLanguage,
                // 发送用户的学习要求，让AI能个性化回答
                customRequirements: activeProfile && activeProfile.customRequirements ? activeProfile.customRequirements : '',
                // 发送用户的个性化学习风格描述
                learningStyleDescription: this.settings && this.settings.learningStyleDescription ? this.settings.learningStyleDescription : '',
                // 强化系统指示：让AI充分讲解而不是急着问问题
                systemInstruction: (() => {
                    let instruction = this.currentLanguage === 'chinese'
                        ? `【AI学习助手系统指示 - 必须严格遵守】

【核心职责】你是一个耐心的讲解型学习助手，主要工作是解释概念、提供例子。

`
                        : `【AI Learning Assistant System Instructions - Must strictly follow】

【Core Responsibility】You are a patient explanation-focused learning assistant. Your main job is to explain concepts and provide examples.

`;

                    // 【无障碍支持】如果用户启用了阅读障碍友好字体，添加简洁性和内容简化要求
                    if (this.settings.dyslexiaFont) {
                        if (this.currentLanguage === 'chinese') {
                            instruction += `【用户无障碍设置 - 极端简化内容模式】
⚠️ ⚠️ ⚠️ 用户启用了严格的阅读障碍友好模式。您必须使用最简单的语言和最小的内容。

【MUST DO - 绝对执行】
🔴 总字数：150-200字（严格限制，不能超过）
🔴 例子数量：2个（只有2个，不能更多）
🔴 句子长度：最多10个字一句（不能超过）
🔴 段落长度：2-3句为一段（不能更长）
🔴 词汇：只用小学3年级学过的字词
🔴 结构：1.概念定义（1-2句）2.第一个例子（2-3句）3.第二个例子（2-3句）4.为什么重要（1句）
🔴 禁止：任何专业术语、复杂句式、从句、成语、比喻

【具体示例 - 必须这样做】
❌ 错误："多项式函数在代数和微积分中都扮演着至关重要的角色，它们的根与系数之间存在着深刻的数学关系。"

✅ 正确：
多项式是什么？
多项式是用字母和数字写的数学式子。

例子1：2x+3
这是最简单的多项式。

例子2：x²-4x+1
这也是多项式。

为什么要学？
因为很多计算都用到它。

【字数检查】
检查你写的内容字数。
如果超过200字，删除不重要的内容。
一定要删除到150-200字。

【绝对禁止包含】
❌ 禁止超过10个字的句子
❌ 禁止超过3句的段落
❌ 禁止专业术语（如：微积分、系数、代数等）
❌ 禁止复杂的从句（如：当...时...就...）
❌ 禁止长的数学解释
❌ 禁止讲解公式的推导过程
❌ 禁止历史背景
❌ 禁止常见错误讲解
❌ 禁止与其他知识的关联
❌ 禁止长段落（要经常换行）
❌ 禁止任何$...$ 数学符号（如果需要表示公式，用中文或英文描述，例如"x等于2"而不是"x=$2$"）
❌ 禁止任何###符号（不要用Markdown标题）
❌ 禁止超过200字的内容

【必须包含的内容】
✅ 最简单的定义（1-2句，最多10字每句）
✅ 第一个最简单的例子（2-3句）
✅ 第二个例子（2-3句）
✅ 一句说明为什么重要
✅ 大量换行，让文字看起来很"轻"

`;
                        } else {
                            instruction += `【User Accessibility Setting - EXTREME SIMPLIFICATION Mode】
⚠️ ⚠️ ⚠️ User has enabled strict dyslexia-friendly mode. Use the SIMPLEST language possible.

【MUST DO - Execute Strictly】
🔴 Total words: 150-200 words MAXIMUM (hard limit, cannot exceed)
🔴 Number of examples: Exactly 2 examples (no more)
🔴 Sentence length: Maximum 10 words per sentence (cannot exceed)
🔴 Paragraph length: 2-3 sentences per paragraph (cannot be longer)
🔴 Vocabulary: Only use words a 3rd grader knows
🔴 Structure: 1. Definition (1-2 sentences) 2. First example (2-3 sentences) 3. Second example (2-3 sentences) 4. Why important (1 sentence)
🔴 FORBIDDEN: Professional jargon, complex sentence structures, clauses, idioms, metaphors

【Example Format - MUST Follow This】
❌ WRONG: "Polynomial functions play a crucial role in algebra and calculus, with profound mathematical relationships between their roots and coefficients."

✅ CORRECT:
What is a polynomial?
A polynomial is a math expression with letters and numbers.

Example 1: 2x+3
This is the simplest polynomial.

Example 2: x²-4x+1
This is also a polynomial.

Why learn this?
Because many calculations use it.

【Word Count Check】
Count the words you write.
If over 200 words, delete less important content.
Delete until it is 150-200 words.

【Absolutely Forbidden Content】
❌ Forbidden: Sentences longer than 10 words
❌ Forbidden: Paragraphs longer than 3 sentences
❌ Forbidden: Technical jargon (such as: calculus, coefficients, algebra)
❌ Forbidden: Complex clauses (such as: when... then...)
❌ Forbidden: Long mathematical explanations
❌ Forbidden: Formula derivation processes
❌ Forbidden: Historical background
❌ Forbidden: Explaining common mistakes
❌ Forbidden: Connecting to other knowledge
❌ Forbidden: Long paragraphs (must use line breaks frequently)
❌ Forbidden: Any $...$ math symbols (if you need to express a formula, describe it in words, for example "x equals 2" instead of "x=$2$")
❌ Forbidden: Any ### symbols (do not use Markdown headings)
❌ Forbidden: Content longer than 200 words

【Must Include】
✅ Simplest definition (1-2 sentences, max 10 words per sentence)
✅ First simplest example (2-3 sentences)
✅ Second example (2-3 sentences)
✅ One sentence explaining why it's important
✅ Lots of line breaks to make text look "light"

`;
                        }
                    }

                    // 添加禁止和必须做的清单（根据无障碍设置动态生成）
                    const minWords = this.settings.dyslexiaFont ? 150 : 500;
                    const minExamples = this.settings.dyslexiaFont ? 2 : 5;
                    const explanationRequirement = this.settings.dyslexiaFont ? '150-200' : '500+';
                    const examplesRequirement = this.settings.dyslexiaFont ? '2个' : '5个+';

                    if (this.currentLanguage === 'chinese') {
                        instruction += `
【禁止清单 - 绝对不能做】
❌ 禁止：看到"teach me"、"讲解"就建议生成学习计划
❌ 禁止：在只讲了几句话就问"还有其他问题吗？"
❌ 禁止：用"我会给你制定一个计划"来代替直接讲解
❌ 禁止：讲解长度少于${minWords}字
❌ 禁止：讲解中少于${minExamples}具体例子
❌ 禁止：在完成讲解之前提出任何验证性问题
❌ 禁止：讲解输出为长段落，必须有清晰的结构和分节

【必须做清单 - 必须执行】
✅ 必须：听到任何讲解请求立即开始讲解，不建议其他选项
✅ 必须：提供至少${examplesRequirement}实际、具体的例子
✅ 必须：讲解长度至少${explanationRequirement}字
${!this.settings.dyslexiaFont ? `✅ 必须：解释常见误区和陷阱
✅ 必须：给出相关知识的连接` : `✅ 必须：关注关键点，省略不必要的细节`}
✅ 必须：讲解完全之后，再考虑轻轻问一个验证性问题
✅ 必须：严格使用下面的【输出格式】，输出必须清晰结构化，不能是长段落

【用户需求的严格分类】
1. "teach me XXX" / "讲解" / "解释" / "告诉我" / "怎样"
   → 直接讲解，讲解${explanationRequirement}字，${examplesRequirement}例子，然后再问问题

2. "给我一道题" / "practice" / "问一个问题"
   → 直接出题或提问

3. "生成计划" / "create a plan" / "规划"
   → 才生成学习计划

4. 其他任何问题
   → 直接讲解相关内容

【讲解内容结构】
必须按此顺序输出三个主要部分，每部分清晰分离：

【核心概念】
[清晰、简明的概念定义和解释，2-3段落]

【具体例子】
${examplesRequirement}个具体例子，每个例子用编号和蓝色标签标记：
1. 例子标签: [详细说明和描述]
2. 例子标签: [详细说明和描述]
...（更多例子）

【应用场景】
[解释这个概念在现实中的应用，为什么重要，2-3段落]

${!this.settings.dyslexiaFont ? `【常见误区】
[讲解学生经常犯的错误和误解，1-2段落]

【与其他知识的联系】
[说明这个概念与其他相关知识的关系，1段落]` : ``}

【提问规则】
- 只有在讲解长度超过${minWords}字、给出${minExamples}个以上例子之后，才考虑问问题
- 不要问"还有其他问题吗？"，这样太主动
- 应该问"现在你理解了这个概念吗？有需要我进一步解释的地方吗？"
- 更好的是：讲完后直接问"你想要练习这个概念吗？"

【数学表达式】
- 任何公式都必须用$...$包裹，例如：$ax^2 + bx + c = 0$

【格式要求 - 非常重要】
- 不要使用 Markdown 标题符号（#、##、###）
- 使用【标题】的形式来标记各部分
- 例子部分：用数字编号（1. 2. 3.）和冒号分隔标签和内容
- 长段落必须适当分行，保持可读性
- 禁止：输出为一个没有明确分节的长段落`;
                    } else {
                        instruction += `
【Forbidden List - Absolutely cannot do】
❌ FORBIDDEN: When you see "teach me", suggest creating a learning plan
❌ FORBIDDEN: Ask "Do you have any other questions?" after explaining just a few sentences
❌ FORBIDDEN: Replace direct explanation with "I'll create a plan for you"
❌ FORBIDDEN: Explanation less than ${minWords} words
❌ FORBIDDEN: Explanation with fewer than ${minExamples} concrete examples
❌ FORBIDDEN: Ask verification questions before completing explanation
❌ FORBIDDEN: Output explanation as long paragraphs without clear structure and sections

【Must-Do List - Must execute】
✅ MUST: When you hear any explanation request, start explaining immediately without suggesting other options
✅ MUST: Provide at least ${examplesRequirement} real, concrete examples
✅ MUST: Explanation length must be at least ${explanationRequirement} words
${!this.settings.dyslexiaFont ? `✅ MUST: Explain common misconceptions and pitfalls
✅ MUST: Connect to related knowledge` : `✅ MUST: Focus on key points and omit unnecessary details`}
✅ MUST: Only consider asking a verification question after complete explanation
✅ MUST: Strictly follow the 【Output Format】 below. Output must be clearly structured with sections, NOT a long paragraph

【Strict Classification of User Requests】
1. "teach me XXX" / "explain" / "how to" / "tell me about"
   → Start explaining immediately, ${explanationRequirement} words, ${examplesRequirement} examples, then consider asking

2. "Give me a problem" / "practice" / "ask me a question"
   → Generate problems or ask questions directly

3. "create a plan" / "plan my learning" / "make a schedule"
   → Generate learning plan

4. Any other question
   → Provide explanation directly

【Explanation Content Structure - MUST Follow This Format】
Output must have three main sections in this exact order, each clearly separated:

【Core Concept】
[Clear, concise definition and explanation of the concept, 2-3 paragraphs]

【Concrete Examples】
${examplesRequirement} specific examples, each with number label and description:
1. Example label: [detailed explanation and description]
2. Example label: [detailed explanation and description]
...(more examples)

【Applications】
[Explain real-world applications of this concept, why it's important, 2-3 paragraphs]

${!this.settings.dyslexiaFont ? `【Common Mistakes】
[Explain errors and misconceptions students commonly make, 1-2 paragraphs]

【Connections to Other Knowledge】
[Explain how this concept relates to other relevant knowledge, 1 paragraph]` : ``}

【Question Rules】
- Only consider asking after explanation exceeds ${minWords} words and provides ${minExamples}+ examples
- Don't ask "Do you have any other questions?" - too proactive
- Should ask "Do you understand this concept now? Is there anything you need me to explain further?"
- Better: After explanation, ask "Would you like to practice this concept?"

【Math Expressions】
- Any formula must be wrapped with $...$, for example: $ax^2 + bx + c = 0$

【Format Requirements - VERY IMPORTANT】
- Do NOT use Markdown heading symbols (#, ##, ###)
- Use 【Title】 format to mark each section
- Examples section: Use numbered list (1. 2. 3.) with colon separating label from content
- Break long paragraphs appropriately to maintain readability
- FORBIDDEN: Output as one long paragraph without clear sections`;
                    }

                    return instruction;
                })(),
            };

            const response = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                let errorMsg = `HTTP ${response.status}`;
                let fullError = '';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                    fullError = JSON.stringify(errorData, null, 2);
                    console.error('Error response:', fullError);
                } catch (e) {
                    const textError = await response.text();
                    console.error('Text response:', textError);
                    fullError = textError;
                }
                throw new Error(`${errorMsg}\n\n详情：${fullError}`);
            }

            const data = await response.json();
            console.log('Response data:', data);

            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.content) {
                throw new Error('AI未返回内容。响应：' + JSON.stringify(data));
            }

            let aiResponse = data.content;
            const messageContainer = document.getElementById(aiMessageId);
            if (!messageContainer) {
                throw new Error('消息容器未找到');
            }

            // 清空现有内容
            messageContainer.innerHTML = '';

            let displayText = aiResponse;
            let isCommandExecution = false;
            let command = null;

            // 【启用命令执行功能】
            // 允许 AI 互动中的命令执行（生成题、生成计划等）
            // 用户可以点击按钮来执行这些功能
            const ENABLE_AI_COMMANDS = true;

            if (ENABLE_AI_COMMANDS) {
                // 先尝试从响应中提取 explanation 字段（如果是JSON对象）
                try {
                    if (typeof aiResponse === 'string' && aiResponse.trim().startsWith('{')) {
                        const parsed = JSON.parse(aiResponse);
                        if (parsed.explanation) {
                            // 优先显示 explanation，但保留原始 aiResponse 用于命令检测
                            displayText = parsed.explanation;
                            // 如果有 isCommand 标志，使用解析的对象
                            if (parsed.isCommand === true) {
                                command = parsed;
                            }
                        }
                    }
                } catch (parseErr) {
                    // 不是JSON，继续处理
                }

                // Check if backend detected command (isCommand flag)
                if (data.isCommand && !command) {
                    console.log('[Chat] Command detected by backend');
                    try {
                        // Parse the JSON string from backend
                        command = JSON.parse(aiResponse);
                        if (command && command.isCommand === true) {
                            console.log('[Chat] Valid command:', command.action);

                            // For teaching requests (action='teaching'), don't execute as command
                            // Just display the explanation as normal chat response
                            if (command.action !== 'teaching') {
                                isCommandExecution = true;

                                // Execute command asynchronously
                                try {
                                    await this.executeCommand(command).catch(err => {
                                        console.error('[Chat] Command execution error:', err.message);
                                    });
                                } catch (err) {
                                    console.error('[Chat] Command error:', err);
                                }
                            }

                            // Display explanation in chat
                            displayText = command.explanation;
                            aiResponse = displayText;
                        }
                    } catch (parseErr) {
                        console.warn('[Chat] Failed to parse backend command:', parseErr);
                        // Fall back to normal response
                    }
                }

                // If not backend-detected command, try client-side parsing
                if (!isCommandExecution && !command) {
                    command = this.parseCommandResponse(aiResponse);

                    if (command && command.isCommand) {
                        console.log('[Chat] Command detected by client:', command.action);
                        isCommandExecution = true;
                        // Execute command asynchronously (don't wait)
                        try {
                            await this.executeCommand(command).catch(err => {
                                console.error('[Chat] Command execution error:', err.message);
                            });
                        } catch (err) {
                            console.error('[Chat] Command error:', err);
                        }

                        // Display explanation in chat instead of raw JSON
                        displayText = command.explanation;
                        aiResponse = displayText; // Update for later use
                    }
                }
            }

            // 创建一个容器，用于放置内容
            // 注意：AI互动中不需要读出声和停止按钮，这些功能只在生成解释时显示
            const contentContainer = document.createElement('div');
            contentContainer.style.position = 'relative';

            // 创建内容区域
            const contentArea = document.createElement('div');
            contentArea.id = `ai-content-${aiMessageId}`;

            // If this is a command execution, show a special UI with action button
            if (isCommandExecution && command) {
                console.log('[Chat] Displaying command execution UI for:', command.action);
                const actionLabel = this.getActionLabel(command.action);
                const goToText = this.getLocalizedButtonText('go_to');
                const closeText = this.getLocalizedButtonText('close');
                const commandDataStr = JSON.stringify({
                    action: command.action,
                    params: command.params
                });

                contentArea.innerHTML = `
                    <div class="command-execution-ui" style="padding: 20px; background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%); border-radius: 8px; margin-bottom: 15px;">
                        <div style="font-size: 16px; margin-bottom: 15px; color: #333; font-weight: 500;">
                            ✅ ${displayText}
                        </div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="command-action-btn" data-command="${commandDataStr}" style="
                                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                                color: white;
                                border: none;
                                padding: 10px 20px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-weight: bold;
                                font-size: 14px;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                transition: all 0.2s ease;
                            ">
                                👉 ${goToText} ${actionLabel}
                            </button>
                            <button class="close-command-ui" style="
                                background: #ddd;
                                color: #333;
                                border: none;
                                padding: 10px 20px;
                                border-radius: 6px;
                                cursor: pointer;
                                font-size: 14px;
                                transition: all 0.2s ease;
                            ">
                                ${closeText}
                            </button>
                        </div>
                    </div>
                `;

                // Store command data on the contentArea for later access
                contentArea.commandData = command;
            } else {
                // Clean up complex LaTeX before formatting
                let cleanedText = this.cleanupComplexLatex(displayText);
                // Auto-wrap math expressions to ensure proper rendering
                let wrappedText = this.wrapUnmatchedMath(cleanedText);
                // Format for display
                let formattedText = this.formatChatResponse(wrappedText);
                contentArea.innerHTML = formattedText;
            }

            contentArea.style.paddingTop = '0px';

            // 包装句子以便在朗读时高亮
            this.wrapSentencesInElement(contentArea);

            contentContainer.appendChild(contentArea);

            // Add speak/stop button for AI responses (only if not a command execution)
            if (!isCommandExecution) {
                const speakContainer = document.createElement('div');
                speakContainer.style.cssText = 'display: flex; gap: 10px; margin-top: 12px; align-items: center;';
                const speakBtn = document.createElement('button');
                speakBtn.id = `ai-speak-${aiMessageId}`;
                speakBtn.style.cssText = `
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                `;
                speakBtn.textContent = this.currentLanguage === 'chinese' ? '🔊 读出声' : '🔊 Speak';
                speakBtn.setAttribute('data-playing', 'false');
                speakBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const isPlaying = speakBtn.getAttribute('data-playing') === 'true';
                    if (isPlaying) {
                        // Stop playback
                        window.speechSynthesis.cancel();
                        speakBtn.style.backgroundColor = '#4CAF50';
                        speakBtn.textContent = this.currentLanguage === 'chinese' ? '🔊 读出声' : '🔊 Speak';
                        speakBtn.setAttribute('data-playing', 'false');
                    } else {
                        // Start playback - use contentArea.innerText since contentArea has sentence spans
                        const textToSpeak = contentArea.innerText;
                        const lang = this.currentLanguage === 'chinese' ? 'zh-CN' : 'en-US';
                        this.speakText(textToSpeak, lang, contentArea.id);
                        speakBtn.style.backgroundColor = '#DC3545';
                        speakBtn.textContent = this.currentLanguage === 'chinese' ? '⏹ 停止' : '⏹ Stop';
                        speakBtn.setAttribute('data-playing', 'true');

                        // Reset button when speech ends
                        window.speechSynthesis.onend = () => {
                            speakBtn.style.backgroundColor = '#4CAF50';
                            speakBtn.textContent = this.currentLanguage === 'chinese' ? '🔊 读出声' : '🔊 Speak';
                            speakBtn.setAttribute('data-playing', 'false');
                        };
                    }
                });
                speakContainer.appendChild(speakBtn);
                contentContainer.appendChild(speakContainer);
            }

            messageContainer.appendChild(contentContainer);

            // Add event listeners for command buttons
            if (isCommandExecution && command) {
                // Use setTimeout to ensure DOM is fully rendered before attaching listeners
                const app = this;  // Preserve 'this' context
                setTimeout(() => {
                    const actionBtn = contentArea.querySelector('.command-action-btn');
                    const closeBtn = contentArea.querySelector('.close-command-ui');

                    if (actionBtn) {
                        actionBtn.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[UI] Command button clicked:', command.action);
                            console.log('[UI] Command data:', command);
                            console.log('[UI] Executing command with app:', app);
                            app.executeCommand(command).catch(err => {
                                console.error('[UI] Error executing command:', err);
                            });
                        };

                        // Add hover effects
                        actionBtn.addEventListener('mouseover', () => {
                            actionBtn.style.transform = 'translateY(-2px)';
                            actionBtn.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.3)';
                        });
                        actionBtn.addEventListener('mouseout', () => {
                            actionBtn.style.transform = 'translateY(0)';
                            actionBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        });
                        console.log('[UI] Command button event listener attached');
                    } else {
                        console.warn('[UI] Command button not found in contentArea');
                        console.warn('[UI] contentArea HTML:', contentArea.innerHTML.substring(0, 200));
                    }

                    if (closeBtn) {
                        closeBtn.onclick = (e) => {
                            e.preventDefault();
                            contentArea.parentElement.style.display = 'none';
                        };

                        closeBtn.addEventListener('mouseover', () => {
                            closeBtn.style.background = '#ccc';
                        });
                        closeBtn.addEventListener('mouseout', () => {
                            closeBtn.style.background = '#ddd';
                        });
                    }
                }, 100);
            }

            // Render LaTeX formulas with MathJax (only if not a command)
            if (!isCommandExecution && window.MathJax) {
                setTimeout(() => {
                    window.MathJax.typesetPromise([contentArea]).catch(err => {
                        console.log('MathJax rendering error:', err);
                    });
                }, 100);
            }

            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Add AI response to history
            this.chatHistory.push({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date().toISOString()
            });

            // Store for save functionality
            this.currentChatContent = {
                question: question,
                answer: aiResponse,
                timestamp: new Date().toISOString()
            };

            // Show save button for AI Chat
            if (this.saveChatBtn) this.saveChatBtn.style.display = 'block';

            // Track activity for progress
            await this.onChatMessage(question, aiResponse);

            // Show notification
            this.showPageNotification('ai-chat', this.currentLanguage === 'chinese' ? '✅ AI 已回复' : '✅ AI responded');

            // 【重要】只在非命令执行且真正是普通对话时才问后续问题
            // 不要在命令执行、或者数据.isCommand标记时问
            const shouldAskFollowUp = !isCommandExecution && !data.isCommand && displayText && displayText.length > 20;

            console.log('[Chat] shouldAskFollowUp:', shouldAskFollowUp, 'isCommandExecution:', isCommandExecution, 'data.isCommand:', data.isCommand);

            if (shouldAskFollowUp) {
                try {
                    const suggestionResult = await this.generateFollowUpSuggestions(aiResponse);
                    if (suggestionResult.showSuggestions && suggestionResult.suggestions.length > 0) {
                        this.updateSuggestedQuestions(suggestionResult.suggestions);
                    } else {
                        // Hide suggestions if none are needed
                        this.updateSuggestedQuestions([]);
                    }
                } catch (error) {
                    console.error('[Follow-up Suggestions] Error:', error);
                    // Don't show suggestions if there's an error
                    this.updateSuggestedQuestions([]);
                }

                // Add follow-up question after a brief delay
                // 【重要】对于有真实内容的普通对话才问，不要对命令响应问
                setTimeout(async () => {
                    // 再次检查这个消息是否真的不是命令
                    if (!isCommandExecution && !data.isCommand) {
                        await this.addFollowUpQuestion(question);
                    }
                }, 2000);
            } else {
                // Clear suggestions when command is executed or other cases
                this.updateSuggestedQuestions([]);
            }
        } catch (error) {
            console.error('Chat error details:', error);
            throw error;
        }
    }

    /**
     * Add a follow-up question to continue the conversation
     * Summarizes ALL topics in the conversation using ZhipuAI before asking
     */
    async addFollowUpQuestion(userQuestion) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        try {
            // Check if we already asked a follow-up question in this session
            // to avoid asking twice for multiple user messages
            if (this.lastFollowUpTime && Date.now() - this.lastFollowUpTime < 3000) {
                console.log('Follow-up already asked recently, skipping...');
                return;
            }
            this.lastFollowUpTime = Date.now();

            // Summarize ALL topics covered in the entire chat conversation
            let topicSummary = '';
            let showTopicInMessage = true;

            try {
                // Build a summary of the chat history for AI to analyze
                const conversationContext = this.chatHistory
                    .slice(-6) // Get last 6 messages (3 exchanges) for context
                    .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content.substring(0, 200)}`)
                    .join('\n\n');

                const summaryPrompt = this.currentLanguage === 'chinese'
                    ? `请总结这段对话涉及的所有主题。如果只有一个主题，用1-3个词总结；如果涉及多个不相关的主题，请回答"multiple topics"（不需要具体列举）。\n\n对话：\n${conversationContext}`
                    : `Summarize all the topics in this conversation. If there's only one topic, summarize it in 1-3 words; if there are multiple unrelated topics, respond with exactly "multiple topics".\n\nConversation:\n${conversationContext}`;

                const response = await fetch(`${API_BASE_URL}/ai/ask`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        question: summaryPrompt,
                        language: this.currentLanguage
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    topicSummary = data.content.trim();

                    // Check if multiple topics detected
                    if (topicSummary.toLowerCase().includes('multiple topics')) {
                        showTopicInMessage = false;
                    } else {
                        // 【重要】清理主题中的动词，只保留核心学习主题
                        // 移除 "teach me", "explain", "tell me about" 等短语
                        const verbPatterns = [
                            /teach\s+(me\s+)?/gi,
                            /explain\s+/gi,
                            /tell\s+(me\s+)?about\s+/gi,
                            /help\s+me\s+(with\s+|understand\s+)?/gi,
                            /discuss\s+/gi,
                            /show\s+me\s+(how\s+)?/gi,
                            /learn\s+about\s+/gi,
                            /what\s+is\s+/gi,
                            /how\s+to\s+/gi,
                            /讲解\s+/,
                            /解释\s+/,
                            /告诉我\s+/,
                            /教我\s+/,
                            /说明\s+/,
                            /关于\s+/
                        ];

                        for (const pattern of verbPatterns) {
                            topicSummary = topicSummary.replace(pattern, '').trim();
                        }

                        // 清理残留的介词和连接词
                        topicSummary = topicSummary
                            .replace(/^(the|a|an|and|or|of|for)\s+/i, '')
                            .replace(/^(的|了|吗|呢)\s*/, '')
                            .trim();

                        if (topicSummary.length > 100) {
                            topicSummary = topicSummary.substring(0, 100);
                        }
                    }
                }
            } catch (error) {
                console.log('Topic summarization failed:', error);
                showTopicInMessage = false;
            }

            const followUpDiv = document.createElement('div');
            followUpDiv.className = 'chat-message assistant';

            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble';

            // Generate message based on whether we have a specific topic or multiple topics
            let followUpMessage;
            if (showTopicInMessage && topicSummary) {
                if (this.currentLanguage === 'chinese') {
                    followUpMessage = `还有关于<strong>${topicSummary}</strong>的其他问题吗？`;
                } else {
                    followUpMessage = `Do you have any additional questions about <strong>${topicSummary}</strong>?`;
                }
            } else {
                // Multiple topics or summary failed
                if (this.currentLanguage === 'chinese') {
                    followUpMessage = '还有其他问题吗？';
                } else {
                    followUpMessage = 'Do you have any additional questions?';
                }
            }

            bubble.innerHTML = `<p>${followUpMessage}</p>`;

            const timestamp = document.createElement('div');
            timestamp.className = 'chat-timestamp';
            timestamp.textContent = new Date().toLocaleTimeString();

            followUpDiv.appendChild(bubble);
            followUpDiv.appendChild(timestamp);
            chatMessages.appendChild(followUpDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Store the summarized topic for practice reference
            this.lastLearningTopic = topicSummary || userQuestion;
        } catch (error) {
            console.error('Error adding follow-up question:', error);
        }
    }

    /**
     * Detect if user is confirming they have no more questions
     * Returns true if user confirms, false otherwise
     */
    detectConfirmingAnswer(userMessage) {
        const message = userMessage.toLowerCase().trim();

        // 【重要】改进的理解判断：不仅检查关键词，还要理解上下文
        // 用户可能用多种方式表达"不想现在做练习"：
        // 1. "no" - 直接拒绝
        // 2. "not for now" - 暂时不想
        // 3. "maybe later" - 以后再说
        // 所有这些都应该被识别为"现在暂时不做练习"

        // Chinese keywords indicating user has NO MORE QUESTIONS
        const chineseConfirmKeywords = [
            '没有', '没有了', '不用了', '够了', '明白了', '懂了', '可以了',
            '知道了', '理解了', '明白', '我明白了', '我懂了',
            '好的', '好吧', '可以', '收到',
            '暂时', '先', '以后', '稍后', '待会', '晚点', '不了', '不用', '不做'
        ];

        // English keywords - more comprehensive to understand different expressions
        const englishConfirmKeywords = [
            'no', 'nope',
            'no more', 'no thanks', 'that\'s it', 'that is it',
            'i understand', 'i got it', 'got it', 'understood',
            'perfect', 'thanks', 'that\'s all', 'that is all',
            'i think i understand', 'totally understand', 'fully understand',
            // Additional phrases for "not now"
            'not for now', 'not right now', 'for now', 'later', 'maybe later',
            'i\'m good', 'i\'m ok', 'good for now', 'that\'s enough',
            'not yet', 'not today'
        ];

        // ❌ EXCLUDE these patterns - they indicate user is explaining/requesting, NOT ending
        const chineseExcludePatterns = [
            /不.*计划/, /不.*出题/, /不.*生成/, /不.*创建/, /不.*做题/, /不.*出/, /不.*搞/,  // Not for planning/generating (but allow 不了、不用 which mean "not needed")
            /我.*要/, /我.*想.*学/, /我.*想.*问/, /我.*需要/, /我.*让你/, /我.*请你/,  // User is requesting something
            /现在.*就/, /马上/, /立即/, /就.*现在/  // Indicates ACTIVE/URGENT request (not passive "for now")
        ];

        const englishExcludePatterns = [
            /not.*plan/, /not.*creat/, /not.*gener/, /not.*make.*for.*me/,  // Not for planning
            /not.*question(?!\s*s?\s*now)/i, /not.*problem(?!\s*s?\s*now)/i,  // Not saying they don't have questions/problems (but allow if with "now")
            /i want.*teach/, /i want.*explain/, /i need.*teach/, /please.*teach/, /tell me/,  // User requesting explanation
            /right now(?!.*for)/, /immediately/, /asap/, /just.*ask(?!.*me)/  // Active request (but allow "right now for now" = "not for now")
        ];

        // Check which language the message is in
        const isChinese = /[\u4E00-\u9FFF]/.test(message);

        let isConfirming = false;

        if (isChinese || this.currentLanguage === 'chinese') {
            // First check if this matches ANY exclude pattern - if yes, it's NOT a confirmation
            if (chineseExcludePatterns.some(pattern => pattern.test(message))) {
                console.log(`[Confirm Detection] Matched exclude pattern, not confirming`);
                return false;
            }
            // Only then check for confirm keywords
            isConfirming = chineseConfirmKeywords.some(keyword => message.includes(keyword));
        } else {
            // First check if this matches ANY exclude pattern - if yes, it's NOT a confirmation
            if (englishExcludePatterns.some(pattern => pattern.test(message))) {
                console.log(`[Confirm Detection] Matched exclude pattern, not confirming`);
                return false;
            }

            // Check for keywords (now more comprehensive, including "not for now")
            isConfirming = englishConfirmKeywords.some(kw => {
                if (kw === 'no' || kw === 'nope') {
                    // For "no"/"nope", only if message is SHORT (1-2 words)
                    return message === kw || (message.split(' ').length <= 2 && message.includes(kw));
                } else {
                    // For other phrases, just check if included
                    return message.includes(kw);
                }
            });
        }

        console.log(`[Confirm Detection] Message: "${message.substring(0, 50)}" → Confirming: ${isConfirming}`);
        return isConfirming;
    }

    /**
     * Show suggestion to practice based on learned topic
     */
    async showPracticeSuggestion(topic) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'chat-message assistant';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.style.cssText = 'position: relative; padding-bottom: 50px;';

        // Show loading state with language-aware message
        const loadingMessage = this.currentLanguage === 'chinese' ?
            '正在整理你学到的知识点...' : 'Organizing the knowledge points you learned...';
        bubble.innerHTML = `
            <p style="margin-bottom: 15px;">${loadingMessage}</p>
            <div class="loading-spinner" style="margin: 10px 0;"></div>
        `;

        const timestamp = document.createElement('div');
        timestamp.className = 'chat-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();

        suggestionDiv.appendChild(bubble);
        suggestionDiv.appendChild(timestamp);
        chatMessages.appendChild(suggestionDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Asynchronously extract key points from conversation
        try {
            const keyPoints = await this.extractKeyPointsFromConversation(topic);

            // Generate language-aware messages
            let summaryMessage, questionMessage, buttonText;
            const isMultipleTopics = topic.toLowerCase().includes('multiple topics');

            // Get translations for all languages
            const translations = {
                'chinese': {
                    multiSummary: `你的理解很不错了！你学到了：`,
                    singleSummary: `你对<strong>{topic}</strong>的理解很不错了！你学到了：`,
                    multiQuestion: `要不要试几道练习题来巩固一下这些知识呢？`,
                    singleQuestion: `要不要试几道<strong>{topic}</strong>的练习题来巩固一下这些知识呢？`,
                    buttonText: '📝 练习一下'
                },
                'english': {
                    multiSummary: `Your understanding is great! You've learned:`,
                    singleSummary: `Your understanding of <strong>{topic}</strong> is great! You've learned:`,
                    multiQuestion: `Would you like to do some practice questions to reinforce your knowledge?`,
                    singleQuestion: `Would you like to do some practice questions on <strong>{topic}</strong> to reinforce your knowledge?`,
                    buttonText: '📝 Practice now'
                },
                'spanish': {
                    multiSummary: `¡Tu comprensión es excelente! Has aprendido:`,
                    singleSummary: `¡Tu comprensión de <strong>{topic}</strong> es excelente! Has aprendido:`,
                    multiQuestion: `¿Te gustaría hacer algunas preguntas de práctica para reforzar tu conocimiento?`,
                    singleQuestion: `¿Te gustaría hacer algunas preguntas de práctica sobre <strong>{topic}</strong> para reforzar tu conocimiento?`,
                    buttonText: '📝 Practicar ahora'
                },
                'french': {
                    multiSummary: `Votre compréhension est excellente! Vous avez appris:`,
                    singleSummary: `Votre compréhension de <strong>{topic}</strong> est excellente! Vous avez appris:`,
                    multiQuestion: `Aimeriez-vous faire quelques questions de pratique pour renforcer vos connaissances?`,
                    singleQuestion: `Aimeriez-vous faire quelques questions de pratique sur <strong>{topic}</strong> pour renforcer vos connaissances?`,
                    buttonText: '📝 Pratiquer maintenant'
                },
                'german': {
                    multiSummary: `Dein Verständnis ist großartig! Du hast gelernt:`,
                    singleSummary: `Dein Verständnis von <strong>{topic}</strong> ist großartig! Du hast gelernt:`,
                    multiQuestion: `Möchtest du einige Übungsfragen machen, um dein Wissen zu festigen?`,
                    singleQuestion: `Möchtest du einige Übungsfragen zu <strong>{topic}</strong> machen, um dein Wissen zu festigen?`,
                    buttonText: '📝 Jetzt üben'
                },
                'japanese': {
                    multiSummary: `あなたの理解は素晴らしいです！あなたが学んだこと:`,
                    singleSummary: `<strong>{topic}</strong>のあなたの理解は素晴らしいです！あなたが学んだこと:`,
                    multiQuestion: `知識を強化するためにいくつかの練習問題をやってみませんか？`,
                    singleQuestion: `<strong>{topic}</strong>に関するいくつかの練習問題をやって、知識を強化しませんか？`,
                    buttonText: '📝 今すぐ練習'
                },
                'korean': {
                    multiSummary: `당신의 이해는 훌륭합니다! 당신이 배운 내용:`,
                    singleSummary: `<strong>{topic}</strong>에 대한 당신의 이해는 훌륭합니다! 당신이 배운 내용:`,
                    multiQuestion: `지식을 강화하기 위해 몇 가지 연습 문제를 풀어볼까요?`,
                    singleQuestion: `<strong>{topic}</strong>에 대한 몇 가지 연습 문제를 풀어서 지식을 강화해볼까요?`,
                    buttonText: '📝 지금 연습하기'
                },
                'portuguese': {
                    multiSummary: `Sua compreensão é ótima! Você aprendeu:`,
                    singleSummary: `Sua compreensão de <strong>{topic}</strong> é ótima! Você aprendeu:`,
                    multiQuestion: `Gostaria de fazer algumas perguntas de prática para reforçar seu conhecimento?`,
                    singleQuestion: `Gostaria de fazer algumas perguntas de prática sobre <strong>{topic}</strong> para reforçar seu conhecimento?`,
                    buttonText: '📝 Praticar agora'
                }
            };

            const t = translations[this.currentLanguage] || translations['english'];

            if (isMultipleTopics) {
                summaryMessage = `${t.multiSummary} <span style="color: #1976d2; font-weight: 500;">${keyPoints}</span>`;
                questionMessage = t.multiQuestion;
            } else {
                summaryMessage = `${t.singleSummary.replace('{topic}', topic)} <span style="color: #1976d2; font-weight: 500;">${keyPoints}</span>`;
                questionMessage = t.singleQuestion.replace('{topic}', topic);
            }
            buttonText = t.buttonText;

            const contentHTML = `
                <p style="margin-bottom: 10px;">${summaryMessage}</p>
                <p style="margin-bottom: 15px; color: #666; font-size: 13px;">${questionMessage}</p>
                <button onclick="window.app && window.app.startPracticeFromChat('${topic.replace(/'/g, "\\'")}', '${topic.replace(/'/g, "\\'")}')"
                        style="
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            transition: background-color 0.2s;
                        "
                        onmouseover="this.style.backgroundColor='#45a049'"
                        onmouseout="this.style.backgroundColor='#4CAF50'">
                    ${buttonText}
                </button>
            `;
            bubble.innerHTML = contentHTML;
        } catch (error) {
            console.error('Failed to extract key points:', error);
            // Fallback to simple suggestion with language awareness
            let fallbackMessage, fallbackQuestion, fallbackButtonText;
            const isMultipleTopics = topic.toLowerCase().includes('multiple topics');

            // Get translations for all languages (fallback version)
            const fallbackTranslations = {
                'chinese': {
                    multiMessage: `你的理解很不错了！`,
                    singleMessage: `你对<strong>{topic}</strong>的理解很不错了！`,
                    multiQuestion: `要不要做几道题练习一下呢？这样能更好地巩固知识。`,
                    singleQuestion: `要不要做几道题练习一下呢？这样能更好地巩固知识。`,
                    buttonText: '📝 练习一下'
                },
                'english': {
                    multiMessage: `Your understanding is good!`,
                    singleMessage: `Your understanding of <strong>{topic}</strong> is good!`,
                    multiQuestion: `Would you like to do some practice questions to better reinforce your knowledge?`,
                    singleQuestion: `Would you like to do some practice questions to better reinforce your knowledge?`,
                    buttonText: '📝 Practice now'
                },
                'spanish': {
                    multiMessage: `¡Tu comprensión es buena!`,
                    singleMessage: `¡Tu comprensión de <strong>{topic}</strong> es buena!`,
                    multiQuestion: `¿Te gustaría hacer algunas preguntas de práctica para reforzar mejor tu conocimiento?`,
                    singleQuestion: `¿Te gustaría hacer algunas preguntas de práctica para reforzar mejor tu conocimiento?`,
                    buttonText: '📝 Practicar ahora'
                },
                'french': {
                    multiMessage: `Votre compréhension est bonne!`,
                    singleMessage: `Votre compréhension de <strong>{topic}</strong> est bonne!`,
                    multiQuestion: `Aimeriez-vous faire quelques questions de pratique pour mieux renforcer vos connaissances?`,
                    singleQuestion: `Aimeriez-vous faire quelques questions de pratique pour mieux renforcer vos connaissances?`,
                    buttonText: '📝 Pratiquer maintenant'
                },
                'german': {
                    multiMessage: `Dein Verständnis ist gut!`,
                    singleMessage: `Dein Verständnis von <strong>{topic}</strong> ist gut!`,
                    multiQuestion: `Möchtest du einige Übungsfragen machen, um dein Wissen besser zu festigen?`,
                    singleQuestion: `Möchtest du einige Übungsfragen machen, um dein Wissen besser zu festigen?`,
                    buttonText: '📝 Jetzt üben'
                },
                'japanese': {
                    multiMessage: `あなたの理解は良いです！`,
                    singleMessage: `<strong>{topic}</strong>のあなたの理解は良いです！`,
                    multiQuestion: `知識をより良く強化するためにいくつかの練習問題をやってみませんか？`,
                    singleQuestion: `知識をより良く強化するためにいくつかの練習問題をやってみませんか？`,
                    buttonText: '📝 今すぐ練習'
                },
                'korean': {
                    multiMessage: `당신의 이해는 좋습니다!`,
                    singleMessage: `<strong>{topic}</strong>에 대한 당신의 이해는 좋습니다!`,
                    multiQuestion: `지식을 더 잘 강화하기 위해 몇 가지 연습 문제를 풀어볼까요?`,
                    singleQuestion: `지식을 더 잘 강화하기 위해 몇 가지 연습 문제를 풀어볼까요?`,
                    buttonText: '📝 지금 연습하기'
                },
                'portuguese': {
                    multiMessage: `Sua compreensão é boa!`,
                    singleMessage: `Sua compreensão de <strong>{topic}</strong> é boa!`,
                    multiQuestion: `Gostaria de fazer algumas perguntas de prática para reforçar melhor seu conhecimento?`,
                    singleQuestion: `Gostaria de fazer algumas perguntas de prática para reforçar melhor seu conhecimento?`,
                    buttonText: '📝 Praticar agora'
                }
            };

            const fb = fallbackTranslations[this.currentLanguage] || fallbackTranslations['english'];

            if (isMultipleTopics) {
                fallbackMessage = fb.multiMessage;
                fallbackQuestion = fb.multiQuestion;
            } else {
                fallbackMessage = fb.singleMessage.replace('{topic}', topic);
                fallbackQuestion = fb.singleQuestion;
            }
            fallbackButtonText = fb.buttonText;

            const contentHTML = `
                <p style="margin-bottom: 15px;">${fallbackMessage} ${fallbackQuestion}</p>
                <button onclick="window.app && window.app.startPracticeFromChat('${topic.replace(/'/g, "\\'")}', '${topic.replace(/'/g, "\\'")}')"
                        style="
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            transition: background-color 0.2s;
                        "
                        onmouseover="this.style.backgroundColor='#45a049'"
                        onmouseout="this.style.backgroundColor='#4CAF50'">
                    ${fallbackButtonText}
                </button>
            `;
            bubble.innerHTML = contentHTML;
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Generate follow-up question suggestions based on conversation context
     */
    async generateFollowUpSuggestions(latestResponse) {
        try {
            // Build conversation context
            let conversationContext = '';
            for (let i = Math.max(0, this.chatHistory.length - 6); i < this.chatHistory.length; i++) {
                const msg = this.chatHistory[i];
                if (msg.role === 'user') {
                    conversationContext += `User: ${msg.content}\n`;
                } else if (msg.role === 'assistant') {
                    conversationContext += `AI: ${msg.content}\n\n`;
                }
            }

            // Create language-aware prompt based on current language
            let suggestionPrompt;

            if (this.currentLanguage === 'chinese') {
                suggestionPrompt = `根据下面的对话内容，判断是否应该为用户推荐继续提问的问题，以帮助用户深化理解。

【对话内容】
${conversationContext}

【要求】
1. 判断用户是否理解了主题，对话是否自然可以进一步深化
2. 如果判断应该推荐后续问题（用户有学习动力、话题还可以继续探讨），返回 JSON: {"showSuggestions": true, "suggestions": ["问题1", "问题2", "问题3"]}
3. 如果判断不需要推荐（用户似乎已经满意、话题已充分讨论、用户表示不需要），返回 JSON: {"showSuggestions": false, "suggestions": []}
4. 建议的问题应该：
   - 帮助用户深化理解当前主题
   - 探索相关的延伸话题
   - 鼓励实际应用或举例
   - 用自然的中文表达
5. 每个建议问题不超过15个字
6. 返回3-4个建议

请直接返回 JSON 格式的结果，不要有其他文字：`;
            } else {
                suggestionPrompt = `Based on the conversation below, determine if you should suggest follow-up questions to help the user deepen their understanding.

[Conversation]
${conversationContext}

[Requirements]
1. Judge whether the user understands the topic and if it can naturally be explored further
2. If you should suggest follow-up questions (user is engaged, topic can be explored more), return JSON: {"showSuggestions": true, "suggestions": ["question 1", "question 2", "question 3"]}
3. If you should not suggest (user seems satisfied, topic thoroughly discussed, user indicated no more questions), return JSON: {"showSuggestions": false, "suggestions": []}
4. Suggested questions should:
   - Help deepen understanding of the current topic
   - Explore related extensions
   - Encourage practical application or examples
   - Use natural ${this.currentLanguage === 'english' ? 'English' : this.currentLanguage} phrasing
5. Each question should be up to 15 words
6. Return 3-4 suggestions

Return only the JSON result without any other text:`;
            }

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Generation timeout')), 8000)
            );

            const fetchPromise = fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: suggestionPrompt,
                    language: this.currentLanguage
                })
            }).then(response => {
                if (!response.ok) throw new Error('Request failed');
                return response.json();
            }).then(data => {
                if (data.error) throw new Error(data.error);

                // Parse the AI response to extract JSON
                let content = data.content.trim();

                // Try to extract JSON from the response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    console.warn('Could not find JSON in response:', content);
                    return { showSuggestions: false, suggestions: [] };
                }

                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    showSuggestions: parsed.showSuggestions || false,
                    suggestions: (parsed.suggestions || []).filter(s => typeof s === 'string' && s.trim().length > 0).slice(0, 4)
                };
            });

            const result = await Promise.race([fetchPromise, timeoutPromise]);
            console.log('[Follow-up Suggestions] Generated:', result);
            return result;
        } catch (error) {
            console.error('[Follow-up Suggestions] Error generating suggestions:', error);
            // Return empty suggestions on error - don't show anything
            return { showSuggestions: false, suggestions: [] };
        }
    }

    /**
     * Update the suggested questions display
     */
    updateSuggestedQuestions(suggestions) {
        const container = document.getElementById('suggested-questions-container');
        const list = document.getElementById('suggested-questions-list');

        if (!container || !list) {
            console.warn('[Follow-up Suggestions] DOM elements not found');
            return;
        }

        // Clear existing suggestions
        list.innerHTML = '';

        if (!suggestions || suggestions.length === 0) {
            // Hide container if no suggestions
            container.style.display = 'none';
            return;
        }

        // Show container and add suggestion buttons
        container.style.display = 'block';

        // Update header based on language
        const headerElement = container.querySelector('h3');
        if (headerElement) {
            const headerText = this.currentLanguage === 'chinese' ?
                '💡 推荐继续提问' : '💡 Suggested follow-up questions';
            headerElement.textContent = headerText;
        }

        suggestions.forEach((suggestion, index) => {
            const btn = document.createElement('button');
            btn.className = 'suggested-question-btn';
            btn.type = 'button';
            btn.textContent = suggestion;
            const btnTitle = this.currentLanguage === 'chinese' ?
                '点击发送此问题' : 'Click to send this question';
            btn.title = btnTitle;

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Auto-submit the suggestion as a new question
                const chatInput = document.getElementById('chat-input');
                if (chatInput) {
                    chatInput.value = suggestion;
                }

                // Submit immediately
                this.submitChat();
            });

            list.appendChild(btn);
        });
    }

    /**
     * Extract key points from the entire conversation
     */
    async extractKeyPointsFromConversation(topic) {
        // Collect entire conversation
        let fullConversation = '';
        for (let i = 0; i < this.chatHistory.length; i++) {
            const msg = this.chatHistory[i];
            if (msg.role === 'user') {
                const prefix = this.currentLanguage === 'chinese' ? '用户提问：' : 'User question: ';
                fullConversation += `${prefix}${msg.content}\n`;
            } else if (msg.role === 'assistant') {
                const prefix = this.currentLanguage === 'chinese' ? 'AI回答：' : 'AI answer: ';
                fullConversation += `${prefix}${msg.content}\n\n`;
            }
        }

        // Extract key points via AI (use appropriate language)
        let extractPrompt;
        if (this.currentLanguage === 'chinese') {
            extractPrompt = `根据下面用户与AI的对话，提取用户关于"${topic}"学到的关键知识点。

【对话内容】
${fullConversation}

【要求】
- 只返回知识点列表，用"、"分隔
- 列举3-5个最重要的关键知识点或概念
- 不要有其他文字，只要知识点本身
- 例如格式：求根公式、判别式、根与系数的关系

请返回关键知识点列表：`;
        } else {
            extractPrompt = `Based on the following user-AI conversation, extract the key knowledge points the user learned about "${topic}".

【Conversation Content】
${fullConversation}

【Requirements】
- Return ONLY a comma-separated list of key points
- List 3-5 of the most important key concepts
- No other text, only the knowledge points themselves
- Example format: quadratic formula, discriminant, Vieta's formulas

Return only the key points list:`;
        }

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('提取超时')), 10000)
            );

            const fetchPromise = fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: extractPrompt })
            }).then(response => {
                if (!response.ok) throw new Error('提取失败');
                return response.json();
            }).then(data => {
                if (data.error) throw new Error(data.error);
                return data.content.trim();
            });

            const keyPoints = await Promise.race([fetchPromise, timeoutPromise]);
            return keyPoints;
        } catch (error) {
            console.error('Error extracting key points:', error);
            // Fallback: return generic text
            return `${topic}的相关知识`;
        }
    }

    /**
     * Start practice session based on learned topic from chat
     */
    startPracticeFromChat(topic, fullTopic) {
        // Switch to question generator page
        this.switchPage('question-generator');

        // Collect ALL AI responses and relevant user questions from chat history
        let fullConversation = '';
        for (let i = 0; i < this.chatHistory.length; i++) {
            const msg = this.chatHistory[i];
            if (msg.role === 'user') {
                fullConversation += `【用户提问】${msg.content}\n`;
            } else if (msg.role === 'assistant') {
                fullConversation += `【AI回答】${msg.content}\n\n`;
            }
        }

        // Summarize the complete learning conversation, then generate questions
        this.summarizeAndGenerateQuestions(fullTopic, fullConversation);
    }

    /**
     * Summarize learning content and generate practice questions
     */
    async summarizeAndGenerateQuestions(topic, learningContent) {
        const qgInput = document.getElementById('question-input');
        const difficultySelect = document.getElementById('qg-difficulty');

        // Ensure difficulty is set
        if (difficultySelect && !difficultySelect.value) {
            difficultySelect.value = 'intermediate';
        }

        const logStartMsg = this.currentLanguage === 'chinese'
            ? `📚 正在整理学习内容并生成练习题...`
            : `📚 Organizing learning content and generating practice questions...`;
        this.log(logStartMsg, 'info');

        try {
            // AI summarize the learning content from the entire conversation
            let summaryPrompt;
            if (this.currentLanguage === 'chinese') {
                summaryPrompt = `请基于以下完整的学习对话，精简总结用户关于"${topic}"学到的核心内容，用于生成练习题。

【对话内容】
${learningContent}

【要求】
- 只总结学到的知识点，不要重复用户的提问
- 长度控制在150-200字
- 列举3-5个关键知识点或概念
- 使用简洁、准确的语言
- 便于根据这些知识点出题
- 只返回总结内容，不需要其他说明`;
            } else {
                summaryPrompt = `Based on the following complete learning conversation, briefly summarize the key content the user learned about "${topic}" for generating practice questions.

【Conversation Content】
${learningContent}

【Requirements】
- Only summarize the learned knowledge points, do not repeat user questions
- Keep length between 150-200 words
- List 3-5 key knowledge points or concepts
- Use concise and accurate language
- Suitable for generating practice questions based on these knowledge points
- Only return the summary content, no other explanations needed`;
            }

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(this.currentLanguage === 'chinese' ? '总结超时' : 'Summary timeout')), 15000)
            );

            const fetchPromise = fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: summaryPrompt,
                    language: this.currentLanguage
                })
            }).then(response => {
                if (!response.ok) throw new Error(this.currentLanguage === 'chinese' ? '总结失败' : 'Summary failed');
                return response.json();
            }).then(data => {
                if (data.error) throw new Error(data.error);
                return data.content;
            });

            const summary = await Promise.race([fetchPromise, timeoutPromise]);

            // Set the summarized content in question input
            if (qgInput) {
                qgInput.value = summary;
            }

            // Auto-generate questions after a brief delay
            setTimeout(() => {
                const logGenMsg = this.currentLanguage === 'chinese'
                    ? `📝 根据学习内容生成练习题...`
                    : `📝 Generating practice questions based on learning content...`;
                this.log(logGenMsg, 'info');
                this.submitQuestion();
            }, 500);

        } catch (error) {
            console.error(this.currentLanguage === 'chinese' ? '总结失败' : 'Summary failed:', error);
            // Fallback: use the topic name directly
            if (qgInput) {
                qgInput.value = topic;
            }
            const logFallbackMsg = this.currentLanguage === 'chinese'
                ? `⚠️ 使用主题名称生成练习题...`
                : `⚠️ Using topic name to generate practice questions...`;
            this.log(logFallbackMsg, 'info');
            setTimeout(() => {
                this.submitQuestion();
            }, 500);
        }
    }

    displayChatMessage(content, role = 'user') {
        // Remove empty message if exists
        const emptyMsg = this.chatMessages.querySelector('.chat-empty-message');
        if (emptyMsg) {
            emptyMsg.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.textContent = content;

        const timestamp = document.createElement('div');
        timestamp.className = 'chat-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();

        messageDiv.appendChild(bubble);
        messageDiv.appendChild(timestamp);
        this.chatMessages.appendChild(messageDiv);

        // Auto scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    loadChatHistory() {
        try {
            const saved = localStorage.getItem('futuretech-chat-history');
            if (saved) {
                this.chatHistory = JSON.parse(saved);
                this.renderChatHistory();
            }
        } catch (error) {
            console.log('Failed to load chat history:', error);
            this.chatHistory = [];
        }
    }

    saveChatHistory() {
        try {
            localStorage.setItem('futuretech-chat-history', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.log('Failed to save chat history:', error);
        }
    }

    renderChatHistory() {
        this.chatMessages.innerHTML = '';

        if (this.chatHistory.length === 0) {
            const emptyMsg = this.currentLanguage === 'chinese' ? '开始与AI进行讨论' : 'Start discussing with AI';
            this.chatMessages.innerHTML = `<div class="chat-empty-message">${emptyMsg}</div>`;
            // Hide read aloud button if no messages
            const speakChatBtn = document.getElementById('speak-chat-btn');
            if (speakChatBtn) speakChatBtn.style.display = 'none';
            return;
        }

        this.chatHistory.forEach((msg, index) => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.role}`;

            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble';

            // AI 消息使用格式化显示，用户消息保持原样
            if (msg.role === 'assistant') {
                // 创建一个容器，用于放置按钮和内容
                const contentContainer = document.createElement('div');
                contentContainer.style.position = 'relative';

                // 创建按钮容器（放在左上角）
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = 'position: absolute; top: 8px; left: 8px; display: flex; gap: 8px; z-index: 10;';

                // 读出按钮（使用配置颜色）
                const speakBtn = document.createElement('button');
                speakBtn.innerHTML = '🔊';
                speakBtn.style.cssText = `
                    background-color: ${readAloudColors.speakButton};
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                speakBtn.title = '读出此消息';
                speakBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.speakText(msg.content, 'zh-CN', `chat-content-${index}`);
                });

                // 停止按钮（使用配置颜色）
                const stopBtn = document.createElement('button');
                stopBtn.innerHTML = '⏹';
                stopBtn.style.cssText = `
                    background-color: ${readAloudColors.stopButton};
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                stopBtn.title = '停止读出';
                stopBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.stopSpeaking();
                });

                buttonContainer.appendChild(speakBtn);
                buttonContainer.appendChild(stopBtn);

                // 创建内容区域
                const contentArea = document.createElement('div');
                contentArea.id = `chat-content-${index}`;
                let cleanedContent = this.cleanupComplexLatex(msg.content);
                contentArea.innerHTML = this.formatChatResponse(cleanedContent);
                contentArea.style.paddingTop = '45px';

                // 包装句子以便在朗读时高亮
                this.wrapSentencesInElement(contentArea);

                contentContainer.appendChild(buttonContainer);
                contentContainer.appendChild(contentArea);

                bubble.appendChild(contentContainer);
            } else {
                bubble.textContent = msg.content;
            }

            const timestamp = document.createElement('div');
            timestamp.className = 'chat-timestamp';
            timestamp.textContent = new Date(msg.timestamp).toLocaleTimeString();

            messageDiv.appendChild(bubble);
            messageDiv.appendChild(timestamp);
            this.chatMessages.appendChild(messageDiv);
        });

        // Show speak buttons if there are messages
        if (this.chatHistory.length > 0) {
            const speakChatBtn = document.getElementById('speak-chat-btn');
            const stopChatBtn = document.getElementById('stop-chat-btn');
            if (speakChatBtn) speakChatBtn.style.display = 'inline-block';
            if (stopChatBtn) stopChatBtn.style.display = 'inline-block';
            // Wrap sentences for highlighting
            this.wrapSentencesInElement(this.chatMessages);
        }

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    clearChatHistory() {
        if (confirm('确定要清空所有对话记录吗？此操作无法撤销。')) {
            this.chatHistory = [];
            this.saveChatHistory();
            this.renderChatHistory();
            this.log('✅ 对话记录已清空', 'success');
        }
    }

    // ========== Authentication Functions ==========

    loadUser() {
        try {
            const saved = localStorage.getItem('futuretech-user');
            if (saved) {
                this.currentUser = JSON.parse(saved);
                this.updateUserMenu();
            }
        } catch (error) {
            console.log('Failed to load user:', error);
        }
    }

    loadLanguagePreference() {
        try {
            const saved = localStorage.getItem('futuretech-language');
            if (saved && LANGUAGES[saved]) {
                this.currentLanguage = saved;
            } else if (this.currentUser && this.currentUser.language) {
                this.currentLanguage = this.currentUser.language;
            }
        } catch (error) {
            console.log('Failed to load language:', error);
        }
    }

    showLoginModal() {
        if (this.loginModal) {
            this.loginModal.classList.add('show');
            document.getElementById('login-username').focus();
        }
    }

    closeLoginModal() {
        if (this.loginModal) {
            this.loginModal.classList.remove('show');
            // Clear forms
            this.loginForm.reset();
            this.registerForm.reset();
            // Clear messages
            document.getElementById('login-message').textContent = '';
            document.getElementById('register-message').textContent = '';
        }
    }

    switchLoginTab(tab) {
        const loginTabBtn = document.getElementById('login-tab-btn');
        const registerTabBtn = document.getElementById('register-tab-btn');
        const loginFormEl = document.getElementById('login-form');
        const registerFormEl = document.getElementById('register-form');

        if (tab === 'login') {
            loginTabBtn.classList.add('active');
            registerTabBtn.classList.remove('active');
            loginFormEl.classList.add('active');
            registerFormEl.classList.remove('active');
        } else {
            loginTabBtn.classList.remove('active');
            registerTabBtn.classList.add('active');
            loginFormEl.classList.remove('active');
            registerFormEl.classList.add('active');
        }
    }

    handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const messageDiv = document.getElementById('login-message');

        if (!username || !password) {
            this.showLoginMessage(messageDiv, t('login.error.empty', this.currentLanguage), 'error');
            return;
        }

        // Get all users from localStorage
        const allUsers = JSON.parse(localStorage.getItem('futuretech-users') || '{}');
        const user = allUsers[username];

        if (!user || user.password !== password) {
            this.showLoginMessage(messageDiv, t('login.error.invalid', this.currentLanguage), 'error');
            return;
        }

        // Login successful
        this.currentUser = {
            username: username,
            language: user.language || this.currentLanguage,
            settings: user.settings || {}
        };

        localStorage.setItem('futuretech-user', JSON.stringify(this.currentUser));
        localStorage.setItem('futuretech-language', this.currentUser.language);

        this.showLoginMessage(messageDiv, t('login.success', this.currentLanguage), 'success');
        this.updateUserMenu();

        // Reload settings for the logged-in user
        this.loadSettings();

        setTimeout(() => {
            this.closeLoginModal();
        }, 1500);

        this.log(`👤 用户 ${username} 已登录`, 'success');
    }

    handleRegister() {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const messageDiv = document.getElementById('register-message');

        if (!username || !password) {
            this.showLoginMessage(messageDiv, t('register.error.invalid', this.currentLanguage), 'error');
            return;
        }

        if (password !== passwordConfirm) {
            this.showLoginMessage(messageDiv, t('register.error.mismatch', this.currentLanguage), 'error');
            return;
        }

        // Check if user already exists
        const allUsers = JSON.parse(localStorage.getItem('futuretech-users') || '{}');
        if (allUsers[username]) {
            this.showLoginMessage(messageDiv, t('register.error.exists', this.currentLanguage), 'error');
            return;
        }

        // Create new user
        allUsers[username] = {
            password: password,
            language: this.currentLanguage,
            settings: { ...defaultSettings },
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('futuretech-users', JSON.stringify(allUsers));

        // Auto login
        this.currentUser = {
            username: username,
            language: this.currentLanguage,
            settings: { ...defaultSettings }
        };

        localStorage.setItem('futuretech-user', JSON.stringify(this.currentUser));

        this.showLoginMessage(messageDiv, t('register.success', this.currentLanguage), 'success');
        this.updateUserMenu();

        // Load settings for the newly registered user
        this.loadSettings();

        setTimeout(() => {
            this.closeLoginModal();
        }, 1500);

        this.log(`👤 新用户 ${username} 已注册`, 'success');
    }

    showLoginMessage(element, message, type) {
        if (element) {
            element.textContent = message;
            element.className = `login-message show ${type}`;
        }
    }

    updateUserMenu() {
        if (this.currentUser) {
            this.userDisplay.textContent = `👤 ${this.currentUser.username}`;
            const logoutItem = document.getElementById('logout-item');
            const authDivider = document.getElementById('auth-divider');
            if (logoutItem) logoutItem.style.display = 'block';
            if (authDivider) authDivider.style.display = 'block';
            const loginItem = this.userDropdown.querySelector('[onclick*="showLoginModal"]');
            if (loginItem) loginItem.style.display = 'none';
        } else {
            this.userDisplay.textContent = t('user.login', this.currentLanguage);
            const logoutItem = document.getElementById('logout-item');
            const authDivider = document.getElementById('auth-divider');
            if (logoutItem) logoutItem.style.display = 'none';
            if (authDivider) authDivider.style.display = 'none';
            const loginItem = this.userDropdown.querySelector('[onclick*="showLoginModal"]');
            if (loginItem) loginItem.style.display = 'block';
        }
    }

    logout() {
        if (confirm('确定要登出吗？')) {
            this.currentUser = null;
            localStorage.removeItem('futuretech-user');
            this.updateUserMenu();
            // Load guest settings after logout
            this.loadSettings();
            this.log('👤 已登出', 'info');
            // Close dropdown
            if (this.userDropdown) {
                this.userDropdown.classList.remove('show');
                this.userMenuBtn.classList.remove('active');
            }
        }
    }

    // ========== Language Functions ==========

    updateUILanguage() {
        try {
            console.log('Updating UI language:', this.currentLanguage);

            // Debug: Check if custom language exists and has data
            if (this.currentLanguage.startsWith('custom-')) {
                console.log('Custom language check:');
                console.log('  LANGUAGES exists:', !!LANGUAGES);
                console.log('  LANGUAGES[currentLanguage] exists:', !!LANGUAGES[this.currentLanguage]);
                console.log('  Sample key "nav.progress":', LANGUAGES[this.currentLanguage]?.['nav.progress']);
                const testTranslation = t('nav.progress', this.currentLanguage);
                console.log('  t("nav.progress", currentLanguage) returns:', testTranslation);
            }

            // Update page title and subtitle based on current page
            const pageConfig = {
                'question-generator': {
                    title: t('header.question-generator', this.currentLanguage),
                    subtitle: t('header.question-generator-subtitle', this.currentLanguage)
                },
                'answer-checker': {
                    title: t('header.answer-checker', this.currentLanguage),
                    subtitle: t('header.answer-checker-subtitle', this.currentLanguage)
                },
                'learning-plan': {
                    title: t('header.learning-plan', this.currentLanguage),
                    subtitle: t('header.learning-plan-subtitle', this.currentLanguage)
                },
                'ai-chat': {
                    title: t('header.ai-chat', this.currentLanguage) || '💬 AI学习互动',
                    subtitle: t('header.ai-chat-subtitle', this.currentLanguage) || '与AI进行学习方面的自由讨论'
                },
                'history': {
                    title: t('header.history', this.currentLanguage),
                    subtitle: t('header.history-subtitle', this.currentLanguage)
                },
                'settings': {
                    title: t('header.settings', this.currentLanguage),
                    subtitle: t('header.settings-subtitle', this.currentLanguage)
                }
            };

            const config = pageConfig[this.currentPage];
            if (config && this.pageTitle && this.pageSubtitle) {
                this.pageTitle.textContent = config.title;
                this.pageSubtitle.textContent = config.subtitle;
            }

            // Update navigation items
            const navMap = {
                'question-generator': t('nav.question-generator', this.currentLanguage),
                'answer-checker': t('nav.answer-checker', this.currentLanguage),
                'learning-plan': t('nav.learning-plan', this.currentLanguage),
                'ai-chat': t('nav.ai-chat', this.currentLanguage),
                'progress': t('nav.progress', this.currentLanguage),
                'history': t('nav.history', this.currentLanguage) || '历史记录',
                'settings': t('nav.settings', this.currentLanguage)
            };

            if (this.navItems && this.navItems.length > 0) {
                this.navItems.forEach(item => {
                    try {
                        const page = item.dataset.page;
                        const label = item.querySelector('.nav-label');
                        if (label && navMap[page]) {
                            label.textContent = navMap[page];
                        }
                    } catch (e) {
                        console.warn('Error updating nav item:', e);
                    }
                });
            }

        // Update login modal
        const loginTitle = document.querySelector('.login-header h2');
        if (loginTitle) {
            loginTitle.textContent = t('login.title', this.currentLanguage);
        }

        // Update login tab button text
        if (this.loginTabBtn) {
            this.loginTabBtn.textContent = t('login.tab', this.currentLanguage);
        }
        if (this.registerTabBtn) {
            this.registerTabBtn.textContent = t('register.tab', this.currentLanguage);
        }

        // Update login form labels and placeholders
        const loginUsernameLabel = document.querySelector('#login-form label[for="login-username"]');
        if (loginUsernameLabel) loginUsernameLabel.textContent = t('login.username', this.currentLanguage);
        const loginPasswordLabel = document.querySelector('#login-form label[for="login-password"]');
        if (loginPasswordLabel) loginPasswordLabel.textContent = t('login.password', this.currentLanguage);
        const loginSubmitBtn = document.querySelector('#login-form button[type="submit"]');
        if (loginSubmitBtn) loginSubmitBtn.textContent = t('login.btn', this.currentLanguage);

        // Update register form labels and placeholders
        const registerUsernameLabel = document.querySelector('#register-form label[for="register-username"]');
        if (registerUsernameLabel) registerUsernameLabel.textContent = t('register.username', this.currentLanguage);
        const registerPasswordLabel = document.querySelector('#register-form label[for="register-password"]');
        if (registerPasswordLabel) registerPasswordLabel.textContent = t('register.password', this.currentLanguage);
        const registerConfirmLabel = document.querySelector('#register-form label[for="register-password-confirm"]');
        if (registerConfirmLabel) registerConfirmLabel.textContent = t('register.password-confirm', this.currentLanguage);
        const registerSubmitBtn = document.querySelector('#register-form button[type="submit"]');
        if (registerSubmitBtn) registerSubmitBtn.textContent = t('register.btn', this.currentLanguage);

        // Update user menu
        this.updateUserMenu();

        // Update Question Generator elements
        const qgInputTitle = document.getElementById('qg-input-title');
        if (qgInputTitle) qgInputTitle.textContent = t('qg.input-title', this.currentLanguage);

        const qgGradeLabel = document.querySelector('label[for="qg-grade"]');
        if (qgGradeLabel) qgGradeLabel.textContent = t('qg.grade-label', this.currentLanguage);

        const qgSubjectLabel = document.querySelector('label[for="qg-subject"]');
        if (qgSubjectLabel) qgSubjectLabel.textContent = t('qg.subject-label', this.currentLanguage);

        const qgDifficultyLabel = document.querySelector('label[for="qg-difficulty"]');
        if (qgDifficultyLabel) qgDifficultyLabel.textContent = t('qg.difficulty-label', this.currentLanguage);

        // Update difficulty options
        const difficultyOptions = document.querySelectorAll('select#qg-difficulty option');
        if (difficultyOptions.length >= 4) {
            difficultyOptions[0].textContent = t('qg.difficulty-easy', this.currentLanguage);
            difficultyOptions[1].textContent = t('qg.difficulty-intermediate', this.currentLanguage);
            difficultyOptions[2].textContent = t('qg.difficulty-hard', this.currentLanguage);
            difficultyOptions[3].textContent = t('qg.difficulty-expert', this.currentLanguage);
        }

        const qgQuestionTypeLabel = document.querySelector('label[for="qg-question-type"]');
        if (qgQuestionTypeLabel) qgQuestionTypeLabel.textContent = t('qg.question-type-label', this.currentLanguage);

        // Update question type options
        const typeOptions = document.querySelectorAll('select#qg-question-type option');
        if (typeOptions.length >= 7) {
            typeOptions[0].textContent = t('qg.select-default', this.currentLanguage);
            typeOptions[1].textContent = t('qg.type-multiple', this.currentLanguage);
            typeOptions[2].textContent = t('qg.type-fill', this.currentLanguage);
            typeOptions[3].textContent = t('qg.type-short', this.currentLanguage);
            typeOptions[4].textContent = t('qg.type-essay', this.currentLanguage);
            typeOptions[5].textContent = t('qg.type-calc', this.currentLanguage);
            typeOptions[6].textContent = t('qg.type-analysis', this.currentLanguage);
            if (typeOptions[7]) typeOptions[7].textContent = t('qg.type-mixed', this.currentLanguage);
        }

        const qgQuantityLabel = document.querySelector('label[for="qg-quantity"]');
        if (qgQuantityLabel) qgQuantityLabel.textContent = t('qg.quantity-label', this.currentLanguage);

        // Update quantity options
        const quantityOptions = document.querySelectorAll('select#qg-quantity option');
        if (quantityOptions.length >= 5) {
            quantityOptions[0].textContent = t('qg.quantity-1', this.currentLanguage);
            quantityOptions[1].textContent = t('qg.quantity-2', this.currentLanguage);
            quantityOptions[2].textContent = t('qg.quantity-3', this.currentLanguage);
            quantityOptions[3].textContent = t('qg.quantity-5', this.currentLanguage);
            quantityOptions[4].textContent = t('qg.quantity-10', this.currentLanguage);
        }

        const qgIncludeAnswerLabel = document.querySelector('span.qg-include-answer-label');
        if (qgIncludeAnswerLabel) {
            qgIncludeAnswerLabel.textContent = t('qg.include-answer-label', this.currentLanguage);
        }

        const questionInputLabel = document.querySelector('label[for="question-input"]');
        if (questionInputLabel) {
            const badge = questionInputLabel.querySelector('.label-badge');
            if (badge) {
                badge.textContent = t('qg.placeholder-optional', this.currentLanguage);
            }
        }

        const questionInput = document.getElementById('question-input');
        if (questionInput) questionInput.placeholder = t('qg.placeholder', this.currentLanguage);

        const submitTextBtn = document.getElementById('submit-text-btn');
        if (submitTextBtn) submitTextBtn.textContent = t('qg.submit', this.currentLanguage);

        // Update QG voice input button
        if (this.recordQGBtn && !this.isRecording) {
            this.recordQGBtn.textContent = t('qg.recording-start', this.currentLanguage);
        }

        // Update QG Output section - Questions
        const qgOutputTitle = document.querySelector('#question-generator .output-section h2.qg-output-title');
        if (qgOutputTitle) qgOutputTitle.textContent = t('qg.output-title', this.currentLanguage);
        const qgWaitingPlaceholder = document.querySelector('#response-container .placeholder.qg-waiting-placeholder');
        if (qgWaitingPlaceholder) qgWaitingPlaceholder.textContent = t('qg.waiting', this.currentLanguage);

        // Update QG Output section - Answers
        const qgAnswersTitle = document.querySelector('#question-generator h2.qg-answers-title');
        if (qgAnswersTitle) qgAnswersTitle.textContent = t('qg.answers-title', this.currentLanguage);
        const qgAnswersWaiting = document.querySelector('#answers-container .placeholder.qg-answers-waiting');
        if (qgAnswersWaiting) qgAnswersWaiting.textContent = t('qg.answers-waiting', this.currentLanguage);

        // Update QG Log section
        const logSectionTitle = document.querySelector('.log-section h3');
        if (logSectionTitle) logSectionTitle.textContent = '日志';

        // Update Answer Checker elements - input section title
        const answerCheckerInputTitle = document.querySelector('#answer-checker .input-section h2');
        if (answerCheckerInputTitle) answerCheckerInputTitle.textContent = t('ac.input-title', this.currentLanguage) || t('ac.title', this.currentLanguage);

        const questionLabel = document.querySelector('label[for="answer-question"]');
        if (questionLabel) {
            questionLabel.innerHTML = `${t('ac.question-label', this.currentLanguage)}<span class="label-badge">${t('ac.question-support', this.currentLanguage)}</span>`;
        }
        const answerQuestionInput = document.getElementById('answer-question');
        if (answerQuestionInput) answerQuestionInput.placeholder = t('qg.placeholder', this.currentLanguage);

        const recordQuestionBtn = document.getElementById('record-question-btn');
        if (recordQuestionBtn) recordQuestionBtn.textContent = t('ac.question-voice', this.currentLanguage);
        const uploadQuestionBtn = document.getElementById('upload-question-btn');
        if (uploadQuestionBtn) uploadQuestionBtn.textContent = t('ac.question-file', this.currentLanguage);

        const answerLabel = document.querySelector('label[for="answer-student"]');
        if (answerLabel) {
            answerLabel.innerHTML = `${t('ac.answer-label', this.currentLanguage)}<span class="label-badge">${t('ac.answer-support', this.currentLanguage)}</span>`;
        }
        const studentAnswerInput = document.getElementById('answer-student');
        if (studentAnswerInput) studentAnswerInput.placeholder = t('qg.placeholder', this.currentLanguage);

        const recordAnswerBtn = document.getElementById('record-answer-btn');
        if (recordAnswerBtn) recordAnswerBtn.textContent = t('ac.answer-voice', this.currentLanguage);
        const uploadAnswerBtn = document.getElementById('upload-answer-btn');
        if (uploadAnswerBtn) uploadAnswerBtn.textContent = t('ac.answer-file', this.currentLanguage);

        const standardLabel = document.querySelector('label[for="answer-standard"]');
        if (standardLabel) {
            standardLabel.innerHTML = `${t('ac.standard-label', this.currentLanguage)}<span class="label-badge optional">${t('ac.standard-optional', this.currentLanguage)}</span>`;
        }
        const standardAnswerInput = document.getElementById('answer-standard');
        if (standardAnswerInput) standardAnswerInput.placeholder = `[${t('btn.cancel', this.currentLanguage)}] ${t('qg.placeholder', this.currentLanguage)}`;

        const recordStandardBtn = document.getElementById('record-ac-standard-btn');
        if (recordStandardBtn) recordStandardBtn.textContent = t('qg.voice-input', this.currentLanguage);
        const uploadStandardBtn = document.getElementById('upload-standard-btn');
        if (uploadStandardBtn) uploadStandardBtn.textContent = t('ac.standard-file', this.currentLanguage);

        const submitAnswerBtn = document.querySelector('#answer-checker button[onclick*="submitAnswer"]');
        if (submitAnswerBtn) submitAnswerBtn.textContent = t('ac.submit', this.currentLanguage);

        const acOutputTitle = document.querySelector('#answer-checker .output-section h2');
        if (acOutputTitle) acOutputTitle.textContent = t('ac.output-title', this.currentLanguage);
        const acWaitingPlaceholder = document.querySelector('#answer-result .placeholder');
        if (acWaitingPlaceholder) acWaitingPlaceholder.textContent = t('ac.waiting', this.currentLanguage);

        // Update AI Chat elements
        const recordChatBtn = document.getElementById('record-chat-btn');
        if (recordChatBtn) recordChatBtn.textContent = t('qg.voice-input', this.currentLanguage);
        const uploadChatFileBtn = document.getElementById('upload-chat-file-btn');
        if (uploadChatFileBtn) uploadChatFileBtn.textContent = t('ai-chat.upload-file', this.currentLanguage);
        const chatSubmitBtn = document.getElementById('chat-submit-btn');
        if (chatSubmitBtn) chatSubmitBtn.textContent = t('ai-chat.submit', this.currentLanguage);
        const chatClearBtn = document.getElementById('chat-clear-btn');
        if (chatClearBtn) chatClearBtn.textContent = '🗑️ ' + (this.currentLanguage === 'chinese' ? '清空' : 'Clear');

        // Update Learning Plan elements
        const lpInputTitle = document.querySelector('#learning-plan .input-section h2');
        if (lpInputTitle) lpInputTitle.textContent = t('lp.title', this.currentLanguage) || '学习规划';

        const planGoalLabel = document.querySelector('label[for="plan-goal"]');
        if (planGoalLabel) planGoalLabel.textContent = t('lp.goal-label', this.currentLanguage);
        const planGoalInput = document.getElementById('plan-goal');
        if (planGoalInput) planGoalInput.placeholder = t('lp.goal-placeholder', this.currentLanguage);

        const planDurationLabel = document.querySelector('label[for="plan-duration"]');
        if (planDurationLabel) planDurationLabel.textContent = t('lp.duration-label', this.currentLanguage);

        const planLevelLabel = document.querySelector('label[for="plan-current-level"]');
        if (planLevelLabel) planLevelLabel.textContent = t('lp.level-label', this.currentLanguage);

        // Update Learning Plan voice input button
        if (this.recordPlanGoalBtn && !this.isRecording) {
            this.recordPlanGoalBtn.textContent = t('qg.recording-start', this.currentLanguage);
        }

        const submitPlanBtn = document.querySelector('#learning-plan button[onclick*="submitLearningPlan"]');
        if (submitPlanBtn) submitPlanBtn.textContent = t('lp.submit', this.currentLanguage);

        const lpOutputTitle = document.querySelector('#learning-plan .output-section h2');
        if (lpOutputTitle) lpOutputTitle.textContent = t('lp.output-title', this.currentLanguage);
        const lpWaitingPlaceholder = document.querySelector('#plan-result .placeholder');
        if (lpWaitingPlaceholder) lpWaitingPlaceholder.textContent = t('lp.waiting', this.currentLanguage);

        // Update AI Chat elements
        const chatIntroText = document.querySelector('#ai-chat .input-section p');
        if (chatIntroText) {
            chatIntroText.textContent = t('ai-chat.intro-text', this.currentLanguage);
        }

        // Update template buttons
        const templateBtns = document.querySelectorAll('.template-btn');
        const templates = ['concept', 'analysis', 'advice', 'breakthrough', 'extend', 'summary'];
        templateBtns.forEach((btn, index) => {
            if (templates[index]) {
                btn.textContent = t(`ai-chat.template-${templates[index]}`, this.currentLanguage);
            }
        });

        // Update AI Chat question label and badge
        const chatQuestionLabel = document.querySelector('#ai-chat label[for="chat-input"]');
        if (chatQuestionLabel) {
            const badgeText = t('ai-chat.support-text', this.currentLanguage);
            chatQuestionLabel.innerHTML = `${t('ai-chat.question-label', this.currentLanguage)}<span class="label-badge">${badgeText}</span>`;
        }

        // Update AI Chat input
        if (this.chatInput) {
            this.chatInput.placeholder = t('ai-chat.input-placeholder', this.currentLanguage);
        }

        // Update AI Chat voice input button
        if (this.recordChatBtn && !this.isRecording) {
            this.recordChatBtn.textContent = t('qg.recording-start', this.currentLanguage);
        }

        // Update AI Chat submit button
        const submitChatBtn = document.querySelector('#ai-chat button[onclick*="submitChat"]');
        if (submitChatBtn) submitChatBtn.textContent = t('ai-chat.submit', this.currentLanguage);

        // Update AI Chat output title
        const chatOutputTitle = document.querySelector('#ai-chat .output-section h2');
        if (chatOutputTitle) chatOutputTitle.textContent = t('ai-chat.output-title', this.currentLanguage);

        // Update AI Chat waiting placeholder
        const chatWaitingPlaceholder = document.querySelector('#chat-result .placeholder');
        if (chatWaitingPlaceholder) chatWaitingPlaceholder.textContent = t('ai-chat.waiting', this.currentLanguage);

        // Update History page elements
        const historyInputTitle = document.querySelector('#history .input-section h2');
        if (historyInputTitle) {
            // Just use the page header that was already updated
            historyInputTitle.textContent = t('header.history', this.currentLanguage);
        }

        // Update history clear button
        if (this.historyClearBtn) {
            this.historyClearBtn.textContent = t('history.clear-all', this.currentLanguage);
        }

        const historyList = document.getElementById('history-list');
        if (historyList && this.historyList) {
            // Re-render history with current language
            this.updateHistoryDisplay();
        }

        // Update all elements with data-i18n-key attributes generically
        const i18nElements = document.querySelectorAll('[data-i18n-key]');
        console.log(`Found ${i18nElements.length} elements with data-i18n-key`);

        let updatedCount = 0;
        i18nElements.forEach(el => {
            const key = el.dataset.i18nKey;
            if (key && el.tagName !== 'OPTION') { // Options are handled separately below
                const translation = t(key, this.currentLanguage);

                // Debug buttons
                if (el.tagName === 'BUTTON' && key.includes('settings')) {
                    console.log(`Button "${key}": current="${el.textContent.substring(0, 20)}" → translation="${translation.substring(0, 20)}"`);
                    updatedCount++;
                }

                // For elements with children (like labels with inputs), update text nodes carefully
                if (el.tagName === 'LABEL' && el.querySelector('input')) {
                    // For checkbox-label and radio-label, replace all text nodes but preserve input
                    const childNodesToRemove = [];
                    for (let node of el.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                            childNodesToRemove.push(node);
                        }
                    }
                    // Remove old text nodes
                    childNodesToRemove.forEach(node => node.remove());
                    // Add translated text after input
                    el.appendChild(document.createTextNode(' ' + translation));
                } else {
                    // For all other elements (buttons, h3, div, etc), directly set translated text
                    // Translation should already include emoji if needed
                    el.textContent = translation;

                    // Debug buttons after update
                    if (el.tagName === 'BUTTON' && key.includes('settings')) {
                        console.log(`  After update: "${el.textContent.substring(0, 20)}"`);
                    }
                }
            }
        });

        // Update all option elements with data-i18n-key attributes
        const i18nOptions = document.querySelectorAll('option[data-i18n-key]');
        i18nOptions.forEach(option => {
            const key = option.dataset.i18nKey;
            if (key) {
                option.textContent = t(key, this.currentLanguage);
            }
        });

        // Update all elements with data-i18n-key-placeholder attributes (for input/textarea placeholders)
        const placeholderElements = document.querySelectorAll('[data-i18n-key-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.dataset.i18nKeyPlaceholder;
            if (key) {
                const translation = t(key, this.currentLanguage);
                el.placeholder = translation;
            }
        });

        // Explicitly update all checkbox and radio labels that have text after input
        // This is a fallback to ensure no labels are missed
        const allCheckboxRadioLabels = document.querySelectorAll('label.checkbox-label, label.radio-label');
        allCheckboxRadioLabels.forEach(label => {
            const key = label.dataset.i18nKey;
            if (key) {
                const translation = t(key, this.currentLanguage);
                // Find and replace text nodes after the input
                const input = label.querySelector('input');
                if (input) {
                    // Remove all text nodes
                    const nodesToRemove = [];
                    for (let node of label.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                            nodesToRemove.push(node);
                        }
                    }
                    nodesToRemove.forEach(node => node.remove());
                    // Add translated text
                    label.appendChild(document.createTextNode(' ' + translation));
                }
            }
        });

        // Explicitly update all other labels and h2, h3, h4 with data-i18n-key (that don't have inputs)
        const otherLabelsAndH3 = document.querySelectorAll('label[data-i18n-key]:not(.checkbox-label):not(.radio-label), h2[data-i18n-key], h3[data-i18n-key], h4[data-i18n-key]');
        otherLabelsAndH3.forEach(el => {
            const key = el.dataset.i18nKey;
            if (key && !el.querySelector('input')) {
                const translation = t(key, this.currentLanguage);
                el.textContent = translation;
            }
        });

        // Explicitly update all buttons with data-i18n-key
        const allButtons = document.querySelectorAll('button[data-i18n-key]');
        allButtons.forEach(btn => {
            const key = btn.dataset.i18nKey;
            if (key) {
                const translation = t(key, this.currentLanguage);
                btn.textContent = translation;
            }
        });

        // Update Settings page
        const settingsMainTitle = document.querySelector('#settings .settings-section > h2');
        if (settingsMainTitle) settingsMainTitle.textContent = t('settings.title', this.currentLanguage);

        const settingsDescription = document.querySelector('.settings-description');
        if (settingsDescription) settingsDescription.textContent = t('settings.description', this.currentLanguage);

        // Update all settings group titles using the -group suffix keys
        const settingsGroupTitles = document.querySelectorAll('#settings .settings-group h3');
        const groupTitleMap = [
            'settings.language-group',
            'settings.education-level-group',
            'settings.exam-type-group',
            'settings.subjects-group',
            'settings.learning-style-group',
            'settings.difficulty-group',
            'settings.other-preferences-group'
        ];
        settingsGroupTitles.forEach((title, index) => {
            if (groupTitleMap[index]) {
                title.textContent = t(groupTitleMap[index], this.currentLanguage);
            }
        });

        const languageLabel = document.querySelector('label[for="settings-language"]');
        if (languageLabel) languageLabel.textContent = t('settings.select-language', this.currentLanguage);

        const gradeLabel = document.querySelector('label[for="settings-grade"]');
        if (gradeLabel) gradeLabel.textContent = t('settings.grade', this.currentLanguage);

        const examLabel = document.querySelector('label[for="settings-exam-type"]');
        if (examLabel) examLabel.textContent = t('settings.exam-system', this.currentLanguage);

        const difficultyLabel = document.querySelector('label[for="settings-difficulty"]');
        if (difficultyLabel) difficultyLabel.textContent = t('settings.choose-difficulty', this.currentLanguage);

        // Update Settings buttons
        const settingsLanguageSelect = document.getElementById('settings-language');
        if (settingsLanguageSelect) settingsLanguageSelect.value = this.currentLanguage;

        // Note: Settings buttons are now handled by the generic i18nElements loop above

        // Update Progress Page
        const progressTitle = document.getElementById('progress-title');
        if (progressTitle) progressTitle.textContent = t('progress.title', this.currentLanguage);

        const progressSubtitle = document.getElementById('progress-subtitle');
        if (progressSubtitle) progressSubtitle.textContent = t('progress.subtitle', this.currentLanguage);

        const clearProgressBtn = document.getElementById('clear-progress-btn');
        const clearBtnText = document.getElementById('clear-btn-text');
        if (clearBtnText) clearBtnText.textContent = t('progress.clear-btn', this.currentLanguage);

        const statLabel1 = document.getElementById('stat-label-1');
        if (statLabel1) statLabel1.textContent = t('progress.stat-total-activities', this.currentLanguage);

        const statLabel2 = document.getElementById('stat-label-2');
        if (statLabel2) statLabel2.textContent = t('progress.stat-subjects', this.currentLanguage);

        const statLabel3 = document.getElementById('stat-label-3');
        if (statLabel3) statLabel3.textContent = t('progress.stat-last-activity', this.currentLanguage);

        const aiAnalysisHeader = document.getElementById('ai-analysis-header');
        if (aiAnalysisHeader) aiAnalysisHeader.textContent = t('progress.ai-analysis-header', this.currentLanguage);

        const aiAnalysisEmptyMsg = document.getElementById('ai-analysis-empty-msg');
        if (aiAnalysisEmptyMsg) aiAnalysisEmptyMsg.textContent = t('progress.ai-analysis-empty', this.currentLanguage);

        const aiAnalysisBtnText = document.getElementById('ai-analysis-btn-text');
        if (aiAnalysisBtnText) aiAnalysisBtnText.textContent = t('progress.ai-analysis-btn', this.currentLanguage);

        // Also update the header when on progress page
        if (this.currentPage === 'progress') {
            const pageTitle = document.getElementById('page-title');
            const pageSubtitle = document.getElementById('page-subtitle');
            if (pageTitle) pageTitle.textContent = t('progress.title', this.currentLanguage);
            if (pageSubtitle) pageSubtitle.textContent = t('progress.subtitle', this.currentLanguage);
        }

            console.log('UI language update completed successfully');
        } catch (error) {
            console.error('Error updating UI language:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    changeLanguage(newLanguage) {
        if (LANGUAGES[newLanguage]) {
            this.currentLanguage = newLanguage;
            localStorage.setItem('futuretech-language', newLanguage);

            // Save language preference to user if logged in
            if (this.currentUser) {
                this.currentUser.language = newLanguage;
                localStorage.setItem('futuretech-user', JSON.stringify(this.currentUser));
            }

            // Update all UI elements
            this.updateUILanguage();
            this.updateSelectOptions();
            this.log(t('msg.language-changed', newLanguage), 'success');
        }
    }

    async handleCustomLanguageTranslation() {
        const customLanguageInput = document.getElementById('custom-language-input');
        const statusDiv = document.getElementById('custom-language-status');

        if (!customLanguageInput || !customLanguageInput.value.trim()) {
            if (statusDiv) {
                statusDiv.textContent = '❌ 请输入语言名称';
                statusDiv.style.color = '#d32f2f';
            }
            return;
        }

        const languageName = customLanguageInput.value.trim();

        if (statusDiv) {
            statusDiv.textContent = `⏳ 正在翻译到${languageName}...`;
            statusDiv.style.color = '#1976d2';
        }

        try {
            // Overall timeout protection (250 seconds max - allows 180s for translation + buffer)
            const overallTimeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('翻译超时（250秒）。后端翻译服务响应过慢，请检查网络连接或稍后重试')), 250000)
            );

            // Main translation process
            const translationProcess = (async () => {
                // Get all translatable strings
                const textsToTranslate = this.translationService.getAllTranslatableStrings();

                if (textsToTranslate.length === 0) {
                    throw new Error('未找到可翻译的文本');
                }

                // Call translation API with 180 second timeout (3 minutes for full translation of 280+ strings)
                const translations = await this.translationService.translateBatch(textsToTranslate, languageName, 180000);

                console.log('Translation API response object:', Object.keys(translations).length, 'keys');
                const samples = Object.entries(translations).slice(0, 5);
                console.log('First 5 translations:');
                samples.forEach(([orig, trans]) => {
                    console.log(`  "${orig}" → "${trans}"`);
                });

                if (!translations || Object.keys(translations).length === 0) {
                    throw new Error('翻译失败，请检查语言名称是否正确');
                }

                // Create a temporary language object for this custom language
                const customLanguageKey = `custom-${languageName}`;

                // Cache the translations
                this.translationService.cacheTranslations(customLanguageKey, translations);

                // Create translations mapping for the UI
                // LANGUAGES structure is already flat (keys like 'nav.progress', values are strings)
                const languageTranslations = {};
                let successCount = 0;
                let failCount = 0;

                // Iterate through Chinese language object keys (skip 'name' and 'code')
                Object.keys(LANGUAGES.chinese).forEach(key => {
                    // Skip metadata fields
                    if (key === 'name' || key === 'code') {
                        languageTranslations[key] = languageName;
                        return;
                    }

                    const chineseValue = LANGUAGES.chinese[key];

                    // Look up the translated value
                    if (chineseValue && translations[chineseValue]) {
                        languageTranslations[key] = translations[chineseValue];
                        successCount++;
                        if (successCount <= 3) {
                            console.log(`✓ Mapped: "${key}" (中文:"${chineseValue}") → (越南:"${translations[chineseValue]}")`);
                        }
                    } else {
                        failCount++;
                        // If no translation found, use the original Chinese as fallback
                        languageTranslations[key] = chineseValue;
                        if (failCount <= 3) {
                            console.log(`✗ No translation for: "${key}" (中文:"${chineseValue}")`);
                        }
                    }
                });

                console.log(`Translation mapping complete: ${successCount} successful, ${failCount} failed`);
                const totalKeys = Object.keys(LANGUAGES.chinese).length;
                console.log(`Total keys processed: ${totalKeys}`);

                // Verify that we actually got real translations (not just original Chinese)
                // Check if at least 80% of mappings are actual translations
                if (successCount < totalKeys * 0.8) {
                    console.warn(`Only ${successCount}/${totalKeys} translations successful. Translation may have timed out.`);
                    throw new Error(`翻译不完整（仅${successCount}/${totalKeys}）。可能翻译API超时或响应错误，请稍后重试`);
                }

                // Add to LANGUAGES temporarily
                LANGUAGES[customLanguageKey] = {
                    name: languageName,
                    code: customLanguageKey,
                    ...languageTranslations
                };

                // Verify what we added to LANGUAGES
                console.log('Added to LANGUAGES:', customLanguageKey);
                console.log('LANGUAGES[customLanguageKey] sample values:');
                console.log('  nav.progress:', LANGUAGES[customLanguageKey]['nav.progress']);
                console.log('  nav.settings:', LANGUAGES[customLanguageKey]['nav.settings']);
                console.log('  header.progress:', LANGUAGES[customLanguageKey]['header.progress']);

                // Switch to the custom language
                this.currentLanguage = customLanguageKey;
                console.log('Current language set to:', this.currentLanguage);
                localStorage.setItem('futuretech-language', customLanguageKey);

                // Save language preference to user if logged in
                if (this.currentUser) {
                    this.currentUser.language = customLanguageKey;
                    localStorage.setItem('futuretech-user', JSON.stringify(this.currentUser));
                }

                // Update all UI elements
                this.updateUILanguage();
                this.updateSelectOptions();

                // Update the language selector to show custom language
                const languageSelect = document.getElementById('settings-language');
                if (languageSelect && !Array.from(languageSelect.options).find(opt => opt.value === customLanguageKey)) {
                    const option = document.createElement('option');
                    option.value = customLanguageKey;
                    option.textContent = languageName;
                    option.selected = true;
                    languageSelect.appendChild(option);
                }

                return { success: true, languageName };
            })();

            // Race between translation process and overall timeout
            const result = await Promise.race([translationProcess, overallTimeoutPromise]);

            if (result.success) {
                if (statusDiv) {
                    statusDiv.textContent = `✅ 已成功翻译到${result.languageName}`;
                    statusDiv.style.color = '#388e3c';
                }
                this.log(`✅ 已成功切换到${result.languageName}`, 'success');
            }

        } catch (error) {
            console.error('Custom language translation error:', error);
            if (statusDiv) {
                statusDiv.textContent = `❌ 翻译失败：${error.message}`;
                statusDiv.style.color = '#d32f2f';
            }
            this.log(`❌ 翻译失败：${error.message}`, 'error');
        }
    }

    updateSelectOptions() {
        // Update QG grade select
        const qgGradeSelect = document.getElementById('qg-grade');
        if (qgGradeSelect) {
            const grades = ['', 'primary-1', 'primary-2', 'primary-3', 'primary-4', 'primary-5', 'primary-6',
                          'junior-1', 'junior-2', 'junior-3', 'senior-1', 'senior-2', 'senior-3',
                          'year-1', 'year-2', 'year-3', 'year-4', 'year-5', 'year-6',
                          'year-7', 'year-8', 'year-9', 'year-10', 'year-11', 'year-12', 'year-13'];
            const options = qgGradeSelect.querySelectorAll('option');
            grades.forEach((grade, idx) => {
                if (options[idx]) {
                    if (grade === '') {
                        options[idx].textContent = t('qg.select-default', this.currentLanguage);
                    } else {
                        options[idx].textContent = t(`grade.${grade}`, this.currentLanguage);
                    }
                }
            });
        }

        // Update QG subject select
        const qgSubjectSelect = document.getElementById('qg-subject');
        if (qgSubjectSelect) {
            const subjects = ['', 'math', 'english', 'science', 'physics', 'chemistry', 'biology', 'history', 'geography', 'languages', 'economics'];
            const options = qgSubjectSelect.querySelectorAll('option');
            subjects.forEach((subject, idx) => {
                if (options[idx]) {
                    if (subject === '') {
                        options[idx].textContent = t('qg.select-default', this.currentLanguage);
                    } else {
                        options[idx].textContent = t(`subject.${subject}`, this.currentLanguage);
                    }
                }
            });
        }

        // Update settings grade options
        const settingsGradeSelect = document.getElementById('settings-grade');
        if (settingsGradeSelect) {
            const grades = ['', 'primary-1', 'primary-2', 'primary-3', 'primary-4', 'primary-5', 'primary-6',
                          'junior-1', 'junior-2', 'junior-3', 'senior-1', 'senior-2', 'senior-3',
                          'year-1', 'year-2', 'year-3', 'year-4', 'year-5', 'year-6',
                          'year-7', 'year-8', 'year-9', 'year-10', 'year-11', 'year-12', 'year-13'];
            const options = settingsGradeSelect.querySelectorAll('option');
            grades.forEach((grade, idx) => {
                if (options[idx]) {
                    if (grade === '') {
                        options[idx].textContent = t('qg.select-default', this.currentLanguage);
                    } else {
                        options[idx].textContent = t(`grade.${grade}`, this.currentLanguage);
                    }
                }
            });
        }

        // Update exam type options
        const examSelect = document.getElementById('settings-exam-type');
        if (examSelect) {
            const exams = ['', 'gaokao', 'igcse', 'a-level', 'ib', 'sat', 'act', 'ap', 'amc', 'other', 'none'];
            const options = examSelect.querySelectorAll('option');
            exams.forEach((exam, idx) => {
                if (options[idx]) {
                    if (exam === '') {
                        options[idx].textContent = t('qg.select-default', this.currentLanguage);
                    } else {
                        options[idx].textContent = t(`exam.${exam}`, this.currentLanguage);
                    }
                }
            });
        }

        // Update subject checkbox labels
        // Update learning style radio button labels

        // Update difficulty options
        const difficultySelect = document.getElementById('settings-difficulty');
        if (difficultySelect) {
            const difficulties = ['easy', 'intermediate', 'hard', 'expert'];
            const options = difficultySelect.querySelectorAll('option');
            difficulties.forEach((difficulty, idx) => {
                if (options[idx]) {
                    options[idx].textContent = t(`difficulty.${difficulty}`, this.currentLanguage);
                }
            });
        }

        // Update Learning Plan page select elements
        const planDurationSelect = document.getElementById('plan-duration');
        if (planDurationSelect) {
            const durations = ['1week', '1month', '3month', '6month', '1year'];
            const currentValue = planDurationSelect.value;
            planDurationSelect.innerHTML = '';
            durations.forEach(duration => {
                const option = document.createElement('option');
                option.value = duration;
                option.textContent = t(`lp.duration.${duration}`, this.currentLanguage);
                planDurationSelect.appendChild(option);
            });
            planDurationSelect.value = currentValue;
        }

        const planLevelSelect = document.getElementById('plan-current-level');
        if (planLevelSelect) {
            const levels = ['beginner', 'intermediate', 'advanced'];
            const currentValue = planLevelSelect.value;
            planLevelSelect.innerHTML = '';
            levels.forEach(level => {
                const option = document.createElement('option');
                option.value = level;
                option.textContent = t(`lp.${level}`, this.currentLanguage);
                planLevelSelect.appendChild(option);
            });
            planLevelSelect.value = currentValue;
        }

        // Update language selector options
        const languageSelect = document.getElementById('settings-language');
        if (languageSelect) {
            const currentValue = languageSelect.value;
            languageSelect.innerHTML = '';
            Object.keys(LANGUAGES).forEach(langCode => {
                const option = document.createElement('option');
                option.value = langCode;
                option.textContent = LANGUAGES[langCode].name;
                languageSelect.appendChild(option);
            });
            languageSelect.value = currentValue || this.currentLanguage;
        }
    }

    // ========== Settings Functions ==========

    /**
     * Get the storage key for settings based on current user
     * If logged in, use user-specific key; otherwise use global key
     */
    getSettingsStorageKey() {
        if (this.currentUser && this.currentUser.username) {
            return `futuretech-settings-${this.currentUser.username}`;
        }
        return 'futuretech-settings-guest';
    }

    debugSettings() {
        /**
         * Debug method to check settings state - call from browser console as: app.debugSettings()
         */
        console.log('=== SETTINGS DEBUG INFO ===');
        console.log('Current User:', this.currentUser);
        console.log('Settings Storage Key:', this.getSettingsStorageKey());
        console.log('Current Settings Object:', this.settings);

        // Check what's in localStorage
        const key = this.getSettingsStorageKey();
        const localStorageSettings = localStorage.getItem(key);
        console.log('Settings in localStorage key:', key, '=', localStorageSettings);

        // Check what's in futuretech-users
        const allUsers = JSON.parse(localStorage.getItem('futuretech-users') || '{}');
        if (this.currentUser && this.currentUser.username) {
            console.log('User settings in futuretech-users:', allUsers[this.currentUser.username]?.settings);
        }

        // Check form elements
        console.log('Form element values:');
        console.log('  settings-grade:', document.getElementById('settings-grade')?.value);
        console.log('  settings-language:', document.getElementById('settings-language')?.value);
        console.log('  settings-difficulty:', document.getElementById('settings-difficulty')?.value);
        console.log('  settings-exam-type:', document.getElementById('settings-exam-type')?.value);

        console.log('=== END DEBUG INFO ===');
    }

    /**
     * Initialize settings event listeners
     */
    initializeSettingsEventListeners() {
        try {
            // Reading speed slider
            if (this.readingSpeedSlider) {
                this.readingSpeedSlider.addEventListener('input', (e) => {
                    const speed = parseFloat(e.target.value);
                    const displayEl = document.getElementById('reading-speed-display');
                    if (displayEl) {
                        displayEl.textContent = speed.toFixed(1) + 'x';
                    }
                    // Update the settings immediately
                    if (!this.settings.accessibilitySettings) {
                        this.settings.accessibilitySettings = {};
                    }
                    this.settings.accessibilitySettings.readingSpeed = speed;
                });
            }
        } catch (error) {
            console.error('Error initializing settings event listeners:', error);
        }
    }

    loadSettings() {
        try {
            const key = this.getSettingsStorageKey();
            let saved = localStorage.getItem(key);

            // If no user-specific settings found, try to load from the user account in futuretech-users
            if (!saved && this.currentUser && this.currentUser.username) {
                const allUsers = JSON.parse(localStorage.getItem('futuretech-users') || '{}');
                const userAccount = allUsers[this.currentUser.username];
                if (userAccount && userAccount.settings) {
                    saved = JSON.stringify(userAccount.settings);
                    console.log('Loading settings from futuretech-users for user:', this.currentUser.username);
                }
            }

            this.settings = saved ? JSON.parse(saved) : { ...defaultSettings };
            console.log('Loaded settings:', this.settings);
            this.applySettings();
            this.log('✅ 已加载用户设置', 'success');
        } catch (error) {
            this.settings = { ...defaultSettings };
            console.error('Settings load error:', error);
            this.log(`⚠️ 设置加载失败，使用默认设置：${error.message}`, 'warning');
        }
    }

    applySettings() {
        try {
            console.log('Applying settings to form elements...');
            console.log('Current settings object:', this.settings);

            // Apply language setting
            const langElement = document.getElementById('settings-language');
            if (langElement) {
                langElement.value = this.settings.language || defaultSettings.language;
                console.log('Applied language:', langElement.value);
            } else {
                console.warn('Language element not found');
            }

            // Apply grade setting
            const gradeElement = document.getElementById('settings-grade');
            if (gradeElement) {
                gradeElement.value = this.settings.grade || '';
                console.log('Applied grade:', gradeElement.value, 'from settings:', this.settings.grade);
            } else {
                console.warn('Grade element not found');
            }

            // Apply exam type setting
            const examTypeElement = document.getElementById('settings-exam-type');
            if (examTypeElement) {
                examTypeElement.value = this.settings.examType || '';
                console.log('Applied exam type:', examTypeElement.value);
            }

            // Apply subject checkboxes
            const subjectCheckboxes = document.querySelectorAll('input[name="subject"]');
            console.log('Found', subjectCheckboxes.length, 'subject checkboxes, applying:', this.settings.subjects);
            subjectCheckboxes.forEach(checkbox => {
                checkbox.checked = this.settings.subjects && this.settings.subjects.includes(checkbox.value);
            });

            // Apply learning style
            const learningRadios = document.querySelectorAll('input[name="learning-style"]');
            console.log('Found', learningRadios.length, 'learning style radios, applying:', this.settings.learningStyle);
            learningRadios.forEach(radio => {
                radio.checked = radio.value === (this.settings.learningStyle || 'detailed');
            });

            // Apply custom learning style description
            const learningStyleDesc = document.getElementById('settings-learning-style-description');
            if (learningStyleDesc) {
                learningStyleDesc.value = this.settings.learningStyleDescription || '';
            }

            // Apply difficulty
            const difficultyElement = document.getElementById('settings-difficulty');
            if (difficultyElement) {
                difficultyElement.value = this.settings.difficulty || 'intermediate';
                console.log('Applied difficulty:', difficultyElement.value);
            }

            // Apply checkboxes
            const solutionsElement = document.getElementById('settings-include-solutions');
            if (solutionsElement) {
                solutionsElement.checked = this.settings.includeSolutions !== false;
            }

            const analysisElement = document.getElementById('settings-include-analysis');
            if (analysisElement) {
                analysisElement.checked = this.settings.includeAnalysis !== false;
            }

            const contextElement = document.getElementById('settings-use-context');
            if (contextElement) {
                contextElement.checked = this.settings.useContext !== false;
            }
        } catch (error) {
            console.error('Error applying settings:', error);
        }

        // Add event listeners for visual feedback on select changes
        const languageSelect = document.getElementById('settings-language');
        if (languageSelect) {
            languageSelect.addEventListener('change', () => this.updateSelectHighlight(languageSelect));
            this.updateSelectHighlight(languageSelect);
        }

        const gradeSelect = document.getElementById('settings-grade');
        if (gradeSelect) {
            gradeSelect.addEventListener('change', () => this.updateSelectHighlight(gradeSelect));
            this.updateSelectHighlight(gradeSelect);
        }

        const examSelect = document.getElementById('settings-exam-type');
        if (examSelect) {
            examSelect.addEventListener('change', () => this.updateSelectHighlight(examSelect));
            this.updateSelectHighlight(examSelect);
        }

        const difficultySelect = document.getElementById('settings-difficulty');
        if (difficultySelect) {
            difficultySelect.addEventListener('change', () => this.updateSelectHighlight(difficultySelect));
            this.updateSelectHighlight(difficultySelect);
        }

        // Add event listeners for checkbox visual feedback
        const subjectCheckboxes = document.querySelectorAll('input[name="subject"]');
        subjectCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                checkbox.parentElement.style.transition = 'all 0.2s ease';
            });
        });

        // Add event listeners for radio button visual feedback
        const learningRadios = document.querySelectorAll('input[name="learning-style"]');
        learningRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                radio.parentElement.style.transition = 'all 0.2s ease';
            });
        });

        // Add event listeners for learning style voice input
        const voiceBtn = document.getElementById('settings-learning-style-voice-btn');
        const clearVoiceBtn = document.getElementById('settings-learning-style-clear-voice-btn');
        const voiceStatus = document.getElementById('settings-learning-style-voice-status');

        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.startLearningStyleVoiceInput(voiceBtn, clearVoiceBtn, voiceStatus);
            });
        }

        if (clearVoiceBtn) {
            clearVoiceBtn.addEventListener('click', () => {
                this.clearLearningStyleVoiceInput(voiceBtn, clearVoiceBtn, voiceStatus);
            });
        }

        // Apply GUI Preferences
        const fontSizeSlider = document.getElementById('settings-font-size');
        if (fontSizeSlider) {
            const fontSize = this.settings.fontSize || 100;
            fontSizeSlider.value = fontSize;
            const displayEl = document.getElementById('font-size-display');
            if (displayEl) {
                displayEl.textContent = fontSize;
            }
            this.applyFontSize(fontSize);
        }

        const dyslexiaFontCheckbox = document.getElementById('settings-dyslexia-font');
        if (dyslexiaFontCheckbox) {
            dyslexiaFontCheckbox.checked = this.settings.dyslexiaFont || false;
            this.applyDyslexiaFont(this.settings.dyslexiaFont || false);
        }

        const highContrastCheckbox = document.getElementById('settings-high-contrast');
        if (highContrastCheckbox) {
            highContrastCheckbox.checked = this.settings.highContrast || false;
            this.applyHighContrast(this.settings.highContrast || false);
        }

        const lineSpacingRadios = document.querySelectorAll('input[name="line-spacing"]');
        if (lineSpacingRadios.length > 0) {
            lineSpacingRadios.forEach(radio => {
                radio.checked = radio.value === (this.settings.lineSpacing || 'normal');
            });
            this.applyLineSpacing(this.settings.lineSpacing || 'normal');
        }

        const themeRadios = document.querySelectorAll('input[name="theme"]');
        if (themeRadios.length > 0) {
            themeRadios.forEach(radio => {
                radio.checked = radio.value === (this.settings.theme || 'light');
            });
            this.applyTheme(this.settings.theme || 'light');
        }

        // Apply Question Generator selections with saved settings
        if (this.qgGrade) {
            this.qgGrade.value = this.settings.grade || '';
        }
        if (this.qgSubject) {
            this.qgSubject.value = this.settings.subjects && this.settings.subjects.length > 0 ? this.settings.subjects[0] : '';
        }
        if (this.qgDifficulty) {
            this.qgDifficulty.value = this.settings.difficulty || 'intermediate';
        }
        if (this.qgQuantity) {
            this.qgQuantity.value = this.settings.questionQuantity || '3';
        }
        if (this.qgIncludeAnswer) {
            this.qgIncludeAnswer.checked = this.settings.includeSolutions !== false;
            // Initialize answers section visibility
            if (this.answersSection) {
                this.answersSection.style.display = this.qgIncludeAnswer.checked ? 'block' : 'none';
            }
        }

        // Apply Accessibility Settings
        const accessibilitySettings = this.settings.accessibilitySettings || defaultSettings.accessibilitySettings;

        if (this.accessibilityCheckbox) {
            this.accessibilityCheckbox.checked = accessibilitySettings.enabled;
            this.toggleAccessibilityUI(accessibilitySettings.enabled);
        }

        // Apply navigation type
        this.navRadioButtons.forEach(radio => {
            radio.checked = radio.value === (accessibilitySettings.navType || 'arrows');
        });

        // Apply button size
        if (this.buttonSizeSlider) {
            this.buttonSizeSlider.value = accessibilitySettings.buttonSize || 100;
            this.applyButtonSizeCSS();
        }

        // Apply button spacing
        this.buttonSpacingRadios.forEach(radio => {
            radio.checked = radio.value === (accessibilitySettings.buttonSpacing || 'normal');
        });
        this.applyButtonSpacingCSS();

        // Apply feedback settings
        if (this.keySoundCheckbox) {
            this.keySoundCheckbox.checked = accessibilitySettings.keySoundEnabled !== false;
        }
        if (this.voiceNavCheckbox) {
            this.voiceNavCheckbox.checked = accessibilitySettings.voiceNavEnabled !== false;
        }
        if (this.errorAlertsCheckbox) {
            this.errorAlertsCheckbox.checked = accessibilitySettings.errorAlertsEnabled !== false;
        }
        if (this.feedbackVolumeSlider) {
            this.feedbackVolumeSlider.value = accessibilitySettings.feedbackVolume || 50;
        }

        // Apply reading speed setting
        const readingSpeedSlider = document.getElementById('settings-reading-speed');
        if (readingSpeedSlider) {
            const readingSpeed = accessibilitySettings.readingSpeed || 1;
            readingSpeedSlider.value = readingSpeed;
            const displayEl = document.getElementById('reading-speed-display');
            if (displayEl) {
                displayEl.textContent = readingSpeed.toFixed(1) + 'x';
            }
        }

        // Initialize accessibility if enabled
        if (accessibilitySettings.enabled) {
            this.initAccessibility();
        }
    }

    /**
     * Toggle accessibility UI visibility
     */
    toggleAccessibilityUI(enabled) {
        const groups = [this.accessibilityNavGroup, this.accessibilityUIGroup, this.accessibilityFeedbackGroup];
        groups.forEach(group => {
            if (group) {
                group.style.display = enabled ? 'block' : 'none';
            }
        });
    }

    /**
     * Initialize accessibility features when enabled
     */
    initAccessibility() {
        const accessibilitySettings = this.settings.accessibilitySettings;

        // Remove existing listener if any
        document.removeEventListener('keydown', this.accessibilityKeyListener);

        // Add keyboard navigation listener
        this.accessibilityKeyListener = (e) => {
            const isArrowUp = accessibilitySettings.navType === 'arrows' && e.key === 'ArrowUp';
            const isArrowDown = accessibilitySettings.navType === 'arrows' && e.key === 'ArrowDown';

            if (isArrowUp) {
                e.preventDefault();
                this.navigateAccessibility(-1);
            } else if (isArrowDown) {
                e.preventDefault();
                this.navigateAccessibility(1);
            }
        };

        document.addEventListener('keydown', this.accessibilityKeyListener);
    }

    /**
     * Navigate to next/previous page using keyboard
     */
    navigateAccessibility(direction) {
        // Check if keyboard navigation is disabled
        if (this.settings.accessibilitySettings.navType === 'disabled') {
            return;
        }

        const currentIndex = this.pageList.indexOf(this.currentPage);
        let nextIndex = currentIndex + direction;

        // Wrap around
        if (nextIndex < 0) nextIndex = this.pageList.length - 1;
        if (nextIndex >= this.pageList.length) nextIndex = 0;

        const nextPage = this.pageList[nextIndex];
        this.switchPage(nextPage);

        // Provide feedback
        if (this.settings.accessibilitySettings.keySoundEnabled) {
            this.playKeySound();
        }
        if (this.settings.accessibilitySettings.voiceNavEnabled) {
            this.speakPageName(nextPage);
        }
    }

    /**
     * Play key sound feedback
     */
    playKeySound() {
        try {
            const volume = (this.settings.accessibilitySettings.feedbackVolume / 100) * 0.3;

            // Try using Web Audio API if available
            if (window.AudioContext || window.webkitAudioContext) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioContext();

                // Create a simple beep sound
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;  // 800 Hz
                oscillator.type = 'sine';

                const startTime = audioContext.currentTime;
                gainNode.gain.setValueAtTime(volume, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

                oscillator.start(startTime);
                oscillator.stop(startTime + 0.1);
            } else {
                // Fallback: try using a simple audio element if available
                console.warn('Web Audio API not available, using fallback');
            }
        } catch (error) {
            console.warn('Error playing key sound:', error);
        }
    }

    /**
     * Speak page name using text-to-speech
     */
    speakPageName(pageName) {
        try {
            const pageNameMap = {
                'question-generator': '智能出题器',
                'answer-checker': '智能批答案',
                'learning-plan': '学习规划',
                'ai-chat': 'AI学习互动',
                'plan-manager': '学习计划',
                'progress': '学习进度',
                'learning-settings': '学习设置',
                'user-settings': '用户设置',
                'history': '历史记录'
            };

            const displayName = pageNameMap[pageName] || pageName;

            if ('speechSynthesis' in window) {
                // Cancel any ongoing speech
                speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(displayName);
                utterance.lang = this.currentLanguage === 'chinese' ? 'zh-CN' : 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = this.settings.accessibilitySettings.feedbackVolume / 100;

                speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error('Error speaking page name:', error);
        }
    }

    /**
     * Apply button size CSS
     */
    applyButtonSizeCSS() {
        const size = this.settings.accessibilitySettings.buttonSize;
        const scale = size / 100;

        // Create or update style element
        let styleEl = document.getElementById('accessibility-button-size-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'accessibility-button-size-style';
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            button, input[type="button"], input[type="submit"], a.btn, .btn {
                transform: scale(${scale}) !important;
                transform-origin: left center !important;
            }
        `;
    }

    /**
     * Apply button spacing CSS
     */
    applyButtonSpacingCSS() {
        const spacing = this.settings.accessibilitySettings.buttonSpacing;
        const spacingMap = {
            'tight': '2px',
            'normal': '8px',
            'relaxed': '16px'
        };

        const space = spacingMap[spacing] || spacingMap['normal'];

        // Create or update style element
        let styleEl = document.getElementById('accessibility-button-spacing-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'accessibility-button-spacing-style';
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            button, input[type="button"], input[type="submit"], a.btn, .btn {
                margin: ${space} !important;
                padding: ${space} !important;
            }
        `;
    }

    saveSettings() {
        try {
            // Collect language
            const newLanguage = document.getElementById('settings-language').value;
            this.settings.language = newLanguage;

            // Collect grade
            this.settings.grade = document.getElementById('settings-grade').value;

            // Collect exam type
            this.settings.examType = document.getElementById('settings-exam-type').value;

            // Collect subjects
            const selectedSubjects = Array.from(document.querySelectorAll('input[name="subject"]:checked'))
                .map(checkbox => checkbox.value);
            this.settings.subjects = selectedSubjects;

            // Collect learning style
            const selectedStyle = document.querySelector('input[name="learning-style"]:checked');
            this.settings.learningStyle = selectedStyle ? selectedStyle.value : 'detailed';

            // Collect custom learning style description
            const learningStyleDesc = document.getElementById('settings-learning-style-description');
            if (learningStyleDesc) {
                this.settings.learningStyleDescription = learningStyleDesc.value.trim();
            }

            // Collect difficulty
            this.settings.difficulty = document.getElementById('settings-difficulty').value;

            // Collect other preferences
            this.settings.includeSolutions = document.getElementById('settings-include-solutions').checked;
            this.settings.includeAnalysis = document.getElementById('settings-include-analysis').checked;
            this.settings.useContext = document.getElementById('settings-use-context').checked;

            // Collect GUI Preferences
            this.settings.fontSize = parseInt(document.getElementById('settings-font-size').value) || 100;
            this.settings.dyslexiaFont = document.getElementById('settings-dyslexia-font').checked;
            this.settings.highContrast = document.getElementById('settings-high-contrast').checked;
            const selectedSpacing = document.querySelector('input[name="line-spacing"]:checked');
            this.settings.lineSpacing = selectedSpacing ? selectedSpacing.value : 'normal';
            const selectedTheme = document.querySelector('input[name="theme"]:checked');
            this.settings.theme = selectedTheme ? selectedTheme.value : 'light';

            // Save to user-specific localStorage
            const key = this.getSettingsStorageKey();
            localStorage.setItem(key, JSON.stringify(this.settings));

            // Also save to user data if logged in
            if (this.currentUser) {
                this.currentUser.settings = this.settings;
                localStorage.setItem('futuretech-user', JSON.stringify(this.currentUser));

                // IMPORTANT: Update the settings in the master futuretech-users database
                // so settings persist when user logs back in
                const allUsers = JSON.parse(localStorage.getItem('futuretech-users') || '{}');
                if (allUsers[this.currentUser.username]) {
                    allUsers[this.currentUser.username].settings = this.settings;
                    localStorage.setItem('futuretech-users', JSON.stringify(allUsers));
                }
            }

            // Change language if different
            if (newLanguage !== this.currentLanguage) {
                this.changeLanguage(newLanguage);
            }

            // Update highlight status for select elements
            const languageSelect = document.getElementById('settings-language');
            const gradeSelect = document.getElementById('settings-grade');
            const examSelect = document.getElementById('settings-exam-type');
            const difficultySelect = document.getElementById('settings-difficulty');
            if (languageSelect) this.updateSelectHighlight(languageSelect);
            if (gradeSelect) this.updateSelectHighlight(gradeSelect);
            if (examSelect) this.updateSelectHighlight(examSelect);
            if (difficultySelect) this.updateSelectHighlight(difficultySelect);

            const successMsg = t('settings.saved', this.currentLanguage) || (this.currentLanguage === 'chinese' ? '✅ 设置已保存！' : '✅ Settings saved!');
            this.showSettingsMessage(successMsg, 'success');
            const logMsg = this.currentLanguage === 'chinese' ? '💾 用户设置已保存' : '💾 User settings saved';
            this.log(logMsg, 'success');

            // Also show a simple alert as immediate feedback
            if (this.currentLanguage === 'chinese') {
                console.log('✅ 设置已保存！');
            } else {
                console.log('✅ Settings saved!');
            }

        } catch (error) {
            const errorPrefix = this.currentLanguage === 'chinese' ? '❌ 保存失败：' : '❌ Save failed: ';
            this.showSettingsMessage(errorPrefix + error.message, 'error');
            const errorLogMsg = this.currentLanguage === 'chinese' ? `❌ 设置保存失败：${error.message}` : `❌ Failed to save settings: ${error.message}`;
            this.log(errorLogMsg, 'error');
            console.error('Settings save error:', error);
        }
    }

    startLearningStyleVoiceInput(voiceBtn, clearVoiceBtn, voiceStatus) {
        /**
         * Start voice recording for learning style description
         * Uses Web Speech API to capture user's learning preferences
         */
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        const lang = this.currentLanguage === 'chinese' ? 'zh-CN' : 'en-US';
        recognition.lang = lang;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        // Visual feedback - show recording state
        voiceBtn.style.backgroundColor = '#f44336';
        voiceBtn.textContent = this.currentLanguage === 'chinese' ? '🎤 正在录音...' : '🎤 Recording...';
        voiceBtn.disabled = true;

        // Update status
        voiceStatus.textContent = this.currentLanguage === 'chinese' ? '正在听取...' : 'Listening...';
        voiceStatus.style.color = '#4CAF50';

        recognition.onstart = () => {
            console.log('Voice recording started');
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            if (transcript.trim()) {
                // Add voice input to existing text in textarea
                const textarea = document.getElementById('settings-learning-style-description');
                if (textarea) {
                    if (textarea.value.trim()) {
                        textarea.value += '\n' + transcript;
                    } else {
                        textarea.value = transcript;
                    }

                    // Show feedback
                    voiceStatus.textContent = this.currentLanguage === 'chinese'
                        ? `✅ 已录入 (${transcript.length} 字符)`
                        : `✅ Recorded (${transcript.length} chars)`;
                    voiceStatus.style.color = '#4CAF50';

                    // Show clear button
                    clearVoiceBtn.style.display = 'inline-block';
                }
            } else {
                voiceStatus.textContent = this.currentLanguage === 'chinese' ? '未检测到语音' : 'No speech detected';
                voiceStatus.style.color = '#f44336';
            }
        };

        recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            const errorMsg = this.currentLanguage === 'chinese'
                ? `❌ 错误: ${event.error}`
                : `❌ Error: ${event.error}`;
            voiceStatus.textContent = errorMsg;
            voiceStatus.style.color = '#f44336';
        };

        recognition.onend = () => {
            // Reset button state
            voiceBtn.style.backgroundColor = '#4CAF50';
            voiceBtn.textContent = this.currentLanguage === 'chinese' ? '🎤 语音输入' : '🎤 Voice Input';
            voiceBtn.disabled = false;
            console.log('Voice recording ended');
        };

        recognition.start();
    }

    clearLearningStyleVoiceInput(voiceBtn, clearVoiceBtn, voiceStatus) {
        /**
         * Clear the voice-recorded learning style
         */
        const textarea = document.getElementById('settings-learning-style-description');
        if (textarea) {
            textarea.value = '';
        }

        // Reset UI
        clearVoiceBtn.style.display = 'none';
        voiceStatus.textContent = this.currentLanguage === 'chinese' ? '未录制' : 'Not recorded';
        voiceStatus.style.color = '#666';
    }

    resetSettings() {
        const confirmMsg = this.currentLanguage === 'chinese'
            ? '确定要重置所有设置为默认值吗？'
            : 'Are you sure you want to reset all settings to defaults?';
        if (confirm(confirmMsg)) {
            this.settings = { ...defaultSettings };
            const key = this.getSettingsStorageKey();
            localStorage.removeItem(key);

            // Also reset in the master user database if logged in
            if (this.currentUser) {
                const allUsers = JSON.parse(localStorage.getItem('futuretech-users') || '{}');
                if (allUsers[this.currentUser.username]) {
                    allUsers[this.currentUser.username].settings = { ...defaultSettings };
                    localStorage.setItem('futuretech-users', JSON.stringify(allUsers));
                }
                // Update current user session
                this.currentUser.settings = { ...defaultSettings };
                localStorage.setItem('futuretech-user', JSON.stringify(this.currentUser));
            }

            this.applySettings();

            // Update highlight status for all select elements after reset
            const languageSelect = document.getElementById('settings-language');
            const gradeSelect = document.getElementById('settings-grade');
            const examSelect = document.getElementById('settings-exam-type');
            const difficultySelect = document.getElementById('settings-difficulty');
            if (languageSelect) this.updateSelectHighlight(languageSelect);
            if (gradeSelect) this.updateSelectHighlight(gradeSelect);
            if (examSelect) this.updateSelectHighlight(examSelect);
            if (difficultySelect) this.updateSelectHighlight(difficultySelect);

            const resetMsg = this.currentLanguage === 'chinese' ? '🔄 设置已重置为默认值' : '🔄 Settings reset to defaults';
            this.showSettingsMessage(resetMsg, 'success');
            this.log(this.currentLanguage === 'chinese' ? '🔄 用户设置已重置' : '🔄 Settings reset', 'info');
        }
    }

    updateSelectHighlight(selectElement) {
        if (!selectElement) return;
        // Apply consistent light blue styling to all select elements
        selectElement.style.backgroundColor = '#F0F8FF';
        selectElement.style.borderColor = '#D1E7F1';
        selectElement.style.borderWidth = '1px';
    }

    applySelectStyles() {
        // Apply light blue styling to all select elements on the page
        const allSelects = document.querySelectorAll('select');
        allSelects.forEach(selectElement => {
            selectElement.style.backgroundColor = '#F0F8FF';
            selectElement.style.borderColor = '#D1E7F1';
            selectElement.style.borderWidth = '1px';
        });
    }

    exportSettings() {
        try {
            const dataStr = JSON.stringify(this.settings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `futuretech-settings-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            URL.revokeObjectURL(url);
            const exportMsg = this.currentLanguage === 'chinese' ? '📥 设置已导出' : '📥 Settings exported';
            this.showSettingsMessage(exportMsg, 'success');
            const exportLogMsg = this.currentLanguage === 'chinese' ? '📥 设置已导出为JSON文件' : '📥 Settings exported as JSON file';
            this.log(exportLogMsg, 'success');
        } catch (error) {
            const exportErrorPrefix = this.currentLanguage === 'chinese' ? '❌ 导出失败：' : '❌ Export failed: ';
            this.showSettingsMessage(exportErrorPrefix + error.message, 'error');
            const exportErrorLog = this.currentLanguage === 'chinese' ? `❌ 设置导出失败：${error.message}` : `❌ Failed to export settings: ${error.message}`;
            this.log(exportErrorLog, 'error');
        }
    }

    /**
     * Apply font size preference
     */
    applyFontSize(fontSize) {
        const scale = fontSize / 100;

        // Apply zoom to entire page - most reliable cross-browser approach
        document.documentElement.style.zoom = scale.toString();

        // Store in localStorage for persistence
        localStorage.setItem('futuretech-font-size', fontSize);
    }

    /**
     * Apply dyslexia-friendly font
     */
    applyDyslexiaFont(enabled) {
        if (enabled) {
            // OpenDyslexic font fallback to sans-serif
            document.body.style.fontFamily = '"OpenDyslexic", "Verdana", "Arial", sans-serif';
            // Slightly increase letter spacing for better readability
            document.body.style.letterSpacing = '0.05em';
        } else {
            document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
            document.body.style.letterSpacing = 'normal';
        }
        localStorage.setItem('futuretech-dyslexia-font', enabled);
    }

    /**
     * Apply high contrast mode
     */
    applyHighContrast(enabled) {
        if (enabled) {
            document.body.classList.add('high-contrast-mode');
            // Store in localStorage
            localStorage.setItem('futuretech-high-contrast', 'true');
        } else {
            document.body.classList.remove('high-contrast-mode');
            localStorage.setItem('futuretech-high-contrast', 'false');
        }
    }

    /**
     * Apply line spacing preference
     */
    applyLineSpacing(spacing) {
        let lineHeightValue;
        switch(spacing) {
            case 'compact':
                lineHeightValue = '1.3';
                break;
            case 'relaxed':
                lineHeightValue = '1.8';
                break;
            case 'normal':
            default:
                lineHeightValue = '1.5';
        }
        document.body.style.lineHeight = lineHeightValue;
        localStorage.setItem('futuretech-line-spacing', spacing);
    }

    /**
     * Apply theme preference
     */
    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
        } else if (theme === 'light') {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
        } else if (theme === 'auto') {
            // Auto theme based on system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
            } else {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
            }
        }
        localStorage.setItem('futuretech-theme', theme);
    }

    showSettingsMessage(message, type) {
        // Try to find the appropriate message div based on the currently active page
        let messageDiv = document.getElementById('settings-message');
        if (!messageDiv) {
            messageDiv = document.getElementById('user-settings-message');
        }
        if (!messageDiv) {
            messageDiv = document.getElementById('profile-message');
        }

        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `settings-message ${type}`;
            messageDiv.style.display = 'block';
            // Scroll to make the message visible
            try {
                messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (e) {
                // Fallback if scrollIntoView fails
                messageDiv.focus();
            }
            // Auto-hide after 4 seconds
            setTimeout(() => {
                messageDiv.className = 'settings-message';
                messageDiv.style.display = 'none';
            }, 4000);
        }

        // Always create a floating toast notification for better visibility
        this.showToast(message, type === 'success' ? 'success' : 'error');
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#e2e3e5';
        const borderColor = type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#d6d8db';
        const textColor = type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#383d41';

        toast.style.cssText = `
            background-color: ${bgColor};
            color: ${textColor};
            border: 2px solid ${borderColor};
            border-radius: 6px;
            padding: 15px 20px;
            min-width: 280px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            font-weight: 600;
            font-size: 14px;
            opacity: 0;
            transform: translateX(400px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: auto;
        `;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        // Trigger animation with animation frame to ensure it's rendered first
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        // Auto-remove toast after 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => {
                toast.remove();
                if (toastContainer && toastContainer.children.length === 0) {
                    toastContainer.remove();
                    // Remove from DOM
                    if (document.body.contains(toastContainer)) {
                        document.body.removeChild(toastContainer);
                    }
                }
            }, 300);
        }, 4000);
    }

    getSettingsContext() {
        // Generate a context string for AI based on user settings
        const gradeMap = {
            'primary-1': '小学一年级', 'primary-2': '小学二年级', 'primary-3': '小学三年级',
            'primary-4': '小学四年级', 'primary-5': '小学五年级', 'primary-6': '小学六年级',
            'junior-1': '初中一年级', 'junior-2': '初中二年级', 'junior-3': '初中三年级',
            'senior-1': '高中一年级', 'senior-2': '高中二年级', 'senior-3': '高中三年级',
            'university-1': '大学一年级', 'university-2': '大学二年级',
            'university-3': '大学三年级', 'university-4': '大学四年级'
        };

        let context = `用户配置信息：`;
        if (this.settings.grade) {
            context += `\n- 学年：${gradeMap[this.settings.grade] || this.settings.grade}`;
        }
        if (this.settings.examType) {
            context += `\n- 考试类型：${this.settings.examType}`;
        }
        if (this.settings.subjects && this.settings.subjects.length > 0) {
            context += `\n- 学科：${this.settings.subjects.join('、')}`;
        }
        if (this.settings.learningStyle) {
            const styleMap = { 'detailed': '详细讲解', 'concise': '精简概括', 'interactive': '互动式' };
            context += `\n- 学习风格：${styleMap[this.settings.learningStyle]}`;
        }
        if (this.settings.difficulty) {
            const diffMap = { 'easy': '基础', 'intermediate': '中等', 'hard': '进阶', 'expert': '专家' };
            context += `\n- 难度偏好：${diffMap[this.settings.difficulty]}`;
        }

        return context;
    }

    // ========== Utility Functions ==========

    log(message, type = 'info') {
        // Only log if log container exists (log section was removed from Question Generator)
        if (!this.logContainer) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('p');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${timestamp}] ${message}`;
        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Keep only last 50 log entries
        const logEntries = this.logContainer.querySelectorAll('.log-entry');
        if (logEntries.length > 50) {
            logEntries[0].remove();
        }
    }

    /**
     * Show top notification
     */
    showTopNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 16px 24px;
            border-radius: 6px;
            font-weight: 500;
            z-index: 2000;
            animation: slideDown 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;

        if (type === 'success') {
            notification.style.backgroundColor = '#4caf50';
            notification.style.color = 'white';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#f44336';
            notification.style.color = 'white';
        } else {
            notification.style.backgroundColor = '#1976d2';
            notification.style.color = 'white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    /**
     * Show page notification and update badge
     */
    showPageNotification(pageName, message) {
        // Show green notification
        this.showTopNotification(message, 'success');

        // Update badge if user is not on this page
        if (this.currentPage !== pageName) {
            this.updateNotificationBadge(pageName);
        }
    }

    /**
     * Update notification badge on nav item
     */
    updateNotificationBadge(pageName) {
        const badge = document.querySelector(`[data-page="${pageName}"].nav-badge`);
        if (!badge) {
            // Find the nav item and its badge
            const navItem = document.querySelector(`[data-page="${pageName}"]`);
            if (navItem) {
                const badgeEl = navItem.querySelector('.nav-badge');
                if (badgeEl) {
                    // Get current count or start with 1
                    const currentCount = parseInt(badgeEl.textContent) || 0;
                    const newCount = currentCount + 1;
                    badgeEl.textContent = newCount;
                    badgeEl.style.display = 'flex';

                    // Store in data attribute to track count
                    if (!navItem.dataset.notificationCount) {
                        navItem.dataset.notificationCount = 1;
                    } else {
                        navItem.dataset.notificationCount = parseInt(navItem.dataset.notificationCount) + 1;
                    }
                }
            }
        }
    }

    /**
     * Clear notification badge when visiting page
     */
    clearNotificationBadge(pageName) {
        const navItem = document.querySelector(`[data-page="${pageName}"]`);
        if (navItem) {
            const badgeEl = navItem.querySelector('.nav-badge');
            if (badgeEl) {
                badgeEl.style.display = 'none';
                badgeEl.textContent = '';
            }
            navItem.dataset.notificationCount = 0;
        }
    }

    /**
     * Show help modal for current page
     */
    showHelpModal() {
        const helpGuides = {
            'question-generator': {
                title: this.currentLanguage === 'chinese' ? '智能出题器 - 使用说明' : 'Question Generator - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>快速生成符合学习要求的题目和详细解析。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>选择年级/水平和学科</li>
                        <li>选择难度级别和题型</li>
                        <li>输入题目要求（可选）</li>
                        <li>点击"生成题目"，AI将自动生成题目和解析</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Quickly generate customized questions with detailed explanations.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>Select grade/level and subject</li>
                        <li>Choose difficulty level and question type</li>
                        <li>Enter specific requirements (optional)</li>
                        <li>Click "Generate" to create questions and solutions</li>
                    </ol>`
            },
            'answer-checker': {
                title: this.currentLanguage === 'chinese' ? '智能批答案 - 使用说明' : 'Answer Checker - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>上传或输入答案，AI自动评阅并给出详细反馈。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>选择学科和年级</li>
                        <li>上传题目图片或输入题目文本</li>
                        <li>输入你的答案</li>
                        <li>点击"检查答案"，获得评阅结果和改进建议</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Upload or enter answers, AI grades them with detailed feedback.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>Select subject and grade level</li>
                        <li>Upload question image or enter text</li>
                        <li>Enter your answer</li>
                        <li>Click "Check" to get grading and suggestions</li>
                    </ol>`
            },
            'learning-plan': {
                title: this.currentLanguage === 'chinese' ? '学习规划 - 使用说明' : 'Learning Plan - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>制定个性化学习计划，获得思维导图和学习路线。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>输入学习目标和时间框架</li>
                        <li>选择你的学习风格和难度</li>
                        <li>AI生成个性化学习计划</li>
                        <li>查看思维导图，按计划学习</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Create personalized learning plans with mind maps and roadmaps.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>Enter learning goal and timeframe</li>
                        <li>Choose your learning style and difficulty</li>
                        <li>AI generates a personalized plan</li>
                        <li>View mind map and follow the roadmap</li>
                    </ol>`
            },
            'ai-chat': {
                title: this.currentLanguage === 'chinese' ? 'AI学习互动 - 使用说明' : 'AI Chat - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>与AI进行自由讨论，解答学习疑惑，获得学习建议。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>选择快速模板或自由输入问题</li>
                        <li>支持语音输入，点击麦克风按钮</li>
                        <li>AI会详细回答并朗读内容</li>
                        <li>保存对话以备后用</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Chat freely with AI to clarify doubts and get learning advice.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>Choose a template or ask freely</li>
                        <li>Support voice input via microphone button</li>
                        <li>AI answers in detail and reads aloud</li>
                        <li>Save conversations for later</li>
                    </ol>`
            },
            'plan-manager': {
                title: this.currentLanguage === 'chinese' ? '学习计划 - 使用说明' : 'Study Plans - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>创建学习计划，设置定时提醒和倒计时。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>点击"新建"创建计划，设置名称和目标</li>
                        <li>选择每日或周计划，设置时间</li>
                        <li>开始学习时点击"开始学习"启动倒计时</li>
                        <li>可在其他页面继续学习，计时在后台运行</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Create study plans with timed reminders and countdowns.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>Click "New" to create a plan with name and goals</li>
                        <li>Choose daily or weekly schedule and set time</li>
                        <li>Click "Start" to launch countdown timer</li>
                        <li>Continue studying on other pages, timer runs in background</li>
                    </ol>`
            },
            'progress': {
                title: this.currentLanguage === 'chinese' ? '学习进度 - 使用说明' : 'Progress - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>追踪学习进度，查看覆盖科目和学习统计。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>页面自动统计你的所有学习活动</li>
                        <li>左侧显示按科目分类的学习进度卡</li>
                        <li>右侧AI分析提供个性化建议</li>
                        <li>点击"生成AI分析"查看详细报告</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Track progress, see covered topics and learning statistics.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>Page auto-tracks all your learning activities</li>
                        <li>Left side shows progress cards by subject</li>
                        <li>Right side provides AI analysis and suggestions</li>
                        <li>Click "Generate Analysis" for detailed reports</li>
                    </ol>`
            },
            'history': {
                title: this.currentLanguage === 'chinese' ? '历史记录 - 使用说明' : 'History - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>保存和查看所有学习内容。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>生成题目或对话后，点击"保存"按钮</li>
                        <li>所有保存的内容都显示在此页面</li>
                        <li>点击查看详情，可再次使用</li>
                        <li>点击"清空所有"删除历史记录</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Save and view all learning content.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>After generating content, click "Save"</li>
                        <li>All saved items appear on this page</li>
                        <li>Click to view details and reuse</li>
                        <li>Click "Clear All" to delete history</li>
                    </ol>`
            },
            'learning-settings': {
                title: this.currentLanguage === 'chinese' ? '学习设置 - 使用说明' : 'Learning Settings - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>配置个人学习偏好，帮助AI系统更准确地理解您的需求。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>选择当前的教育水平/年级</li>
                        <li>选择主要学科（可多选）</li>
                        <li>选择学习风格：详细讲解、精简概括或互动式</li>
                        <li>设置题目难度偏好</li>
                        <li>勾选是否包含解答和深度分析</li>
                        <li>点击"保存设置"，设置自动应用到所有功能</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Configure your learning preferences to help AI understand your needs better.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>Select your current grade/education level</li>
                        <li>Choose main subjects (multiple selection)</li>
                        <li>Select learning style: detailed, concise, or interactive</li>
                        <li>Set difficulty preference</li>
                        <li>Toggle whether to include solutions and deep analysis</li>
                        <li>Click "Save" to apply settings everywhere</li>
                    </ol>`
            },
            'user-settings': {
                title: this.currentLanguage === 'chinese' ? '用户设置 - 使用说明' : 'User Settings - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>自定义用户界面和显示选项，改善学习体验。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li><strong>语言设置</strong>：选择使用的语言，支持8种语言和自定义语言</li>
                        <li><strong>字体大小</strong>：通过滑块调整页面字体大小（80%-150%）</li>
                        <li><strong>易读字体</strong>：启用OpenDyslexic字体，适合阅读困难用户</li>
                        <li><strong>高对比度模式</strong>：增加文字和背景的对比度，改善可读性</li>
                        <li><strong>行间距</strong>：选择紧凑、标准或宽松的行距</li>
                        <li><strong>主题</strong>：选择浅色、深色或自动模式</li>
                        <li>所有界面设置自动保存并立即应用</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Customize user interface and display options for better learning experience.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li><strong>Language</strong>: Choose your language (8 languages + custom)</li>
                        <li><strong>Font Size</strong>: Adjust page font size (80%-150%)</li>
                        <li><strong>Dyslexia-Friendly Font</strong>: Enable OpenDyslexic font for readability</li>
                        <li><strong>High Contrast Mode</strong>: Increase contrast for better readability</li>
                        <li><strong>Line Spacing</strong>: Choose compact, normal, or relaxed spacing</li>
                        <li><strong>Theme</strong>: Select light, dark, or auto mode</li>
                        <li>All settings auto-save and apply instantly</li>
                    </ol>`
            },
            'learning-profiles': {
                title: this.currentLanguage === 'chinese' ? '我的学习配置 - 使用说明' : 'My Learning Profiles - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>创建和管理多个学习配置，为不同科目设置个性化要求。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li><strong>创建配置</strong>：点击"新建配置"，输入配置名称</li>
                        <li><strong>设置学习参数</strong>：选择年级、科目、学习风格和难度</li>
                        <li><strong>详细学习要求</strong>：输入自定义要求（如"用简洁语言"、"包含更多例子"）</li>
                        <li><strong>语音要求（可选）</strong>：点击"开始录音"添加语音说明</li>
                        <li><strong>激活配置</strong>：点击"使用"按钮激活该配置</li>
                        <li>当前激活的配置会自动应用于题目生成、批改和AI交互</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Create and manage multiple learning profiles with personalized requirements.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li><strong>Create Profile</strong>: Click "New Profile" and enter a name</li>
                        <li><strong>Set Parameters</strong>: Choose grade, subjects, learning style, and difficulty</li>
                        <li><strong>Custom Requirements</strong>: Enter specific needs (e.g. "use simple language", "more examples")</li>
                        <li><strong>Voice Requirements (optional)</strong>: Click "Start Recording" to add voice notes</li>
                        <li><strong>Activate Profile</strong>: Click "Use" button to activate a profile</li>
                        <li>Active profile automatically applies to all question generation and AI interactions</li>
                    </ol>`
            },
            'settings': {
                title: this.currentLanguage === 'chinese' ? '设置 - 使用说明' : 'Settings - How to Use',
                content: this.currentLanguage === 'chinese' ?
                    `<h3>功能介绍</h3>
                    <p>配置个人学习偏好和界面设置。</p>
                    <h3>使用步骤</h3>
                    <ol>
                        <li>选择语言和年级水平</li>
                        <li>选择你的主学科和学习风格</li>
                        <li>设置难度和内容偏好</li>
                        <li>所有设置自动保存，应用到全部页面</li>
                    </ol>` :
                    `<h3>Function</h3>
                    <p>Configure learning preferences and interface settings.</p>
                    <h3>How to Use</h3>
                    <ol>
                        <li>Choose language and grade level</li>
                        <li>Select your main subjects and learning style</li>
                        <li>Set difficulty and content preferences</li>
                        <li>Settings auto-save and apply everywhere</li>
                    </ol>`
            }
        };

        const currentPageHelp = helpGuides[this.currentPage] || {
            title: this.currentLanguage === 'chinese' ? '使用说明' : 'Help',
            content: this.currentLanguage === 'chinese' ? '<p>暂无说明</p>' : '<p>No help available</p>'
        };

        const modalTitle = document.getElementById('help-modal-title');
        const modalContent = document.getElementById('help-modal-content');
        const overlay = document.getElementById('help-modal-overlay');

        if (modalTitle) modalTitle.textContent = currentPageHelp.title;
        if (modalContent) modalContent.innerHTML = currentPageHelp.content;
        if (overlay) overlay.style.display = 'flex';
    }

    /**
     * Close help modal
     */
    closeHelpModal() {
        const overlay = document.getElementById('help-modal-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // ========== Learning Profiles Functions ==========

    loadLearningProfiles() {
        try {
            const key = `futuretech-profiles-${this.currentUser ? this.currentUser.username : 'guest'}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                this.learningProfiles = JSON.parse(stored);
            } else {
                this.learningProfiles = [...defaultSettings.learningProfiles];
            }
            this.activeProfileId = localStorage.getItem(key + '-active') || 1;
            this.displayProfilesList();
        } catch (error) {
            console.error('Error loading profiles:', error);
            this.learningProfiles = [...defaultSettings.learningProfiles];
        }
    }

    saveProfilesToDisk() {
        try {
            const key = `futuretech-profiles-${this.currentUser ? this.currentUser.username : 'guest'}`;
            localStorage.setItem(key, JSON.stringify(this.learningProfiles));
            localStorage.setItem(key + '-active', this.activeProfileId);
        } catch (error) {
            console.error('Error saving profiles:', error);
        }
    }

    getActiveProfile() {
        return this.learningProfiles.find(p => p.id === parseInt(this.activeProfileId)) || this.learningProfiles[0];
    }

    displayProfilesList() {
        const listContainer = document.getElementById('profiles-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        this.learningProfiles.forEach((profile, index) => {
            const profileCard = document.createElement('div');
            profileCard.className = 'profile-card';
            profileCard.style.cssText = `
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const isActive = parseInt(this.activeProfileId) === profile.id;
            const nameEl = document.createElement('div');
            nameEl.style.cssText = `flex: 1; font-weight: ${isActive ? '700' : '500'}; color: ${isActive ? '#007bff' : '#212529'};`;
            nameEl.innerHTML = `${profile.name}${isActive ? ' ⭐' : ''}`;

            const detailEl = document.createElement('div');
            detailEl.style.cssText = 'flex: 1; font-size: 0.85rem; color: #6c757d; margin-left: 15px;';
            detailEl.textContent = `年级: ${profile.grade || '-'} | 科目: ${profile.subjects.length > 0 ? profile.subjects.join(',') : '-'}`;

            const buttonsEl = document.createElement('div');
            buttonsEl.style.cssText = 'display: flex; gap: 8px;';

            const editBtn = document.createElement('button');
            editBtn.textContent = '✏️ 编辑';
            editBtn.className = 'btn btn-small';
            editBtn.onclick = () => this.editProfile(profile.id);

            const copyBtn = document.createElement('button');
            copyBtn.textContent = '📋 复制';
            copyBtn.className = 'btn btn-small';
            copyBtn.onclick = () => this.copyProfile(profile.id);

            const useBtn = document.createElement('button');
            useBtn.textContent = isActive ? '✓ 使用中' : '使用';
            useBtn.className = 'btn btn-small';
            useBtn.style.backgroundColor = isActive ? '#28a745' : '';
            useBtn.style.color = isActive ? 'white' : '';
            useBtn.disabled = isActive;
            useBtn.onclick = () => this.switchProfile(profile.id);

            buttonsEl.appendChild(editBtn);
            buttonsEl.appendChild(copyBtn);
            buttonsEl.appendChild(useBtn);

            profileCard.appendChild(nameEl);
            profileCard.appendChild(detailEl);
            profileCard.appendChild(buttonsEl);
            listContainer.appendChild(profileCard);
        });
    }

    createNewProfile() {
        this.currentEditingProfileId = null;
        const newId = Math.max(...this.learningProfiles.map(p => p.id), 0) + 1;

        document.getElementById('profile-name').value = '';
        document.getElementById('profile-grade').value = '';
        document.getElementById('profile-difficulty').value = 'intermediate';
        document.getElementById('profile-include-solutions').checked = true;
        document.getElementById('profile-include-analysis').checked = true;
        document.getElementById('profile-requirements').value = '';
        document.querySelectorAll('input[name="profile-subject"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('input[name="profile-style"]').forEach(cb => cb.checked = false);
        document.querySelector('input[name="profile-style"][value="detailed"]').checked = true;

        document.getElementById('profile-edit-subtitle').textContent = '新建配置';
        document.getElementById('profile-delete-btn').style.display = 'none';
        document.getElementById('profile-edit-panel').style.display = 'block';
        document.querySelector('#profiles-list').parentElement.scrollIntoView();
    }

    editProfile(profileId) {
        const profile = this.learningProfiles.find(p => p.id === profileId);
        if (!profile) return;

        this.currentEditingProfileId = profileId;
        document.getElementById('profile-name').value = profile.name;
        document.getElementById('profile-grade').value = profile.grade || '';
        document.getElementById('profile-difficulty').value = profile.difficulty || 'intermediate';
        document.getElementById('profile-include-solutions').checked = profile.includeSolutions !== false;
        document.getElementById('profile-include-analysis').checked = profile.includeAnalysis !== false;
        document.getElementById('profile-requirements').value = profile.customRequirements || '';

        document.querySelectorAll('input[name="profile-subject"]').forEach(cb => {
            cb.checked = profile.subjects && profile.subjects.includes(cb.value);
        });
        document.querySelectorAll('input[name="profile-style"]').forEach(cb => {
            cb.checked = cb.value === (profile.learningStyle || 'detailed');
        });

        document.getElementById('profile-edit-subtitle').textContent = `编辑: ${profile.name}`;
        document.getElementById('profile-delete-btn').style.display = 'block';
        document.getElementById('profile-edit-panel').style.display = 'block';
        window.scrollTo(0, 0);
    }

    copyProfile(profileId) {
        const profile = this.learningProfiles.find(p => p.id === profileId);
        if (!profile) return;

        const newProfile = {
            ...profile,
            id: Math.max(...this.learningProfiles.map(p => p.id), 0) + 1,
            name: `${profile.name} (复制)`
        };
        this.learningProfiles.push(newProfile);
        this.saveProfilesToDisk();
        this.displayProfilesList();
        this.log(`✅ 已复制配置: ${newProfile.name}`, 'success');
    }

    switchProfile(profileId) {
        this.activeProfileId = profileId;
        this.saveProfilesToDisk();
        this.displayProfilesList();
        const profile = this.learningProfiles.find(p => p.id === profileId);
        this.log(`✅ 已切换到配置: ${profile.name}`, 'success');
    }

    saveProfile() {
        const name = document.getElementById('profile-name').value.trim();
        if (!name) {
            alert('请输入配置名称');
            return;
        }

        const selectedSubjects = Array.from(document.querySelectorAll('input[name="profile-subject"]:checked')).map(cb => cb.value);
        const selectedStyle = document.querySelector('input[name="profile-style"]:checked')?.value || 'detailed';

        const profileData = {
            name,
            grade: document.getElementById('profile-grade').value || '',
            subjects: selectedSubjects,
            learningStyle: selectedStyle,
            difficulty: document.getElementById('profile-difficulty').value,
            includeSolutions: document.getElementById('profile-include-solutions').checked,
            includeAnalysis: document.getElementById('profile-include-analysis').checked,
            customRequirements: document.getElementById('profile-requirements').value || '',
            voiceRequirementsBlob: null
        };

        if (this.currentEditingProfileId) {
            const index = this.learningProfiles.findIndex(p => p.id === this.currentEditingProfileId);
            if (index !== -1) {
                this.learningProfiles[index] = {
                    ...this.learningProfiles[index],
                    ...profileData
                };
            }
        } else {
            const newId = Math.max(...this.learningProfiles.map(p => p.id), 0) + 1;
            this.learningProfiles.push({
                id: newId,
                ...profileData
            });
        }

        this.saveProfilesToDisk();
        this.displayProfilesList();
        this.cancelProfileEdit();
        this.log('✅ 配置已保存', 'success');
    }

    cancelProfileEdit() {
        document.getElementById('profile-edit-panel').style.display = 'none';
        this.currentEditingProfileId = null;
    }

    deleteProfile() {
        if (!confirm('确定要删除这个配置吗？')) return;

        this.learningProfiles = this.learningProfiles.filter(p => p.id !== this.currentEditingProfileId);
        this.saveProfilesToDisk();
        this.displayProfilesList();
        this.cancelProfileEdit();
        this.log('✅ 配置已删除', 'success');
    }

    toggleProfileVoiceRecording() {
        if (this.profileVoiceRecording) {
            this.stopProfileVoiceRecording();
        } else {
            this.startProfileVoiceRecording();
        }
    }

    async startProfileVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.profileMediaRecorder = new MediaRecorder(stream);
            this.profileAudioChunks = [];

            this.profileMediaRecorder.ondataavailable = (e) => {
                this.profileAudioChunks.push(e.data);
            };

            this.profileMediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.profileAudioChunks, { type: 'audio/wav' });
                localStorage.setItem('profile-voice-temp', URL.createObjectURL(audioBlob));
                document.getElementById('profile-voice-status').textContent = '✓ 已录音';
                document.getElementById('profile-play-btn').style.display = 'block';
            };

            this.profileMediaRecorder.start();
            this.profileVoiceRecording = true;
            document.getElementById('profile-record-btn').textContent = '⏹️ 停止录音';
        } catch (error) {
            this.log('❌ 无法访问麦克风', 'error');
        }
    }

    stopProfileVoiceRecording() {
        if (this.profileMediaRecorder && this.profileVoiceRecording) {
            this.profileMediaRecorder.stop();
            this.profileMediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.profileVoiceRecording = false;
            document.getElementById('profile-record-btn').textContent = '🎤 重新录制';
        }
    }

    playProfileVoice() {
        const audioUrl = localStorage.getItem('profile-voice-temp');
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== History & Save Functions ==========

    saveContent(type, content) {
        try {
            if (!content || !content.answer) {
                this.log(t('history.save-error', this.currentLanguage), 'error');
                return;
            }

            // For question-generator, combine questions and answers
            // Exclude the prompt itself (content.question) which contains all format requirements
            let fullAnswer = content.answer || '';
            if (type === 'question-generator' && content.answers) {
                // Add answers section below questions with separator
                fullAnswer = (content.answer || '') + '\n\n===== 答案和解析 =====\n\n' + (content.answers || '');
            }

            const historyItem = {
                id: Date.now(),
                type: type,
                // For question-generator: don't save the full prompt, just metadata
                // For others: save the question if available
                question: type === 'question-generator'
                    ? `${content.grade || ''} ${content.subject || ''} ${content.difficulty || ''} ${content.questionType || ''} (${content.quantity || 0}道)`.trim()
                    : (content.question || ''),
                answer: fullAnswer,
                timestamp: new Date().toISOString(),
                createdTime: new Date().toLocaleString(this.currentLanguage === 'chinese' ? 'zh-CN' : 'en-US')
            };

            this.savedHistory.push(historyItem);
            localStorage.setItem('futuretech-history', JSON.stringify(this.savedHistory));

            this.log(t('history.save-success', this.currentLanguage), 'success');
            this.showPageNotification('history', this.currentLanguage === 'chinese' ? '✅ 内容已保存到历史记录' : '✅ Saved to history');
            this.updateHistoryDisplay();
        } catch (error) {
            this.log(`${t('history.save-error', this.currentLanguage)}: ${error.message}`, 'error');
        }
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('futuretech-history');
            this.savedHistory = saved ? JSON.parse(saved) : [];
            this.updateHistoryDisplay();
        } catch (error) {
            console.log('Failed to load history:', error);
            this.savedHistory = [];
        }
    }

    updateHistoryDisplay() {
        if (!this.historyList) return;

        if (this.savedHistory.length === 0) {
            this.historyList.innerHTML = `<p class="history-empty-message">${t('history.empty', this.currentLanguage)}</p>`;
            return;
        }

        let html = '';
        for (let i = this.savedHistory.length - 1; i >= 0; i--) {
            const item = this.savedHistory[i];
            const typeLabel = (typeof t === 'function' ? t(`nav.${item.type}`, this.currentLanguage) : null) || item.type;
            const contentPreview = item.answer.substring(0, 200) + (item.answer.length > 200 ? '...' : '');

            html += `
                <div class="history-item">
                    <div class="history-item-header">
                        <span class="history-item-type">${typeLabel}</span>
                        <span class="history-item-time">${item.createdTime}</span>
                    </div>
                    ${item.question ? `<div style="color: var(--text-secondary); margin-bottom: 8px; font-size: 0.9rem;"><strong>Q:</strong> ${this.escapeHtml(item.question.substring(0, 100))}${item.question.length > 100 ? '...' : ''}</div>` : ''}
                    <div class="history-item-content">${this.escapeHtml(contentPreview)}</div>
                    <div class="history-item-actions">
                        <button class="btn btn-small" onclick="app.viewFullHistory(${item.id})">👁️ ${t('btn.save', this.currentLanguage) === '💾 保存' ? '查看全文' : 'View'}</button>
                        <button class="btn btn-small btn-danger" onclick="app.deleteHistoryItem(${item.id})">${t('btn.delete', this.currentLanguage)}</button>
                    </div>
                </div>
            `;
        }
        this.historyList.innerHTML = html;
    }

    deleteHistoryItem(id) {
        if (confirm(t('history.confirm-delete', this.currentLanguage))) {
            this.savedHistory = this.savedHistory.filter(item => item.id !== id);
            localStorage.setItem('futuretech-history', JSON.stringify(this.savedHistory));
            this.updateHistoryDisplay();
            this.log(t('history.delete-success', this.currentLanguage), 'success');
        }
    }

    clearAllHistory() {
        if (confirm(t('history.confirm-clear', this.currentLanguage))) {
            this.savedHistory = [];
            localStorage.removeItem('futuretech-history');
            this.updateHistoryDisplay();
            this.log('✅ ' + t('history.delete-success', this.currentLanguage), 'success');
        }
    }

    viewFullHistory(id) {
        const item = this.savedHistory.find(h => h.id === id);
        if (!item) return;

        // Create modal for viewing full history
        const modal = document.createElement('div');
        modal.id = 'history-detail-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            font-size: 16px;
            line-height: 1.8;
        `;

        // Header with close button
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e0e0e0;
        `;

        const typeLabel = (typeof t === 'function' ? t(`nav.${item.type}`, this.currentLanguage) : null) || item.type;
        const title = document.createElement('div');
        title.innerHTML = `
            <h2 style="margin: 0; font-size: 1.5em; color: #333;">${typeLabel}</h2>
            <p style="margin: 5px 0 0 0; color: #999; font-size: 0.95em;">📅 ${item.createdTime}</p>
        `;
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: #f5f5f5;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            transition: all 0.3s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = '#e0e0e0';
        closeBtn.onmouseout = () => closeBtn.style.background = '#f5f5f5';
        closeBtn.onclick = () => modal.remove();
        header.appendChild(closeBtn);

        container.appendChild(header);

        // Content
        const content = document.createElement('div');

        // Display question if exists
        if (item.question) {
            const questionDiv = document.createElement('div');
            questionDiv.style.cssText = `
                margin-bottom: 30px;
                padding: 20px;
                background: #f9f9f9;
                border-left: 4px solid #003DA5;
                border-radius: 4px;
            `;

            const questionLabel = document.createElement('div');
            questionLabel.style.cssText = `
                font-weight: 600;
                color: #003DA5;
                margin-bottom: 12px;
                font-size: 1.05em;
            `;
            if (item.type === 'answer-checker') {
                questionLabel.textContent = '📋 题目：';
            } else if (item.type === 'question-generator') {
                questionLabel.textContent = '❓ 问题集：';
            } else {
                questionLabel.textContent = '❓ 问题：';
            }

            const questionContent = document.createElement('div');
            questionContent.style.cssText = `
                color: #333;
                font-size: 1.05em;
                line-height: 1.8;
                white-space: pre-wrap;
                word-break: break-word;
            `;
            questionContent.textContent = item.question;

            questionDiv.appendChild(questionLabel);
            questionDiv.appendChild(questionContent);
            content.appendChild(questionDiv);
        }

        // Display answer/response
        const answerDiv = document.createElement('div');
        answerDiv.style.cssText = `
            margin-top: 20px;
        `;

        const answerLabel = document.createElement('div');
        answerLabel.style.cssText = `
            font-weight: 600;
            color: #C41E3A;
            margin-bottom: 12px;
            margin-top: 30px;
            padding-top: 20px;
            padding-bottom: 10px;
            border-top: 2px solid #e0e0e0;
            font-size: 1.05em;
        `;
        answerLabel.textContent = item.type === 'answer-checker' ? '✅ 批改结果：' : (item.type === 'question-generator' ? '📝 答案和解析：' : '💬 回复：');

        const answerContent = document.createElement('div');
        answerContent.style.cssText = `
            color: #333;
            font-size: 1.05em;
            line-height: 1.8;
        `;

        // Format answer content same as question generator (with colors and proper spacing)
        let cleanedContent = this.cleanupComplexLatex(item.answer);

        // For question-generator type, add blank lines between question blocks and sections
        if (item.type === 'question-generator') {
            // Add blank lines between questions: "Question N:" should have blank lines around it
            cleanedContent = cleanedContent.replace(/\n(题目|Question|问题)\s+(\d+)/g, '\n\n$1 $2');
            // Add blank lines before Answer/Answer and Explanation separator
            cleanedContent = cleanedContent.replace(/\n(={5,}[^=]*={5,})/g, '\n\n$1\n\n');
            // Add blank line before Answer labels
            cleanedContent = cleanedContent.replace(/\n(答案|Answer|解析|Analysis)\s+(\d+)/g, '\n\n$1 $2');
        }

        let wrappedContent = this.wrapUnmatchedMath(cleanedContent);
        let formattedContent = this.formatQuestionsWithColors(wrappedContent);

        answerContent.innerHTML = formattedContent;

        // Render LaTeX if needed
        if (window.MathJax) {
            setTimeout(() => {
                window.MathJax.typesetPromise([answerContent]).catch(err => {
                    console.log('MathJax rendering error:', err);
                });
            }, 100);
        }

        answerDiv.appendChild(answerLabel);
        answerDiv.appendChild(answerContent);
        content.appendChild(answerDiv);

        container.appendChild(content);

        // Footer with action buttons
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e0e0e0;
        `;

        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 复制全文';
        copyBtn.className = 'btn btn-small';
        copyBtn.onclick = () => {
            const text = `[${item.createdTime}]\n\n${item.question ? 'Q: ' + item.question + '\n\n' : ''}A: ${item.answer}`;
            navigator.clipboard.writeText(text).then(() => {
                this.log('✅ 已复制到剪贴板', 'success');
            }).catch(() => {
                alert('复制失败，请手动选择复制');
            });
        };

        const closeFooterBtn = document.createElement('button');
        closeFooterBtn.textContent = '关闭';
        closeFooterBtn.className = 'btn btn-small';
        closeFooterBtn.onclick = () => modal.remove();

        footer.appendChild(copyBtn);
        footer.appendChild(closeFooterBtn);
        container.appendChild(footer);

        modal.appendChild(container);
        document.body.appendChild(modal);

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    // ========== Activity Tracking & Progress Functions ==========

    /**
     * Track activity with automatic subject classification
     */
    async trackActivityWithClassification(type, content, metadata = {}) {
        console.log(`[Progress] Tracking activity: ${type}`, { contentLength: content.length, metadata });

        // Extract topics from content before tracking
        const extractedTopics = this.extractTopicsFromContent(content);
        console.log(`[Progress] Extracted topics:`, extractedTopics);

        // Add extracted topics to metadata
        if (extractedTopics.length > 0) {
            metadata.topics = extractedTopics;
        }

        const activity = this.activityTracker.trackActivity(type, content, metadata);
        console.log(`[Progress] Activity saved:`, activity);
        console.log(`[Progress] Current activities count:`, this.activityTracker.getActivities().length);

        // Classify subject asynchronously (don't block UI)
        try {
            const userSubjects = this.settings?.subjects || [];
            console.log(`[Progress] User subjects for classification:`, userSubjects);

            if (userSubjects.length === 0) {
                console.log(`[Progress] No subjects configured, keeping as 'Other'`);
            } else {
                const subject = await this.classifyActivitySubject(content);
                console.log(`[Progress] Classified subject:`, subject);
                this.activityTracker.updateActivitySubject(activity.id, subject);
            }
        } catch (error) {
            console.error('Error classifying activity subject:', error);
            // Keep the default 'Other' classification if classification fails
        }

        return activity;
    }

    /**
     * Extract topics from user input using keyword analysis
     */
    extractTopicsFromContent(content) {
        const topics = new Set();

        // Common topic keywords by domain
        const topicKeywords = {
            // Math topics
            '方程': ['一次方程', '二次方程', '一元二次', '方程组', '线性方程', '求根公式', '韦达定理'],
            '函数': ['二次函数', '一次函数', '正比例', '反比例', '幂函数', '指数函数', '对数函数', '三角函数', '函数图像', '函数性质'],
            '几何': ['平面几何', '立体几何', '圆', '三角形', '四边形', '多边形', '相似', '全等', '面积', '体积', '表面积'],
            '概率': ['概率', '统计', '概率分布', '期望', '方差', '标准差'],
            '导数': ['导数', '微分', '极限', '连续', '可导'],
            '判别式': ['判别式', '根的性质'],
            '不等式': ['不等式', '一元一次不等式', '一元二次不等式', '基本不等式', '均值不等式'],

            // Physics topics
            '力': ['重力', '弹力', '摩擦力', '万有引力', '牛顿定律', '受力分析'],
            '运动': ['匀速运动', '匀加速', '抛体运动', '圆周运动', '运动学'],
            '能量': ['动能', '势能', '机械能', '能量守恒', '功'],
            '电': ['电场', '电势', '电流', '电阻', '欧姆定律', '电磁感应'],
            '光': ['反射', '折射', '光学', '波长', '衍射', '干涉'],
            '波': ['波动', '波的传播', '波长', '频率', '声波', '电磁波'],
            '量子': ['量子', '光子', '波粒二象性', '能级', '光电效应'],

            // Chemistry topics
            '原子': ['原子结构', '电子构型', '元素周期表', '电离能', '电负性'],
            '化学键': ['离子键', '共价键', '金属键', '分子结构'],
            '反应': ['化学反应', '反应速率', '反应方程', '离子方程', '配平'],
            '酸碱': ['酸碱性', 'pH', '中和反应', '电离', '盐析'],
            '有机': ['有机化学', '烃', '烯烃', '炔烃', '芳烃', '官能团', '同分异构体'],

            // Biology topics
            '细胞': ['细胞结构', '细胞膜', '细胞核', '线粒体', '叶绿体', 'DNA', 'RNA'],
            '遗传': ['遗传', '基因', '染色体', '性状', '分离定律', '自由组合定律'],
            '进化': ['进化', '自然选择', '适应', '物种'],
            '生态': ['生态系统', '食物链', '能量流', '物质循环', '种群']
        };

        // Extract topics by matching keywords
        for (const [keyword, topics_list] of Object.entries(topicKeywords)) {
            if (content.includes(keyword)) {
                // Add the main keyword
                topics.add(keyword);
                // Add related topics
                topics_list.forEach(t => {
                    if (content.includes(t)) {
                        topics.add(t);
                    }
                });
            }
        }

        // Also extract specific topic patterns (e.g., "X的Y")
        const topicPattern = /([^，,。\n\s]+)的([^，,。\n\s]+)/g;
        let match;
        while ((match = topicPattern.exec(content)) !== null) {
            const compound = `${match[1]}的${match[2]}`;
            // Only add if it's not too long (likely a real topic)
            if (compound.length <= 20 && compound.length > 2) {
                topics.add(compound);
            }
        }

        // Limit to top 8 topics for display
        return Array.from(topics).slice(0, 8);
    }

    /**
     * Classify activity content to determine subject using ZhipuAI
     */
    async classifyActivitySubject(content) {
        try {
            // If no settings or user, can't classify
            if (!this.settings || !this.settings.subjects) {
                return 'Other';
            }

            const userSubjects = this.settings.subjects;
            if (userSubjects.length === 0) {
                return 'Other';
            }

            // Build prompt for classification
            const subjectsList = userSubjects.join(', ');
            const classificationPrompt = `根据下面的内容，判断它主要涉及以下哪个科目：${subjectsList}。如果不属于任何科目，回答"Other"。只回答科目名称，不要有其他文字。

内容：${content.substring(0, 500)}`; // Limit to first 500 chars for efficiency

            // Call ZhipuAI API
            const response = await fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: classificationPrompt,
                    language: this.currentLanguage
                })
            });

            if (!response.ok) {
                console.warn('Classification API failed, using default');
                return 'Other';
            }

            const data = await response.json();
            let subject = data.content ? data.content.trim() : 'Other';

            // Validate that the subject is in the user's list
            const validSubjects = userSubjects.map(s => s.toLowerCase());
            if (!validSubjects.includes(subject.toLowerCase())) {
                subject = 'Other';
            }

            return subject;
        } catch (error) {
            console.error('Error in classifyActivitySubject:', error);
            return 'Other';
        }
    }

    /**
     * Calculate progress statistics from activities
     */
    calculateProgress() {
        const activities = this.activityTracker.getActivities();
        console.log(`[Progress Calculate] Total activities:`, activities.length);

        const userSubjects = (this.settings && this.settings.subjects) ? this.settings.subjects : [];
        console.log(`[Progress Calculate] User subjects:`, userSubjects);

        // Initialize progress object
        const progress = {
            totalActivities: activities.length,
            bySubject: {},
            byType: {},
            lastActivityTime: null
        };

        // Initialize subject categories
        userSubjects.forEach(subject => {
            progress.bySubject[subject] = {
                subject,
                activities: [],
                count: 0,
                topics: new Set(),
                lastActivity: null
            };
        });

        // Initialize "Other" category
        progress.bySubject['Other'] = {
            subject: 'Other',
            activities: [],
            count: 0,
            topics: new Set(),
            lastActivity: null
        };

        // Group activities by subject and type
        activities.forEach(activity => {
            const subject = activity.classifiedSubject || 'Other';
            const timestamp = new Date(activity.timestamp);

            if (!progress.bySubject[subject]) {
                progress.bySubject[subject] = {
                    subject,
                    activities: [],
                    count: 0,
                    topics: new Set(),
                    lastActivity: null
                };
            }

            progress.bySubject[subject].activities.push(activity);
            progress.bySubject[subject].count++;
            progress.bySubject[subject].lastActivity = timestamp;

            // Update last activity time overall
            if (!progress.lastActivityTime || timestamp > progress.lastActivityTime) {
                progress.lastActivityTime = timestamp;
            }

            // Count by type
            if (!progress.byType[activity.type]) {
                progress.byType[activity.type] = 0;
            }
            progress.byType[activity.type]++;

            // Extract topics from metadata
            if (activity.metadata && activity.metadata.topic) {
                progress.bySubject[subject].topics.add(activity.metadata.topic);
            }
        });

        // Convert Sets to Arrays for serialization
        Object.keys(progress.bySubject).forEach(subject => {
            progress.bySubject[subject].topics = Array.from(progress.bySubject[subject].topics);
        });

        return progress;
    }

    /**
     * ============== PLAN MANAGER FUNCTIONALITY ==============
     */

    /**
     * Initialize plan manager
     */
    initPlanManager() {
        this.plans = [];
        this.currentPlanId = null;
        this.selectedWeekdays = [];
        this.loadPlans();
    }

    /**
     * Load plans from localStorage
     */
    loadPlans() {
        try {
            const stored = localStorage.getItem('futuretech-plans');
            this.plans = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading plans:', error);
            this.plans = [];
        }
    }

    /**
     * Save plans to localStorage
     */
    savePlansToDisk() {
        try {
            localStorage.setItem('futuretech-plans', JSON.stringify(this.plans));
        } catch (error) {
            console.error('Error saving plans:', error);
        }
    }

    /**
     * Display the plan manager page
     */
    displayPlanManager() {
        console.log('[PlanManager] Displaying plan manager page...');
        this.loadPlans();
        this.renderPlansList();
        this.renderWeeklyCalendar();
        this.updatePlanStatistics();
        this.setupPlanFormListeners();
    }

    /**
     * Setup event listeners for plan form
     */
    setupPlanFormListeners() {
        const scheduleTypeSelect = document.getElementById('plan-schedule-type');
        if (scheduleTypeSelect) {
            scheduleTypeSelect.addEventListener('change', () => this.updateScheduleUI());
        }
    }

    /**
     * Open new plan form
     */
    openNewPlanForm() {
        this.currentPlanId = null;
        this.selectedWeekdays = [];
        document.getElementById('plan-form').reset();
        document.getElementById('plan-create-title').textContent =
            t('page.plan-create-title', this.currentLanguage);
        document.getElementById('plan-delete-btn').style.display = 'none';
        document.getElementById('plan-close-form-btn').style.display = 'inline-block';
        document.getElementById('plan-schedule-type').value = 'daily';
        this.updateScheduleUI();

        // Scroll to form
        const createSection = document.querySelector('.plan-create-section');
        if (createSection) {
            createSection.scrollTop = 0;
        }
    }

    /**
     * Close plan form
     */
    closePlanForm() {
        this.currentPlanId = null;
        this.selectedWeekdays = [];
        document.getElementById('plan-form').reset();
        document.getElementById('plan-delete-btn').style.display = 'none';
        document.getElementById('plan-close-form-btn').style.display = 'none';
    }

    /**
     * Update schedule UI based on schedule type
     */
    updateScheduleUI() {
        const scheduleType = document.getElementById('plan-schedule-type').value;
        const dailyGroup = document.getElementById('plan-daily-time-group');
        const weeklyGroup = document.getElementById('plan-weekly-group');

        if (scheduleType === 'daily') {
            dailyGroup.style.display = 'block';
            weeklyGroup.style.display = 'none';
        } else {
            dailyGroup.style.display = 'none';
            weeklyGroup.style.display = 'block';
        }
    }

    /**
     * Toggle weekday selection
     */
    toggleWeekday(dayIndex) {
        const weekdayBtn = document.querySelector(`[data-day="${dayIndex}"]`);
        const index = this.selectedWeekdays.indexOf(dayIndex);

        if (index === -1) {
            this.selectedWeekdays.push(dayIndex);
        } else {
            this.selectedWeekdays.splice(index, 1);
        }

        this.updateWeekdayButtons();
    }

    /**
     * Update visual state of weekday buttons
     */
    updateWeekdayButtons() {
        const buttons = document.querySelectorAll('.weekday-btn');
        buttons.forEach((btn, index) => {
            if (this.selectedWeekdays.includes(index)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    /**
     * Save plan (create or update)
     */
    savePlan() {
        const name = document.getElementById('plan-name').value.trim();
        const description = document.getElementById('plan-description').value.trim();
        const target = parseInt(document.getElementById('plan-target').value) || 5;
        const duration = parseInt(document.getElementById('plan-duration').value) || 30;
        const active = document.getElementById('plan-active').checked;
        const scheduleType = document.getElementById('plan-schedule-type').value;

        if (!name) {
            alert(this.currentLanguage === 'chinese' ? '请输入计划名称' : 'Please enter plan name');
            return;
        }

        let planData = {
            id: this.currentPlanId || Date.now(),
            name,
            description,
            target,
            duration,
            active,
            scheduleType,
            weeklyTarget: 0,
            completedThisWeek: 0,
            createdAt: this.currentPlanId ?
                this.plans.find(p => p.id === this.currentPlanId)?.createdAt : new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        if (scheduleType === 'daily') {
            planData.dailyTime = document.getElementById('plan-daily-time').value;
            planData.weeklyTarget = 7; // Every day
        } else {
            planData.selectedDays = this.selectedWeekdays;
            planData.weeklyTime = document.getElementById('plan-weekly-time').value;
            planData.weeklyTarget = this.selectedWeekdays.length;
        }

        // Update or create plan
        if (this.currentPlanId) {
            const index = this.plans.findIndex(p => p.id === this.currentPlanId);
            if (index !== -1) {
                this.plans[index] = planData;
            }
        } else {
            this.plans.push(planData);
        }

        this.savePlansToDisk();
        this.displayPlanManager();
        this.closePlanForm();

        const message = this.currentLanguage === 'chinese' ? '✅ 计划已保存' : '✅ Plan saved successfully';
        this.showPageNotification('plan-manager', message);
    }

    /**
     * Edit plan
     */
    editPlan(planId) {
        const plan = this.plans.find(p => p.id === planId);
        if (!plan) return;

        this.currentPlanId = planId;
        document.getElementById('plan-name').value = plan.name;
        document.getElementById('plan-description').value = plan.description || '';
        document.getElementById('plan-target').value = plan.target;
        document.getElementById('plan-duration').value = plan.duration;
        document.getElementById('plan-active').checked = plan.active;
        document.getElementById('plan-schedule-type').value = plan.scheduleType;

        if (plan.scheduleType === 'daily') {
            document.getElementById('plan-daily-time').value = plan.dailyTime || '14:00';
        } else {
            this.selectedWeekdays = plan.selectedDays || [];
            document.getElementById('plan-weekly-time').value = plan.weeklyTime || '14:00';
            this.updateWeekdayButtons();
        }

        this.updateScheduleUI();

        const titleEl = document.getElementById('plan-create-title');
        titleEl.textContent = t('page.plan-edit-title', this.currentLanguage);
        document.getElementById('plan-delete-btn').style.display = 'inline-block';
        document.getElementById('plan-close-form-btn').style.display = 'inline-block';

        const createSection = document.querySelector('.plan-create-section');
        if (createSection) {
            createSection.scrollTop = 0;
        }
    }

    /**
     * Delete plan
     */
    deletePlan() {
        if (!this.currentPlanId) return;

        const confirmed = confirm(
            this.currentLanguage === 'chinese' ?
            '确定要删除此计划吗？' : 'Are you sure you want to delete this plan?'
        );

        if (!confirmed) return;

        this.plans = this.plans.filter(p => p.id !== this.currentPlanId);
        this.savePlansToDisk();
        this.displayPlanManager();
        this.closePlanForm();

        const message = this.currentLanguage === 'chinese' ? '计划已删除' : 'Plan deleted successfully';
        this.showTopNotification(message, 'success');
    }

    /**
     * Render plans list
     */
    renderPlansList() {
        const container = document.getElementById('plan-list-container');
        if (!container) return;

        const emptyMsg = document.getElementById('plan-empty-msg');

        if (this.plans.length === 0) {
            container.innerHTML = '';
            if (emptyMsg) emptyMsg.style.display = 'block';
            return;
        }

        if (emptyMsg) emptyMsg.style.display = 'none';

        container.innerHTML = '';

        this.plans.forEach(plan => {
            const planCard = document.createElement('div');
            planCard.className = 'plan-card';

            const weeklyCompleted = plan.completedThisWeek || 0;
            const weeklyTarget = plan.weeklyTarget || 1;
            const progressPercent = Math.min((weeklyCompleted / weeklyTarget) * 100, 100);

            let scheduleInfo = '';
            if (plan.scheduleType === 'daily') {
                scheduleInfo = `📅 每日 ${plan.dailyTime || '14:00'}`;
            } else {
                const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                const selectedDays = (plan.selectedDays || []).map(i => dayNames[i]).join('/');
                scheduleInfo = `📅 ${selectedDays} ${plan.weeklyTime || '14:00'}`;
            }

            if (this.currentLanguage !== 'chinese') {
                const dayNamesEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                if (plan.scheduleType === 'daily') {
                    scheduleInfo = `📅 Daily ${plan.dailyTime || '14:00'}`;
                } else {
                    const selectedDays = (plan.selectedDays || []).map(i => dayNamesEn[i]).join('/');
                    scheduleInfo = `📅 ${selectedDays} ${plan.weeklyTime || '14:00'}`;
                }
            }

            planCard.innerHTML = `
                <div class="plan-card-header">
                    <div class="plan-card-name">${plan.name}</div>
                    <span class="plan-card-status ${plan.active ? 'active' : 'inactive'}">
                        ${plan.active ? (this.currentLanguage === 'chinese' ? '启用' : 'Active') : (this.currentLanguage === 'chinese' ? '暂停' : 'Inactive')}
                    </span>
                </div>
                <div class="plan-card-details">
                    <div class="plan-card-detail-item">⏱️ ${plan.duration} min</div>
                    <div class="plan-card-detail-item">${scheduleInfo}</div>
                </div>
                <div class="plan-card-progress">
                    <div class="plan-card-progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <div style="font-size: 0.8rem; color: #666; margin-bottom: 10px;">
                    ${this.currentLanguage === 'chinese' ? '本周进度：' : 'Weekly progress: '}${weeklyCompleted}/${weeklyTarget}
                </div>
                <div class="plan-card-actions">
                    <button class="btn-edit" onclick="window.app && window.app.editPlan(${plan.id})">
                        ✏️ ${this.currentLanguage === 'chinese' ? '编辑' : 'Edit'}
                    </button>
                    <button class="btn-start" onclick="window.app && window.app.startTimer(${plan.id})">
                        ⏱️ ${this.currentLanguage === 'chinese' ? '开始学习' : 'Start'}
                    </button>
                </div>
            `;

            container.appendChild(planCard);
        });

        // Show speak buttons if there are plans
        if (this.plans.length > 0) {
            const speakPlanListBtn = document.getElementById('speak-plan-list-btn');
            const stopPlanListBtn = document.getElementById('stop-plan-list-btn');
            if (speakPlanListBtn) speakPlanListBtn.style.display = 'inline-block';
            if (stopPlanListBtn) stopPlanListBtn.style.display = 'inline-block';
            // Wrap sentences for highlighting
            this.wrapSentencesInElement(container);
        } else {
            const speakPlanListBtn = document.getElementById('speak-plan-list-btn');
            const stopPlanListBtn = document.getElementById('stop-plan-list-btn');
            if (speakPlanListBtn) speakPlanListBtn.style.display = 'none';
            if (stopPlanListBtn) stopPlanListBtn.style.display = 'none';
        }
    }

    /**
     * Render weekly calendar
     */
    renderWeeklyCalendar() {
        const calendar = document.getElementById('plan-calendar');
        if (!calendar) return;

        const dayNames = this.currentLanguage === 'chinese' ?
            ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] :
            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        // Get current week
        const today = new Date();
        const dayOfWeek = today.getDay() || 7; // Convert Sunday(0) to 7
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1);

        calendar.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';

            // Find plans for this day
            let plansForDay = [];
            this.plans.forEach(plan => {
                if (!plan.active) return;

                let shouldInclude = false;
                if (plan.scheduleType === 'daily') {
                    shouldInclude = true;
                } else {
                    shouldInclude = (plan.selectedDays || []).includes(i);
                }

                if (shouldInclude) {
                    plansForDay.push(plan);
                }
            });

            if (plansForDay.length > 0) {
                dayDiv.classList.add('has-plans');
            }

            let html = `<span class="calendar-day-name">${dayNames[i]}</span>`;
            html += '<div class="calendar-day-plans">';

            plansForDay.forEach(plan => {
                const time = plan.scheduleType === 'daily' ? plan.dailyTime : plan.weeklyTime;
                html += `<div class="calendar-plan-item">${plan.name.substring(0, 8)}</div>`;
            });

            html += '</div>';
            dayDiv.innerHTML = html;
            calendar.appendChild(dayDiv);
        }
    }

    /**
     * Update plan statistics
     */
    updatePlanStatistics() {
        const activePlans = this.plans.filter(p => p.active).length;
        const totalTarget = this.plans.reduce((sum, p) => sum + (p.target || 0), 0);
        const totalCompleted = this.plans.reduce((sum, p) => sum + (p.completedThisWeek || 0), 0);

        const activeCountEl = document.getElementById('stat-active-count');
        const weekTotalEl = document.getElementById('stat-week-total');
        const completedEl = document.getElementById('stat-week-completed-count');

        if (activeCountEl) activeCountEl.textContent = activePlans;
        if (weekTotalEl) weekTotalEl.textContent = totalTarget;
        if (completedEl) completedEl.textContent = totalCompleted;
    }

    /**
     * Start timer for a plan
     */
    startTimer(planId) {
        const plan = this.plans.find(p => p.id === planId);
        if (!plan) return;

        const durationMinutes = plan.duration || 30;
        const durationSeconds = durationMinutes * 60;

        this.timerPlanId = planId;
        this.timerStartTime = Date.now();
        this.timerDuration = durationSeconds;
        this.timerRunning = true;

        this.showTimerOverlay(plan.name, durationMinutes);
        this.updateTimer();
    }

    /**
     * Show timer as floating widget
     */
    showTimerOverlay(planName, durationMinutes) {
        // Create timer widget if it doesn't exist
        let widget = document.getElementById('plan-timer-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'plan-timer-widget';
            widget.className = 'plan-timer-widget';
            widget.innerHTML = `
                <div class="plan-timer-header">
                    <h3 id="plan-timer-plan-name">${planName}</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="plan-timer-minimize-btn" id="plan-timer-minimize-btn" onclick="window.app && window.app.minimizeTimer()" title="Minimize">−</button>
                        <button class="plan-timer-close-btn" id="plan-timer-close-btn" onclick="window.app && window.app.closeTimer()" title="Close">✕</button>
                    </div>
                </div>
                <div class="plan-timer-modal">
                    <div class="plan-timer-display" id="plan-timer-display">00:00:00</div>
                    <div class="plan-timer-progress">
                        <div class="plan-timer-progress-bar" id="plan-timer-bar" style="width: 0%"></div>
                    </div>
                    <div class="plan-timer-controls">
                        <button class="plan-timer-btn-play" id="plan-timer-play" onclick="window.app && window.app.toggleTimer()" style="flex: 1;">⏸️ ${this.currentLanguage === 'chinese' ? '暂停' : 'Pause'}</button>
                        <button class="plan-timer-btn-close" id="plan-timer-end-btn" onclick="window.app && window.app.closeTimer()" style="flex: 1;">✕ ${this.currentLanguage === 'chinese' ? '结束' : 'End'}</button>
                    </div>
                    <div class="plan-timer-info" id="plan-timer-info">预计时长：${durationMinutes} 分钟</div>
                </div>
            `;
            document.body.appendChild(widget);
        }

        widget.classList.add('active');
        widget.classList.remove('minimized');
        document.getElementById('plan-timer-plan-name').textContent = planName;
        document.getElementById('plan-timer-info').textContent =
            `${this.currentLanguage === 'chinese' ? '预计时长：' : 'Expected duration: '}${durationMinutes} ${this.currentLanguage === 'chinese' ? '分钟' : 'minutes'}`;
    }

    /**
     * Minimize timer widget
     */
    minimizeTimer() {
        const widget = document.getElementById('plan-timer-widget');
        if (widget) {
            widget.classList.toggle('minimized');
            const minimizeBtn = document.getElementById('plan-timer-minimize-btn');
            if (minimizeBtn) {
                minimizeBtn.textContent = widget.classList.contains('minimized') ? '+' : '−';
            }
        }
    }

    /**
     * Update timer display
     */
    updateTimer() {
        if (!this.timerRunning) {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            return;
        }

        const now = Date.now();
        const elapsed = Math.floor((now - this.timerStartTime) / 1000);
        const remaining = Math.max(0, this.timerDuration - elapsed);

        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        const displayEl = document.getElementById('plan-timer-display');
        if (displayEl) {
            displayEl.textContent = display;
        }

        // Update progress bar
        const progress = (elapsed / this.timerDuration) * 100;
        const barEl = document.getElementById('plan-timer-bar');
        if (barEl) {
            barEl.style.width = Math.min(progress, 100) + '%';
        }

        if (remaining <= 0) {
            this.completeTimer();
        } else {
            this.timerInterval = setTimeout(() => this.updateTimer(), 100);
        }
    }

    /**
     * Toggle timer pause/play
     */
    toggleTimer() {
        this.timerRunning = !this.timerRunning;
        const playBtn = document.getElementById('plan-timer-play');
        if (playBtn) {
            if (this.timerRunning) {
                this.timerStartTime = Date.now() - (this.timerDuration - Math.max(0, this.timerDuration - Math.floor((Date.now() - this.timerStartTime) / 1000))) * 1000;
                playBtn.textContent = `⏸️ ${this.currentLanguage === 'chinese' ? '暂停' : 'Pause'}`;
            } else {
                playBtn.textContent = `▶️ ${this.currentLanguage === 'chinese' ? '继续' : 'Resume'}`;
            }
        }
        this.updateTimer();
    }

    /**
     * Close timer
     */
    closeTimer() {
        this.timerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        const widget = document.getElementById('plan-timer-widget');
        if (widget) {
            widget.classList.remove('active');
        }

        // Ask if user completed the learning
        const completed = confirm(
            this.currentLanguage === 'chinese' ?
            '学习已结束，已完成此计划吗？' : 'Study session ended. Did you complete this plan?'
        );

        if (completed && this.timerPlanId) {
            const plan = this.plans.find(p => p.id === this.timerPlanId);
            if (plan) {
                plan.completedThisWeek = (plan.completedThisWeek || 0) + 1;
                this.savePlansToDisk();
                this.displayPlanManager();

                const message = this.currentLanguage === 'chinese' ? '✅ 恭喜完成一次学习!' : '✅ Great! Study session logged!';
                this.showPageNotification('plan-manager', message);
            }
        }
    }

    /**
     * Complete timer automatically
     */
    completeTimer() {
        this.timerRunning = false;
        const displayEl = document.getElementById('plan-timer-display');
        if (displayEl) {
            displayEl.textContent = '00:00:00';
        }

        const message = this.currentLanguage === 'chinese' ? '⏰ 学习时间到！' : '⏰ Time\'s up!';
        this.showTopNotification(message, 'info');

        setTimeout(() => {
            this.closeTimer();
        }, 2000);
    }

    /**
     * Display the progress page with cards for each subject
     */
    displayProgressPage() {
        console.log('[Progress] Displaying progress page...');
        const activities = this.activityTracker.getActivities();
        console.log(`[Progress] Total activities in tracker:`, activities.length, activities);

        const progress = this.calculateProgress();
        console.log(`[Progress] Calculated progress:`, progress);

        const userSubjects = (this.settings && this.settings.subjects) ? this.settings.subjects : [];
        console.log(`[Progress] User subjects:`, userSubjects);

        const statsContainer = document.getElementById('progress-stats');
        const cardsContainer = document.getElementById('progress-cards-container');

        if (!statsContainer || !cardsContainer) {
            console.error('Progress page elements not found');
            return;
        }

        // Clear existing content
        cardsContainer.innerHTML = '';

        // Update statistics
        if (progress.totalActivities > 0) {
            statsContainer.style.display = 'grid';
            document.getElementById('total-activities').textContent = progress.totalActivities;

            // Count subjects with activities
            const subjectsWithActivities = Object.keys(progress.bySubject).filter(
                s => progress.bySubject[s].count > 0
            ).length;
            document.getElementById('total-subjects').textContent = subjectsWithActivities;

            // Format last activity time
            if (progress.lastActivityTime) {
                const lastTime = new Date(progress.lastActivityTime);
                document.getElementById('last-activity-time').textContent =
                    lastTime.toLocaleDateString(this.currentLanguage === 'chinese' ? 'zh-CN' : 'en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
            }
        } else {
            statsContainer.style.display = 'none';
            cardsContainer.innerHTML = `
                <p class="progress-empty-message" style="padding: 40px; text-align: center; color: #999;">
                    ${t('progress.no-activities', this.currentLanguage)}
                </p>
            `;
            return;
        }

        // Create cards for each subject
        const subjectsToDisplay = userSubjects.filter(s => progress.bySubject[s] && progress.bySubject[s].count > 0);

        if (subjectsToDisplay.length > 0 || (progress.bySubject['Other'] && progress.bySubject['Other'].count > 0)) {
            // Display user's main subjects with activities
            subjectsToDisplay.forEach(subject => {
                const subjectData = progress.bySubject[subject];
                cardsContainer.appendChild(this.createProgressCard(subject, subjectData));
            });

            // Display "Other" category if it has activities
            if (progress.bySubject['Other'] && progress.bySubject['Other'].count > 0) {
                const otherData = progress.bySubject['Other'];
                cardsContainer.appendChild(this.createProgressCard('Other', otherData));
            }
        } else {
            cardsContainer.innerHTML = `
                <p class="progress-empty-message" style="padding: 40px; text-align: center; color: #999;">
                    ${this.currentLanguage === 'chinese' ? '暂无学习活动。开始生成题目、批改答案或进行AI互动来开始追踪您的学习进度。' : 'No learning activities yet. Start generating questions, checking answers, or having AI chats to track your progress.'}
                </p>
            `;
        }

        // Show AI analysis button if there are activities
        const aiAnalysisBtn = document.getElementById('ai-analysis-btn');
        if (aiAnalysisBtn) {
            if (progress.totalActivities > 0) {
                aiAnalysisBtn.style.display = 'block';
                // Remove old listener and add new one
                aiAnalysisBtn.onclick = null;
                aiAnalysisBtn.addEventListener('click', () => this.generateAIAnalysis(progress));
            } else {
                aiAnalysisBtn.style.display = 'none';
            }
        }

        // Show/hide clear progress button
        const clearBtn = document.getElementById('clear-progress-btn');
        if (clearBtn) {
            clearBtn.style.display = progress.totalActivities > 0 ? 'inline-block' : 'none';
        }

    }

    /**
     * Clear all progress data with confirmation
     */
    clearProgressData() {
        // Ask for confirmation
        const confirmed = confirm('确定要删除所有学习进度数据吗？此操作不可恢复。');
        if (!confirmed) {
            return;
        }

        // Clear activities
        this.activityTracker.clearActivities();
        console.log('[Progress] All activities cleared');

        // Refresh the progress page display
        this.displayProgressPage();

        // Reset AI analysis panel
        const aiAnalysisContent = document.getElementById('ai-analysis-content');
        if (aiAnalysisContent) {
            aiAnalysisContent.innerHTML = `
                <p style="text-align: center; color: #999; padding: 40px 20px;">
                    完成至少一次活动后，AI 将为您分析学习进度
                </p>
            `;
        }

        this.log('✅ 所有学习进度数据已清空', 'success');
    }

    /**
     * Create a progress card for a subject
     */
    createProgressCard(subject, subjectData) {
        const card = document.createElement('div');
        card.className = 'progress-card';
        card.style.cssText = `
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            background-color: #f9f9f9;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        `;

        const lastActivityText = subjectData.lastActivity
            ? new Date(subjectData.lastActivity).toLocaleDateString(
                this.currentLanguage === 'chinese' ? 'zh-CN' : 'en-US',
                { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
              )
            : '-';

        const topicsText = subjectData.topics && subjectData.topics.length > 0
            ? subjectData.topics.slice(0, 5).join(', ')
            : t('progress.no-topics', this.currentLanguage);

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div>
                    <h3 style="margin: 0 0 4px 0; color: #333; font-size: 18px;">${subject}</h3>
                    <p style="margin: 0; color: #999; font-size: 12px;">
                        ${t('progress.last-activity', this.currentLanguage)} ${lastActivityText}
                    </p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 28px; font-weight: bold; color: #1976d2;">${subjectData.count}</div>
                    <div style="color: #999; font-size: 12px;">
                        ${t('progress.activities-count', this.currentLanguage)}
                    </div>
                </div>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0 0 4px 0; color: #666; font-size: 12px; font-weight: 500;">
                    ${t('progress.topics-covered', this.currentLanguage)}
                </p>
                <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.6;">
                    ${topicsText}
                </p>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0 0 4px 0; color: #666; font-size: 12px; font-weight: 500;">
                    ${t('progress.activity-types', this.currentLanguage)}
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${subjectData.activities.map(a => {
                        const typeLabels = {
                            'question-generator': t('progress.type.questions', this.currentLanguage),
                            'answer-checker': t('progress.type.grading', this.currentLanguage),
                            'ai-chat': t('progress.type.chat', this.currentLanguage),
                            'learning-plan': t('progress.type.planning', this.currentLanguage)
                        };
                        return `<span style="background-color: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${typeLabels[a.type] || a.type}</span>`;
                    }).filter((v, i, a) => a.indexOf(v) === i).join('')}
                </div>
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0; display: flex; gap: 8px;">
                <button class="mindmap-card-btn" data-subject="${subject}" style="padding: 6px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px;">
                    📚 ${t('progress.learning-path', this.currentLanguage)}
                </button>
                <button class="feedback-toggle-btn" data-subject="${subject}" style="padding: 6px 12px; background-color: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; display: inline-flex; align-items: center; gap: 4px;">
                    💬 ${t('progress.feedback-label', this.currentLanguage)}
                </button>
            </div>

            <!-- Feedback Section (Initially Hidden) -->
            <div class="feedback-section" data-subject="${subject}" style="display: none; margin-top: 12px; padding: 12px; background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px;">
                <div style="margin-bottom: 10px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; font-weight: 500;">${t('progress.feedback-label', this.currentLanguage)}</p>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
                        <button class="feedback-btn" data-feedback="too-easy" style="padding: 4px 10px; background-color: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;">
                            ${t('progress.feedback-too-easy', this.currentLanguage)}
                        </button>
                        <button class="feedback-btn" data-feedback="too-hard" style="padding: 4px 10px; background-color: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;">
                            ${t('progress.feedback-too-hard', this.currentLanguage)}
                        </button>
                        <button class="feedback-btn" data-feedback="just-right" style="padding: 4px 10px; background-color: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;">
                            ${t('progress.feedback-just-right', this.currentLanguage)}
                        </button>
                        <button class="feedback-btn" data-feedback="need-examples" style="padding: 4px 10px; background-color: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.2s;">
                            ${t('progress.feedback-need-examples', this.currentLanguage)}
                        </button>
                    </div>
                    <textarea class="feedback-text" placeholder="${t('progress.feedback-placeholder', this.currentLanguage)}" style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: inherit; resize: vertical;"></textarea>
                    <button class="feedback-submit-btn" style="margin-top: 8px; padding: 6px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                        ${t('progress.feedback-submit', this.currentLanguage)}
                    </button>
                </div>
            </div>
        `;

        // Bind click event with proper context
        setTimeout(() => {
            const btn = card.querySelector('.mindmap-card-btn');
            if (btn) {
                console.log('[MindMap] Binding click event for subject:', subject);
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[MindMap] Button clicked for subject:', subject);
                    this.showMindMap(subject, subjectData);
                };
            }

            // Bind feedback toggle button
            const feedbackToggleBtn = card.querySelector('.feedback-toggle-btn');
            if (feedbackToggleBtn) {
                feedbackToggleBtn.onclick = (e) => {
                    e.preventDefault();
                    const feedbackSection = card.querySelector('.feedback-section');
                    if (feedbackSection) {
                        const isHidden = feedbackSection.style.display === 'none';
                        feedbackSection.style.display = isHidden ? 'block' : 'none';
                        feedbackToggleBtn.style.backgroundColor = isHidden ? '#e3f2fd' : '#f0f0f0';
                        feedbackToggleBtn.style.borderColor = isHidden ? '#1976d2' : '#ddd';
                    }
                };
            }

            // Bind feedback preset buttons
            const feedbackButtons = card.querySelectorAll('.feedback-btn');
            feedbackButtons.forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    // Toggle selection
                    const isSelected = btn.style.backgroundColor === 'rgb(25, 118, 210)';
                    if (isSelected) {
                        btn.style.backgroundColor = 'white';
                        btn.style.color = '#333';
                    } else {
                        btn.style.backgroundColor = '#1976d2';
                        btn.style.color = 'white';
                    }
                };
            });

            // Bind feedback submit button
            const feedbackSubmitBtn = card.querySelector('.feedback-submit-btn');
            if (feedbackSubmitBtn) {
                feedbackSubmitBtn.onclick = async (e) => {
                    e.preventDefault();
                    const feedbackSection = card.querySelector('.feedback-section');
                    const selectedButtons = feedbackSection.querySelectorAll('.feedback-btn[style*="rgb(25, 118, 210)"]');
                    const feedbackText = feedbackSection.querySelector('.feedback-text').value;

                    const selectedFeedback = Array.from(selectedButtons).map(btn => btn.getAttribute('data-feedback'));

                    if (selectedFeedback.length === 0 && feedbackText.trim() === '') {
                        alert(t('progress.feedback-error', this.currentLanguage) || 'Please select or write feedback');
                        return;
                    }

                    // Save feedback
                    await this.saveFeedback(subject, selectedFeedback, feedbackText);

                    // Show success message
                    const originalText = feedbackSubmitBtn.textContent;
                    feedbackSubmitBtn.textContent = t('progress.feedback-thanks', this.currentLanguage);
                    feedbackSubmitBtn.disabled = true;

                    setTimeout(() => {
                        feedbackSubmitBtn.textContent = originalText;
                        feedbackSubmitBtn.disabled = false;
                        // Clear form
                        feedbackSection.querySelectorAll('.feedback-btn').forEach(btn => {
                            btn.style.backgroundColor = 'white';
                            btn.style.color = '#333';
                        });
                        feedbackSection.querySelector('.feedback-text').value = '';
                        feedbackSection.style.display = 'none';
                        feedbackToggleBtn.style.backgroundColor = '#f0f0f0';
                        feedbackToggleBtn.style.borderColor = '#ddd';
                    }, 1500);
                };
            }
        }, 0);

        return card;
    }

    /**
     * Get feedback context for a subject to add to AI prompts
     */
    getFeedbackContext(subject) {
        const recentFeedback = this.getRecentFeedback(subject, 5);
        if (!recentFeedback || recentFeedback.length === 0) {
            return null;
        }

        const lang = this.currentLanguage || 'chinese';
        const feedbackSummary = {
            'too-easy': 0,
            'too-hard': 0,
            'just-right': 0,
            'need-examples': 0
        };

        let customFeedback = [];
        recentFeedback.forEach(entry => {
            if (entry.types) {
                entry.types.forEach(type => {
                    if (feedbackSummary.hasOwnProperty(type)) {
                        feedbackSummary[type]++;
                    }
                });
            }
            if (entry.text && entry.text.trim()) {
                customFeedback.push(entry.text);
            }
        });

        // Find the most common feedback
        const tooHardCount = feedbackSummary['too-hard'];
        const tooEasyCount = feedbackSummary['too-easy'];
        const justRightCount = feedbackSummary['just-right'];

        let context = '';
        if (lang === 'chinese') {
            context = `\n【学生反馈上下文】\n`;
            context += `最近的学生反馈：`;
            if (tooHardCount > tooEasyCount) {
                context += `学生认为题目较难。请考虑降低难度，增加中等难度题目，并提供更详细的解析。\n`;
            } else if (tooEasyCount > tooHardCount) {
                context += `学生认为题目较简单。请考虑提高难度和复杂性。\n`;
            } else if (justRightCount > 0) {
                context += `学生认为题目难度适中。请保持当前难度。\n`;
            }
            if (feedbackSummary['need-examples'] > 0) {
                context += `学生表示需要更多示例。生成时请包含更多示例题和详细步骤。\n`;
            }
            if (customFeedback.length > 0) {
                context += `具体反馈：${customFeedback.join('；')}\n`;
            }
        } else {
            context = `\n[Student Feedback Context]\n`;
            context += `Recent student feedback: `;
            if (tooHardCount > tooEasyCount) {
                context += `Student finds the questions too hard. Please lower the difficulty and provide more detailed explanations.\n`;
            } else if (tooEasyCount > tooHardCount) {
                context += `Student finds the questions too easy. Please increase the difficulty.\n`;
            } else if (justRightCount > 0) {
                context += `Student finds the difficulty just right. Please maintain the current level.\n`;
            }
            if (feedbackSummary['need-examples'] > 0) {
                context += `Student needs more examples. Include more sample problems and detailed steps.\n`;
            }
            if (customFeedback.length > 0) {
                context += `Specific feedback: ${customFeedback.join('; ')}\n`;
            }
        }

        return context;
    }

    /**
     * Save user feedback for a subject
     */
    async saveFeedback(subject, feedbackTypes, feedbackText) {
        try {
            // Initialize feedback storage if not exists
            if (!this.data) {
                this.data = {};
            }
            if (!this.data.feedback) {
                this.data.feedback = {};
            }
            if (!this.data.feedback[subject]) {
                this.data.feedback[subject] = [];
            }

            // Create feedback entry
            const feedbackEntry = {
                timestamp: new Date().toISOString(),
                types: feedbackTypes,
                text: feedbackText,
                language: this.currentLanguage
            };

            // Add to feedback history
            this.data.feedback[subject].push(feedbackEntry);

            // Keep only last 20 feedback entries per subject
            if (this.data.feedback[subject].length > 20) {
                this.data.feedback[subject] = this.data.feedback[subject].slice(-20);
            }

            // Save to storage
            await this.saveData();
            console.log(`[Feedback] Saved feedback for ${subject}:`, feedbackEntry);
        } catch (error) {
            console.error('[Feedback] Error saving feedback:', error);
        }
    }

    /**
     * Get recent feedback for a subject
     */
    getRecentFeedback(subject, limit = 5) {
        if (!this.data || !this.data.feedback || !this.data.feedback[subject]) {
            return [];
        }
        return this.data.feedback[subject].slice(-limit).reverse();
    }

    /**
     * Save app data to localStorage
     */
    async saveData() {
        try {
            if (this.data) {
                localStorage.setItem('futuretech-app-data', JSON.stringify(this.data));
                console.log('[Data] Saved app data to localStorage');
            }
        } catch (error) {
            console.error('[Data] Error saving data to localStorage:', error);
        }
    }

    /**
     * Load app data from localStorage
     */
    loadData() {
        try {
            const savedData = localStorage.getItem('futuretech-app-data');
            if (savedData) {
                this.data = JSON.parse(savedData);
                console.log('[Data] Loaded app data from localStorage');
            } else {
                this.data = {};
            }
        } catch (error) {
            console.error('[Data] Error loading data from localStorage:', error);
            this.data = {};
        }
    }

    /**
     * Hook for question generation to track activity
     */
    async onQuestionGenerated(grade, subject, difficulty, questionType, quantity, content) {
        await this.trackActivityWithClassification('question-generator', content, {
            grade,
            subject,
            difficulty,
            questionType,
            quantity
        });
    }

    /**
     * Hook for answer checking to track activity
     */
    async onAnswerChecked(question, studentAnswer, standardAnswer, content) {
        await this.trackActivityWithClassification('answer-checker', content, {
            question: question.substring(0, 100),
            studentAnswer: studentAnswer.substring(0, 100)
        });
    }

    /**
     * Hook for AI chat to track activity
     */
    async onChatMessage(message, response) {
        await this.trackActivityWithClassification('ai-chat', message, {
            messageLength: message.length
        });
    }

    /**
     * Hook for learning plan to track activity
     */
    async onLearningPlanGenerated(goal, duration, level, content) {
        await this.trackActivityWithClassification('learning-plan', content, {
            goal,
            duration,
            level
        });
    }

    /**
     * Generate AI analysis of user's learning progress
     */
    async generateAIAnalysis(progress) {
        const contentDiv = document.getElementById('ai-analysis-content');
        const btnElement = document.getElementById('ai-analysis-btn');

        if (!contentDiv || !btnElement) return;

        // Show loading state (language-aware)
        const loadingMsg = this.currentLanguage === 'chinese' ? '分析中' : 'Analyzing...';
        contentDiv.innerHTML = `<div class="ai-analysis-loading">${loadingMsg}</div>`;
        btnElement.disabled = true;

        try {
            // Build analysis prompt
            const prompt = this.buildAnalysisPrompt(progress);

            console.log('[AI Analysis] Sending analysis request...');

            // Call ZhipuAI
            const response = await fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: prompt,
                    language: this.currentLanguage
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const failMsg = this.currentLanguage === 'chinese' ? '无法生成分析' : 'Failed to generate analysis';
            const analysis = data.content || failMsg;

            console.log('[AI Analysis] Received analysis');

            // Display analysis result
            contentDiv.innerHTML = this.formatAnalysisContent(analysis);

            // Show speak buttons and wrap sentences for highlighting
            const speakAnalysisBtn = document.getElementById('speak-analysis-btn');
            const stopAnalysisBtn = document.getElementById('stop-analysis-btn');
            if (speakAnalysisBtn) speakAnalysisBtn.style.display = 'inline-block';
            if (stopAnalysisBtn) stopAnalysisBtn.style.display = 'inline-block';
            this.wrapSentencesInElement(contentDiv);
        } catch (error) {
            console.error('[AI Analysis] Error:', error);
            const errorTitle = this.currentLanguage === 'chinese' ? '❌ 分析生成失败' : '❌ Failed to generate analysis';
            contentDiv.innerHTML = `
                <p style="color: #fff;">${errorTitle}</p>
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">
                    ${error.message}
                </p>
            `;
        } finally {
            btnElement.disabled = false;
        }
    }

    /**
     * Build the prompt for AI analysis
     */
    buildAnalysisPrompt(progress) {
        const userSubjects = (this.settings && this.settings.subjects) ? this.settings.subjects : [];
        const activities = this.activityTracker.getActivities();
        const lang = this.currentLanguage || 'english';

        // Activity type labels (language-aware)
        const typeLabels = {
            'chinese': {
                'question-generator': '生成题目',
                'answer-checker': '批改答案',
                'ai-chat': 'AI 聊天',
                'learning-plan': '学习规划'
            },
            'english': {
                'question-generator': 'Question Generation',
                'answer-checker': 'Answer Checking',
                'ai-chat': 'AI Chat',
                'learning-plan': 'Learning Plan'
            },
            'spanish': {
                'question-generator': 'Generación de Preguntas',
                'answer-checker': 'Revisión de Respuestas',
                'ai-chat': 'Chat IA',
                'learning-plan': 'Plan de Aprendizaje'
            },
            'french': {
                'question-generator': 'Génération de Questions',
                'answer-checker': 'Vérification des Réponses',
                'ai-chat': 'Chat IA',
                'learning-plan': 'Plan d\'Apprentissage'
            },
            'german': {
                'question-generator': 'Fragenerstellung',
                'answer-checker': 'Antwortprüfung',
                'ai-chat': 'KI-Chat',
                'learning-plan': 'Lernplan'
            },
            'japanese': {
                'question-generator': '問題生成',
                'answer-checker': '答案確認',
                'ai-chat': 'AIチャット',
                'learning-plan': '学習計画'
            },
            'korean': {
                'question-generator': '질문 생성',
                'answer-checker': '답변 검증',
                'ai-chat': 'AI 채팅',
                'learning-plan': '학습 계획'
            },
            'portuguese': {
                'question-generator': 'Geração de Questões',
                'answer-checker': 'Verificação de Respostas',
                'ai-chat': 'Chat IA',
                'learning-plan': 'Plano de Aprendizagem'
            }
        };

        const labels = typeLabels[lang] || typeLabels['english'];
        const dateFormatter = lang === 'chinese' ? 'zh-CN' : 'en-US';
        const separator = lang === 'chinese' ? '、' : ', ';
        const noneText = lang === 'chinese' ? '未记录' : 'No records';

        // Prepare subject summary (language-aware)
        let subjectSummary = '';
        const activitiesText = lang === 'chinese' ? '个活动，涉及主题：' : ' activities, topics: ';
        Object.keys(progress.bySubject).forEach(subject => {
            const data = progress.bySubject[subject];
            if (data.count > 0) {
                subjectSummary += `\n- ${subject}: ${data.count}${activitiesText}${data.topics.join(separator) || noneText}`;
            }
        });

        // Activity types summary
        let activityTypeSummary = '';
        const timesText = lang === 'chinese' ? '次，' : ' times, ';
        Object.keys(progress.byType).forEach(type => {
            activityTypeSummary += `${labels[type] || type}: ${progress.byType[type]}${timesText}`;
        });
        activityTypeSummary = activityTypeSummary.slice(0, -timesText.length); // Remove last separator

        // Build language-specific prompt
        let prompt = '';
        if (lang === 'chinese') {
            prompt = `请以温和、鼓励、积极的语调，为一名学生分析他们的学习进度。

用户选择的主要学科：${userSubjects.join('、')}

学习进度统计：
- 总活动数：${progress.totalActivities}
- 学习科目：${Object.keys(progress.bySubject).filter(s => progress.bySubject[s].count > 0).length}个
- 最后活动时间：${progress.lastActivityTime ? new Date(progress.lastActivityTime).toLocaleDateString(dateFormatter) : '无'}

科目学习情况：${subjectSummary}

活动类型分布：${activityTypeSummary}

请根据以上信息，用友好、鼓励的语气分析：
1. 用户已经掌握了哪些知识领域或主题（要具体举例说明）
2. 学习的强项是什么（基于活动类型和频率）
3. 哪些科目或主题可以继续深化或加强
4. 对学生的学习方向提出温暖且具体的建议
5. 用鼓励的语言增强学生的学习信心

格式要求：
- 语气温暖、鼓励、充满正能量
- 避免说教或批评
- 以"亲爱的学生"开头
- 分段清晰，易于阅读
- 最后以鼓励和祝福结尾
- 不使用 Markdown 符号
- 不超过 500 字`;
        } else {
            prompt = `Please provide a warm, encouraging, and positive analysis of a student's learning progress.

Main subjects selected by user: ${userSubjects.join(separator)}

Learning Progress Statistics:
- Total activities: ${progress.totalActivities}
- Subjects learned: ${Object.keys(progress.bySubject).filter(s => progress.bySubject[s].count > 0).length}
- Last activity: ${progress.lastActivityTime ? new Date(progress.lastActivityTime).toLocaleDateString(dateFormatter) : 'None'}

Subject Learning Status:${subjectSummary}

Activity Type Distribution: ${activityTypeSummary}

Please analyze the above information in a friendly and encouraging manner:
1. What knowledge areas or topics has the student mastered? (Provide specific examples)
2. What are the student's learning strengths? (Based on activity types and frequency)
3. Which subjects or topics could be deepened or strengthened?
4. Provide warm and specific suggestions for the student's learning direction
5. Use encouraging language to boost the student's learning confidence

Format Requirements:
- Warm, encouraging, and positive tone
- Avoid being preachy or critical
- Start with "Dear Student"
- Clear paragraphs that are easy to read
- End with encouragement and best wishes
- Do not use Markdown symbols
- Keep it under 500 words`;
        }

        return prompt;
    }

    /**
     * Format analysis content for display
     */
    formatAnalysisContent(content) {
        // Split into paragraphs and format
        const paragraphs = content.split('\n').filter(p => p.trim());
        let html = '';

        paragraphs.forEach(para => {
            const trimmed = para.trim();
            if (trimmed.length > 0) {
                if (trimmed.match(/^[0-9]/)) {
                    // Numbered points
                    html += `<p style="margin: 15px 0; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);"><strong>${trimmed}</strong></p>`;
                } else {
                    html += `<p style="margin: 10px 0; line-height: 1.8;">${trimmed}</p>`;
                }
            }
        });

        const fallbackMsg = this.currentLanguage === 'chinese' ? '分析生成中...' : 'Generating analysis...';
        return html || `<p>${fallbackMsg}</p>`;
    }

    /**
     * Show mind map modal for a subject
     */
    showMindMap(subject, subjectData) {
        console.log('[MindMap] showMindMap called with subject:', subject);

        const modal = document.getElementById('mindmap-modal');
        console.log('[MindMap] Modal element found:', !!modal);

        if (!modal) {
            console.error('[MindMap] Modal element not found!');
            const alertMsg = this.currentLanguage === 'chinese'
                ? '思维导图模态框未找到，请刷新页面'
                : 'Learning path modal not found. Please refresh the page.';
            alert(alertMsg);
            return;
        }

        // Store current subject data for reference
        this.currentMindMapSubjectData = subjectData;
        this.currentMindMapSubject = subject;

        // Update title (multilingual)
        const titleElement = document.getElementById('mindmap-title');
        if (titleElement) {
            const pathLabel = this.currentLanguage === 'chinese' ? '📚 学习路径' : '📚 Learning Path';
            titleElement.textContent = `${pathLabel} - ${subject}`;
        }

        // Hide body scroll when modal opens (Safari fix)
        document.body.style.overflow = 'hidden';

        // Show modal
        modal.classList.add('show');
        console.log('[MindMap] Modal classes:', modal.className);
        console.log('[MindMap] Modal display:', window.getComputedStyle(modal).display);

        // Generate mind map content
        this.generateMindMap(subject, subjectData);
    }

    /**
     * Close mind map modal
     */
    closeMindMap() {
        console.log('[MindMap] closeMindMap called');
        const modal = document.getElementById('mindmap-modal');
        if (modal) {
            modal.classList.remove('show');
            // Restore body scroll when modal closes
            document.body.style.overflow = 'auto';
            console.log('[MindMap] Modal closed');
        } else {
            console.error('[MindMap] Modal not found for closing');
        }
    }

    /**
     * Generate and display mind map
     */
    async generateMindMap(subject, subjectData) {
        const treeDiv = document.getElementById('mindmap-tree');
        const analysisDiv = document.getElementById('mindmap-analysis');

        if (!treeDiv || !analysisDiv) return;

        // Show loading state (multilingual)
        const loadingMsg = this.currentLanguage === 'chinese'
            ? '生成完整学习路径和建议中...'
            : 'Generating complete learning path and recommendations...';
        treeDiv.innerHTML = `<div class="loading-spinner">${loadingMsg}</div>`;
        // Show table of learned topics initially
        analysisDiv.innerHTML = this.createLearnedTopicsTable(subjectData);

        // Show speak buttons and wrap sentences
        this.updateMindMapSpeakButtons();

        try {
            console.log('[MindMap] Starting generation for subject:', subject);

            // Generate with timeout of 30 seconds
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('生成超时（超过30秒），请检查网络连接后重试')), 30000)
            );

            const result = await Promise.race([
                this.generateMindMapContent(subject, subjectData),
                timeoutPromise
            ]);

            console.log('[MindMap] Generation successful');

            // Display tree
            treeDiv.innerHTML = result.treeHtml;

            // Keep learned topics table (user can click to get details on recommendations)
            // analysisDiv already shows the learned topics table
        } catch (error) {
            console.error('[MindMap] Generation error:', error);
            const errorTitle = this.currentLanguage === 'chinese' ? '思维导图生成失败' : 'Learning path generation failed';
            treeDiv.innerHTML = `<p style="color: #d32f2f;">❌ ${errorTitle}</p><p style="color: #999; font-size: 12px;">${error.message}</p>`;
            // Keep showing learned topics table on error
        }
    }

    /**
     * Create table of learned topics
     */
    createLearnedTopicsTable(subjectData) {
        // Get translations
        const emptyMsg = this.getTranslationKey('lp.no-learned-topics');
        const emptyHint = this.getTranslationKey('lp.click-left-recommendations');
        const tableHeader = this.getTranslationKey('lp.learned-topics-header');
        const topicCol = this.getTranslationKey('lp.topic-header');
        const bottomTip = this.getTranslationKey('lp.tip-click-left');

        if (!subjectData || !subjectData.topics || subjectData.topics.length === 0) {
            return `
                <div style="padding: 20px; text-align: center; color: #999;">
                    <p>📚 ${emptyMsg}</p>
                    <p style="font-size: 12px;">${emptyHint}</p>
                </div>
            `;
        }

        let html = `
            <div style="padding: 20px;">
                <h4 style="color: #1976d2; margin-bottom: 15px;">✓ ${tableHeader}</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f5f5f5; border-bottom: 2px solid #ddd;">
                            <th style="padding: 10px; text-align: left; color: #333;">${topicCol}</th>
                            <th style="padding: 10px; text-align: center; color: #333; width: 60px;">✓</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        subjectData.topics.forEach(topic => {
            html += `
                        <tr style="border-bottom: 1px solid #eee; transition: background-color 0.2s;">
                            <td style="padding: 12px 10px; color: #333;">${topic}</td>
                            <td style="padding: 12px 10px; text-align: center; color: #4CAF50;">✓</td>
                        </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <p style="margin-top: 15px; font-size: 12px; color: #999;">💡 ${bottomTip}</p>
            </div>
        `;

        return html;
    }

    /**
     * Create simplified mind map (fallback when AI fails)
     */
    createSimplifiedMindMap(subject, subjectData) {
        const masteredTitle = this.getTranslationKey('lp.mastered-topics') || '✓ 已掌握的主题';
        const recommendedTitle = this.getTranslationKey('lp.recommended-directions') || '→ 推荐学习方向';

        let treeHtml = `<div class="tree-node-main">📌 ${subject}</div>`;

        // Already mastered
        if (subjectData.topics && subjectData.topics.length > 0) {
            treeHtml += '<div class="tree-node-category">';
            treeHtml += `<div class="tree-node-category-title">${masteredTitle}</div>`;
            subjectData.topics.forEach(topic => {
                treeHtml += `<div class="tree-node-item tree-item-learned">${topic}</div>`;
            });
            treeHtml += '</div>';
        }

        // Get default recommendations
        const recommendations = this.getDefaultRecommendations(subject);
        treeHtml += '<div class="tree-node-category">';
        treeHtml += `<div class="tree-node-category-title">${recommendedTitle}</div>`;
        recommendations.forEach(rec => {
            treeHtml += `<div class="tree-node-item tree-item-recommended">${rec}</div>`;
        });
        treeHtml += '</div>';

        // Multilingual fallback analysis
        let analysis;
        const topicCount = subjectData.topics ? subjectData.topics.length : 0;
        if (this.currentLanguage === 'chinese') {
            analysis = `<p>已掌握 <strong>${topicCount}</strong> 个主题。</p>
            <p>根据学习进度，建议继续深化以下方向：</p>
            <ul>
                ${recommendations.slice(0, 3).map(r => `<li>${r}</li>`).join('')}
            </ul>
            <p>持续学习，你会收获更多知识！💪</p>`;
        } else {
            analysis = `<p>You have mastered <strong>${topicCount}</strong> topics.</p>
            <p>Based on your learning progress, we recommend continuing to deepen the following directions:</p>
            <ul>
                ${recommendations.slice(0, 3).map(r => `<li>${r}</li>`).join('')}
            </ul>
            <p>Keep learning and you will gain more knowledge! 💪</p>`;
        }

        return {
            treeHtml,
            analysis
        };
    }

    /**
     * Generate mind map content using AI
     */
    async generateMindMapContent(subject, subjectData) {
        const prompt = this.buildMindMapPrompt(subject, subjectData);

        console.log('[MindMap] Sending API request to:', API_BASE_URL);
        console.log('[MindMap] Subject:', subject);

        try {
            const response = await fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: prompt,
                    language: this.currentLanguage
                })
            });

            console.log('[MindMap] API response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('[MindMap] API error response:', errorData);
                throw new Error(`API error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            console.log('[MindMap] Response data received');

            if (!data || !data.content) {
                console.error('[MindMap] No content in response:', data);
                const emptyMsg = this.currentLanguage === 'chinese' ? 'API 返回空内容' : 'API returned empty content';
                throw new Error(emptyMsg);
            }

            const content = data.content;

            console.log('[MindMap] Parsing response...');

            // Parse response to extract tree and analysis
            const result = this.parseMindMapResponse(subject, subjectData, content);
            console.log('[MindMap] Parsing complete');
            return result;
        } catch (error) {
            console.error('[MindMap] Error in generateMindMapContent:', error);
            throw error;
        }
    }

    /**
     * Build prompt for mind map generation
     */
    buildMindMapPrompt(subject, subjectData) {
        const topics = subjectData.topics && subjectData.topics.length > 0
            ? subjectData.topics.join(this.currentLanguage === 'chinese' ? '、' : ', ')
            : (this.currentLanguage === 'chinese' ? '（未记录具体主题）' : '(No specific topics recorded)');

        let prompt;
        const langDirective = this.currentLanguage === 'chinese'
            ? '【语言：中文】你必须用中文回复，所有内容都必须是中文。\n'
            : `【LANGUAGE: ${this.currentLanguage.toUpperCase()}】You MUST respond entirely in ${this.currentLanguage === 'english' ? 'English' : this.currentLanguage}, NOT in Chinese. Every single word must be in ${this.currentLanguage === 'english' ? 'English' : this.currentLanguage}.\n`;

        if (this.currentLanguage === 'chinese') {
            prompt = `${langDirective}
为学习"${subject}"的学生生成学习路径思维导图。

已学内容：${topics}

请快速生成以下内容（保持简洁）：

【已掌握】
- 用户可能已经掌握的${subject}的主要知识点（列举3-5个）

【推荐下一步】
列举6-8个推荐学习的具体主题，格式为：
主题名称 - 原因简述

【学习建议】
温暖鼓励的建议语句，帮助用户继续深入学习。`;
        } else {
            prompt = `${langDirective}
Generate a learning path mind map for a student learning "${subject}".

Topics already learned: ${topics}

Please quickly generate the following content (keep it concise):

[Already Mastered]
- Main knowledge points of ${subject} that the user may have already mastered (list 3-5)

[Recommended Next Steps]
List 6-8 specific topics recommended for learning, in the format:
Topic name - Brief reason

[Learning Advice]
Warm and encouraging suggestions to help the user continue learning deeply.`;
        }

        return prompt;
    }

    /**
     * Parse AI response and create HTML tree
     */
    parseMindMapResponse(subject, subjectData, content) {
        // Extract sections from content
        const sections = content.split(/\n(?=【)/);

        let treeHtml = '';
        let analysis = '';

        sections.forEach(section => {
            if (section.includes('【推荐的学习方向】') || section.includes('【学习路径】')) {
                treeHtml += this.buildTreeHtml(subject, subjectData, section);
            } else if (section.includes('【已掌握的内容】')) {
                // Extract learning achievements
            } else if (section.includes('【鼓励和建议】')) {
                analysis += section.replace('【鼓励和建议】', '').trim();
            }
        });

        // If no structured tree found, create default one
        if (!treeHtml) {
            treeHtml = this.createDefaultTreeHtml(subject, subjectData);
        }

        return {
            treeHtml: treeHtml || '<p>思维导图加载中...</p>',
            analysis: analysis || this.extractAnalysisFromContent(content)
        };
    }

    /**
     * Build tree HTML from content
     */
    buildTreeHtml(subject, subjectData, content) {
        let html = `<div class="tree-node-main">📌 ${subject}</div>`;

        // Add learned topics
        if (subjectData.topics && subjectData.topics.length > 0) {
            html += '<div class="tree-node-category">';
            html += '<div class="tree-node-category-title">✓ 已掌握的主题</div>';
            subjectData.topics.forEach(topic => {
                html += `<div class="tree-node-item tree-item-learned">${topic}</div>`;
            });
            html += '</div>';
        }

        // Add recommended topics extracted from content
        const recommendedTopics = this.extractRecommendedTopics(content);
        if (recommendedTopics.length > 0) {
            html += '<div class="tree-node-category">';
            html += '<div class="tree-node-category-title">→ 推荐学习的下一步</div>';
            recommendedTopics.slice(0, 8).forEach((topic, index) => {
                // Create clickable topic items that show details on right panel
                const topicId = `topic-${index}-${Date.now()}`;
                html += `<div class="tree-node-item tree-item-recommended" style="cursor: pointer; transition: all 0.2s;" onclick="window.app && window.app.showTopicDetails('${subject}', '${topic.replace(/'/g, "\\'")}', '${topicId}')" onmouseover="this.style.backgroundColor='#e8f5e9'; this.style.transform='translateX(5px)';" onmouseout="this.style.backgroundColor='transparent'; this.style.transform='translateX(0)'>
                    📚 ${topic}
                </div>`;
            });
            html += '</div>';
        }

        return html;
    }

    /**
     * Create default tree structure
     */
    createDefaultTreeHtml(subject, subjectData) {
        let html = `<div class="tree-node-main">📌 ${subject}</div>`;

        // Already mastered
        if (subjectData.topics && subjectData.topics.length > 0) {
            html += '<div class="tree-node-category">';
            html += '<div class="tree-node-category-title">✓ 已掌握</div>';
            subjectData.topics.forEach(topic => {
                html += `<div class="tree-node-item tree-item-learned">${topic}</div>`;
            });
            html += '</div>';
        }

        // Recommendations
        const recommendations = this.getDefaultRecommendations(subject);
        html += '<div class="tree-node-category">';
        html += '<div class="tree-node-category-title">→ 建议学习方向</div>';
        recommendations.forEach((rec, index) => {
            const topicId = `topic-${index}-${Date.now()}`;
            html += `<div class="tree-node-item tree-item-recommended" style="cursor: pointer; transition: all 0.2s;" onclick="window.app && window.app.showTopicDetails('${subject}', '${rec.replace(/'/g, "\\'")}', '${topicId}')" onmouseover="this.style.backgroundColor='#e8f5e9'; this.style.transform='translateX(5px)';" onmouseout="this.style.backgroundColor='transparent'; this.style.transform='translateX(0)'">
                📚 ${rec}
            </div>`;
        });
        html += '</div>';

        return html;
    }

    /**
     * Get default recommendations based on subject
     */
    getDefaultRecommendations(subject) {
        const recommendations = {
            '数学': ['实际应用案例', '高级公式推导', '概率统计', '函数分析', '数值计算'],
            'Math': ['Real-world applications', 'Advanced formula derivation', 'Probability and statistics', 'Function analysis', 'Numerical computation'],
            '英文': ['高级语法结构', '学术写作', '演讲技巧', '文学赏析', '跨文化交流'],
            'English': ['Advanced grammar', 'Academic writing', 'Public speaking', 'Literature appreciation', 'Cross-cultural communication'],
            '科学': ['实验设计', '前沿技术', '跨学科应用', '研究方法', '科学论文写作'],
            'Science': ['Experimental design', 'Cutting-edge technology', 'Interdisciplinary applications', 'Research methods', 'Scientific paper writing'],
            '历史': ['深层分析', '比较研究', '档案研究', '历史现场考察', '专题深入'],
            'History': ['Deep analysis', 'Comparative study', 'Archive research', 'Historical field study', 'In-depth topics'],
            '化学': ['有机化学进阶', '工业应用', '分析化学', '新材料', '反应机制'],
            'Chemistry': ['Advanced organic chemistry', 'Industrial applications', 'Analytical chemistry', 'New materials', 'Reaction mechanisms']
        };

        return recommendations[subject] || ['深化理论理解', '实践应用', '拓展相关领域', '针对性强化', '综合应用'];
    }

    /**
     * Show detailed content for a recommended topic
     */
    async showTopicDetails(subject, topic, topicId) {
        const analysisDiv = document.getElementById('mindmap-analysis');
        if (!analysisDiv) return;

        // Show loading state
        analysisDiv.innerHTML = '<div style="padding: 20px; text-align: center;"><div class="loading-spinner">📚 生成学习详情中...</div></div>';

        try {
            // Generate detailed content for the topic
            const prompt = `请为"${topic}"这个主题生成实施方法的简明概括（在"${subject}"科目背景下）。要求：

【概述】
简明扼要地说明这个主题是什么，为什么学生需要学习它

【学习方法】
列举2-3种有效的学习方式和技巧

【核心内容】
列举3-5个需要掌握的关键知识点或技能

【应用实践】
举1-2个实际应用或练习例子

【建议】
给学生的鼓励和学习建议

总体字数控制在200-300字，用鼓励的语气，避免使用Markdown符号。`;

            // With timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('生成超时（超过20秒），请重试')), 20000)
            );

            const fetchPromise = fetch(`${API_BASE_URL}/ai/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: prompt })
            }).then(response => {
                if (!response.ok) throw new Error('AI请求失败');
                return response.json();
            }).then(data => {
                if (data.error) throw new Error(data.error);
                return data.content;
            });

            const content = await Promise.race([fetchPromise, timeoutPromise]);

            // Clean up complex LaTeX and format the content
            const cleanedContent = this.cleanupComplexLatex(content);
            const formattedContent = this.formatChatResponse(cleanedContent);

            // Add topic title and back button
            analysisDiv.innerHTML = `
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px;">
                        <button onclick="window.app && window.app.showMindMapLearned()" style="background-color: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 14px;">← 返回已学主题</button>
                    </div>
                    <h3 style="color: #1976d2; margin-bottom: 15px; font-size: 18px;">📚 ${topic}</h3>
                    <div style="color: #333; line-height: 1.8; font-size: 14px;">
                        ${formattedContent}
                    </div>
                </div>
            `;

            // Render LaTeX if present
            if (window.MathJax) {
                setTimeout(() => {
                    window.MathJax.typesetPromise([analysisDiv]).catch(err => {
                        console.log('MathJax rendering error:', err);
                    });
                }, 100);
            }

            // Show speak buttons and wrap sentences
            this.updateMindMapSpeakButtons();

            console.log(`[MindMap] Displayed details for topic: ${topic}`);
        } catch (error) {
            console.error('[MindMap] Error showing topic details:', error);
            analysisDiv.innerHTML = `
                <div style="padding: 20px; color: #d32f2f;">
                    <p>❌ 无法获取主题详情</p>
                    <p style="font-size: 12px; color: #999; margin-bottom: 15px;">${error.message}</p>
                    <button onclick="window.app && window.app.showMindMapLearned()" style="background-color: #666; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">← 返回已学主题</button>
                </div>
            `;
        }
    }

    /**
     * Show learned topics table (return from topic details)
     */
    showMindMapLearned() {
        const analysisDiv = document.getElementById('mindmap-analysis');
        if (!analysisDiv) return;

        // Get the current subject data from the modal state
        // This is stored when showMindMap is called
        if (this.currentMindMapSubjectData) {
            analysisDiv.innerHTML = this.createLearnedTopicsTable(this.currentMindMapSubjectData);
            // Show speak buttons and wrap sentences
            this.updateMindMapSpeakButtons();
        }
    }

    /**
     * Close mind map modal and return to list view
     */
    closeMindMapModal() {
        const modal = document.getElementById('mindmap-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Update speak button visibility and wrap sentences for mindmap analysis
     */
    updateMindMapSpeakButtons() {
        const analysisDiv = document.getElementById('mindmap-analysis');
        const speakBtn = document.getElementById('speak-mindmap-analysis-btn');
        const stopBtn = document.getElementById('stop-mindmap-analysis-btn');

        if (!analysisDiv || !speakBtn || !stopBtn) return;

        // Wrap sentences for highlighting
        this.wrapSentencesInElement(analysisDiv);

        // Show speak buttons if there's content
        if (analysisDiv.textContent.trim().length > 0) {
            speakBtn.style.display = 'inline-block';
            stopBtn.style.display = 'inline-block';
        } else {
            speakBtn.style.display = 'none';
            stopBtn.style.display = 'none';
        }
    }

    /**
     * Extract recommended topics from content
     */
    extractRecommendedTopics(content) {
        const topics = [];
        const lines = content.split('\n');
        let inRecommendedSection = false;

        lines.forEach(line => {
            if (line.includes('推荐') || line.includes('下一步') || line.includes('建议学习')) {
                inRecommendedSection = true;
            } else if (line.startsWith('【')) {
                inRecommendedSection = false;
            } else if (inRecommendedSection && line.trim().length > 0) {
                const cleaned = line.replace(/^[-●○►►▪•·]/g, '').trim();
                if (cleaned.length > 0 && cleaned.length < 50) {
                    topics.push(cleaned);
                }
            }
        });

        return topics;
    }

    /**
     * Extract analysis from content
     */
    extractAnalysisFromContent(content) {
        const match = content.match(/【鼓励和建议】([\s\S]*?)(?=【|$)/);
        if (match) {
            return match[1].trim().split('\n').map(line => {
                const cleaned = line.trim();
                return cleaned.length > 0 ? `<p>${cleaned}</p>` : '';
            }).join('');
        }
        return `<p>${content.substring(0, 200)}...</p>`;
    }

    /**
     * Format mind map analysis for display
     */
    formatMindMapAnalysis(content) {
        const paragraphs = content.split('<p>').filter(p => p.trim());
        let html = '';

        paragraphs.forEach(para => {
            const cleaned = para.replace('</p>', '').trim();
            if (cleaned.length > 0) {
                html += `<p>${cleaned}</p>`;
            }
        });

        return html || '<p>分析信息加载中...</p>';
    }

    /**
     * Debug helper - check progress tracking status
     */
    debugProgress() {
        console.log('\n========== PROGRESS DEBUG INFO ==========');

        // Check localStorage
        const activitiesRaw = localStorage.getItem('futuretech-activities');
        console.log('Raw localStorage activities:', activitiesRaw);

        // Check activity tracker
        const activities = this.activityTracker.getActivities();
        console.log('Activity tracker activities count:', activities.length);
        console.log('Activity tracker activities:', activities);

        // Check settings
        console.log('Current settings subjects:', this.settings?.subjects || 'None');
        console.log('Current user:', this.currentUser?.username || 'Not logged in');

        // Check progress calculation
        const progress = this.calculateProgress();
        console.log('Calculated progress:', progress);

        console.log('=========================================\n');

        return {
            activitiesCount: activities.length,
            activities: activities,
            userSubjects: this.settings?.subjects || [],
            localStorage: activitiesRaw
        };
    }
}

// Global error handler to catch JavaScript errors
window.addEventListener('error', (event) => {
    console.error('JavaScript Error:', event.error);
    console.error('Stack:', event.error?.stack);
});

// Handle promise rejection errors
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new FutureTechApp();
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
});
