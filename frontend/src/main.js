import { tasks as defaultTasks } from './tasks.js';
import { CodeJar } from 'codejar';
import Prism from 'prismjs';

let jar = null;
let activeTask = null;

let currentDifficultyFilter = 'all';
let searchQuery = '';
let currentTab = 'editor';
let activeTaskTab = 'desc';

let timerInterval = null;
let secondsElapsed = 0;

const taskListContainer = document.querySelector('.task-list');
const workspaceContainer = document.querySelector('.workspace');

const PROGRESS_KEY = 'junior_code_progress';
const CUSTOM_TASKS_KEY = 'junior_code_custom_tasks';
const ACHIEVEMENTS_KEY = 'junior_code_achievements';
const SUBMISSIONS_KEY = 'junior_code_submissions';
const GEMINI_KEY = 'junior_code_gemini_api_key';

const ACHIEVEMENTS = [
  { id: 'first-blood', title: '🥇 Первая кровь', description: 'Реши свою самую первую задачу на платформе.' },
  { id: 'speed-demon', title: '⚡ Демон скорости', description: 'Реши любую задачу быстрее чем за 30 секунд.' },
  { id: 'night-owl', title: '🦉 Полуночный кодер', description: 'Отправь успешное решение в ночное время (с 22:00 до 06:00).' },
  { id: 'creator', title: '🛠 На все руки мастер', description: 'Создай свою собственную задачу в конструкторе.' },
  { id: 'perfectionist', title: '🏆 Перфекционист', description: 'Успешно реши задачу, которую ты создал сам.' }
];

function getAllTasks() {
  const customTasks = JSON.parse(localStorage.getItem(CUSTOM_TASKS_KEY)) || [];
  return [...defaultTasks, ...customTasks];
}

function saveProgress(taskId, code, isPassed, timeSpent = null) {
  const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  const oldStatus = progress[taskId]?.isPassed || false;
  const oldTime = progress[taskId]?.timeSpent || null;

  let finalTime = oldTime;
  if (isPassed) {
    if (oldTime === null || (timeSpent !== null && timeSpent < oldTime)) {
      finalTime = timeSpent;
    }
  } else if (oldTime === null && timeSpent !== null) {
    finalTime = timeSpent;
  }

  progress[taskId] = { code, isPassed: isPassed || oldStatus, timeSpent: finalTime };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function getTaskProgress(taskId) {
  const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  return progress[taskId] || null;
}

function getSubmissions(taskId) {
  const allSubmissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY)) || {};
  return allSubmissions[taskId] || [];
}

function saveSubmission(taskId, code, isPassed) {
  const allSubmissions = JSON.parse(localStorage.getItem(SUBMISSIONS_KEY)) || {};
  if (!allSubmissions[taskId]) allSubmissions[taskId] = [];

  const newSubmission = {
    timestamp: new Date().toLocaleString('ru-RU'),
    code: code,
    isPassed: isPassed
  };

  allSubmissions[taskId].unshift(newSubmission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(allSubmissions));
}

function getUnlockedAchievements() {
  return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY)) || [];
}

function unlockAchievement(achievementId) {
  const unlocked = getUnlockedAchievements();
  if (!unlocked.includes(achievementId)) {
    unlocked.push(achievementId);
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
    const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (ach) showAchievementToast(ach);
  }
}

function showAchievementToast(achievement) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.background = 'linear-gradient(135deg, #1e1e38 0%, #2d1b4e 100%)';
  toast.style.border = '2px solid var(--warning)';
  toast.style.padding = '15px 20px';
  toast.style.borderRadius = '10px';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
  toast.style.zIndex = '9999';
  toast.style.display = 'flex';
  toast.style.flexDirection = 'column';
  toast.style.gap = '5px';
  toast.style.animation = 'slideIn 0.4s ease forwards';
  toast.style.color = '#fff';

  toast.innerHTML = `
    <span style="color: var(--warning); font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">🏆 Достижение разблокировано!</span>
    <span style="font-size: 16px; font-weight: bold; margin-top: 2px;">${achievement.title}</span>
    <span style="font-size: 13px; color: var(--text-muted);">${achievement.description}</span>
  `;

  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.innerHTML = `
      @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(20px); } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.5s ease forwards';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

function checkAchievementsAfterTaskSolved(taskId, timeSpent) {
  const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  const solvedTasks = Object.keys(progress).filter(id => progress[id].isPassed);

  if (solvedTasks.length === 1) unlockAchievement('first-blood');
  if (timeSpent !== null && timeSpent < 30) unlockAchievement('speed-demon');
  
  const currentHour = new Date().getHours();
  if (currentHour >= 22 || currentHour < 6) unlockAchievement('night-owl');

  const isCustom = !defaultTasks.some(t => t.id === taskId);
  if (isCustom) unlockAchievement('perfectionist');
}

function saveCustomTask(newTask) {
  const customTasks = JSON.parse(localStorage.getItem(CUSTOM_TASKS_KEY)) || [];
  customTasks.push(newTask);
  localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(customTasks));
  unlockAchievement('creator');
}

function startTimer() {
  stopTimer();
  secondsElapsed = 0;
  const timerElement = document.getElementById('task-timer');
  if (timerElement) timerElement.textContent = formatTime(secondsElapsed);

  timerInterval = setInterval(() => {
    secondsElapsed++;
    const timerDisplay = document.getElementById('task-timer');
    if (timerDisplay) timerDisplay.textContent = formatTime(secondsElapsed);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function renderTaskList() {
  taskListContainer.innerHTML = '';
  const allTasks = getAllTasks();

  const filteredTasks = allTasks.filter(task => {
    const matchesDifficulty = currentDifficultyFilter === 'all' || task.difficulty === currentDifficultyFilter;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  if (filteredTasks.length === 0) {
    taskListContainer.innerHTML = '<div style="padding: 15px; color: var(--text-muted); font-size: 13px; text-align: center;">Задачи не найдены</div>';
    return;
  }

  filteredTasks.forEach(task => {
    const taskButton = document.createElement('button');
    taskButton.classList.add('task-item');
    if (activeTask && activeTask.id === task.id) taskButton.classList.add('active');
    taskButton.dataset.id = task.id;

    const savedData = getTaskProgress(task.id);
    const isSolved = savedData ? savedData.isPassed : false;
    const isCustom = !defaultTasks.some(t => t.id === task.id);

    taskButton.innerHTML = `
      <span class="task-status ${isSolved ? 'status-success' : ''}" id="status-${task.id}">
        ${isSolved ? '✓' : ''}
      </span>
      <div class="task-info">
        <span class="task-title">${task.title} ${isCustom ? '<small style="color:var(--warning); font-size:10px;">(Своя)</small>' : ''}</span>
        <span class="task-difficulty ${task.difficulty}">
          ${task.difficulty === 'easy' ? 'Легко' : 'Средне'}
        </span>
      </div>
    `;

    taskButton.addEventListener('click', () => {
      switchTab('editor');
      selectTask(task.id);
    });
    taskListContainer.appendChild(taskButton);
  });
}

function selectTask(taskId) {
  document.querySelectorAll('.task-item').forEach(button => button.classList.remove('active'));
  const allTasks = getAllTasks();
  activeTask = allTasks.find(task => task.id === taskId);

  const activeBtn = taskListContainer.querySelector(`[data-id="${taskId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  if (activeTask && currentTab === 'editor') {
    activeTaskTab = 'desc';
    renderTaskWorkspaceStructure();
    initCodeJarEditor();
    startTimer();
  }
}

function renderTaskWorkspaceStructure() {
  workspaceContainer.innerHTML = `
    <div class="task-workspace" style="width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div style="display: flex; flex-direction: column; gap: 15px; border-right: 1px solid var(--border-color); padding-right: 20px;">
        <div style="display: flex; gap: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
          <button class="task-tab-btn ${activeTaskTab === 'desc' ? 'active' : ''}" id="task-tab-desc" style="background: none; border: none; color: ${activeTaskTab === 'desc' ? 'var(--accent)' : 'var(--text-muted)'}; font-weight: bold; cursor: pointer; padding: 5px 10px;">📝 Условие</button>
          <button class="task-tab-btn ${activeTaskTab === 'history' ? 'active' : ''}" id="task-tab-history" style="background: none; border: none; color: ${activeTaskTab === 'history' ? 'var(--accent)' : 'var(--text-muted)'}; font-weight: bold; cursor: pointer; padding: 5px 10px;">📜 История решений</button>
        </div>
        <div id="task-left-content" style="flex: 1; overflow-y: auto;"></div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <h2 style="font-size: 20px;">${activeTask.title}</h2>
          <div style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 6px 14px; border-radius: 20px; font-family: monospace; font-size: 14px; color: var(--warning); display: flex; align-items: center; gap: 6px;">
            ⏱ <span id="task-timer">00:00</span>
          </div>
        </div>
        
        <div class="editor-container language-js" style="flex: 1; min-height: 250px;"></div>
        
        <div style="display: flex; gap: 10px;">
          <button class="btn-submit" style="flex: 2;">Проверить решение</button>
          <button id="btn-ai-mentor" style="flex: 1; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: opacity 0.2s;">🤖 AI-Ментор</button>
        </div>
        
        <div id="ai-response-box" style="display: none; background: #1e1b4b; border: 1px solid #4338ca; padding: 15px; border-radius: 8px; color: #e0e7ff; font-size: 13px; line-height: 1.5; max-height: 150px; overflow-y: auto;">
          <strong>💡 Совет AI-ментора:</strong>
          <p id="ai-text" style="margin-top: 5px; white-space: pre-line;"></p>
        </div>

        <div class="test-results" style="margin-top: 10px; display: none; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px;">
          <h3>Результаты тестов:</h3>
          <ul class="results-list" style="list-style: none; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;"></ul>
        </div>
      </div>
    </div>
  `;

  document.getElementById('task-tab-desc').addEventListener('click', () => switchTaskTab('desc'));
  document.getElementById('task-tab-history').addEventListener('click', () => switchTaskTab('history'));
  
  document.getElementById('btn-ai-mentor').addEventListener('click', () => {
    if (jar && activeTask) askGeminiMentor(activeTask, jar.toString());
  });

  updateTaskLeftContent();
}

function switchTaskTab(tab) {
  activeTaskTab = tab;
  document.querySelectorAll('.task-tab-btn').forEach(btn => { btn.style.color = 'var(--text-muted)'; });
  const activeBtn = document.getElementById(`task-tab-${tab}`);
  if (activeBtn) activeBtn.style.color = 'var(--accent)';
  updateTaskLeftContent();
}

function updateTaskLeftContent() {
  const container = document.getElementById('task-left-content');
  if (!container || !activeTask) return;

  if (activeTaskTab === 'desc') {
    container.innerHTML = `<p class="task-description" style="line-height: 1.6; white-space: pre-line; color: var(--text-main);">${activeTask.description}</p>`;
  } else if (activeTaskTab === 'history') {
    const subs = getSubmissions(activeTask.id);
    if (subs.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding-top: 30px;">Вы еще не отправляли решения для этой задачи</div>`;
      return;
    }

    let historyHTML = '<div style="display: flex; flex-direction: column; gap: 10px;">';
    subs.forEach((sub, index) => {
      historyHTML += `
        <div class="submission-item" data-index="${index}" style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 13px; font-weight: bold; color: ${sub.isPassed ? 'var(--success)' : '#ef4444'}">${sub.isPassed ? '● Пройдено успешно' : '❌ Ошибка в тестах'}</span>
            <span style="font-size: 11px; color: var(--text-muted);">${sub.timestamp}</span>
          </div>
          <button style="background: var(--bg-main); border: 1px solid var(--border-color); color: var(--text-main); padding: 4px 10px; font-size: 11px; border-radius: 4px;">Вставить код</button>
        </div>
      `;
    });
    historyHTML += '</div>';
    container.innerHTML = historyHTML;

    container.querySelectorAll('.submission-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = item.dataset.index;
        if (jar) { jar.updateCode(subs[idx].code); switchTaskTab('desc'); }
      });
    });
  }
}

function initCodeJarEditor() {
  const editorElement = workspaceContainer.querySelector('.editor-container');
  if (editorElement) {
    if (jar) { try { jar.destroy(); } catch(e) {} }
    jar = CodeJar(editorElement, editor => Prism.highlightElement(editor));
    const savedData = getTaskProgress(activeTask.id);
    jar.updateCode(savedData ? savedData.code : activeTask.starterCode);

    workspaceContainer.querySelector('.btn-submit').addEventListener('click', () => {
      if (jar && activeTask) runTests(activeTask, jar.toString());
    });
  }
}

async function askGeminiMentor(task, userCode) {
  const apiKey = localStorage.getItem(GEMINI_KEY);
  const aiBox = document.getElementById('ai-response-box');
  const aiText = document.getElementById('ai-text');
  const aiBtn = document.getElementById('btn-ai-mentor');

  if (!apiKey || apiKey.trim() === '') {
    alert('Пожалуйста, сначала укажите ваш API-ключ Gemini в Личном кабинете!');
    return;
  }

  aiBox.style.display = 'block';
  aiText.textContent = '🤖 Думаю над решением... Секунду...';
  aiBtn.disabled = true;
  aiBtn.style.opacity = '0.5';

  const promptText = `
    Ты — опытный ИИ-ментор по программированию на JavaScript. Твоя цель — помочь начинающему разработчику найти ошибку в его коде.
    
    ТРЕБОВАНИЕ: Никогда не давай готовый исправленный код решения! Ограничивайся текстовыми подсказками, указывай на логику, синтаксис или крайние случаи. Говори кратко и по делу.
    
    Задача: "${task.title}"
    Описание задачи: "${task.description}"
    Тест-кейсы для проверки: ${JSON.stringify(task.tests)}
    
    Текущий код пользователя:
    \`\`\`javascript
    ${userCode}
    \`\`\`
    
    Найди ошибку или дай полезный совет по улучшению этого кода, следуя правилу "не спойлерить готовое решение".
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}. Проверьте лимиты ключа или попробуйте VPN (если вы в заблокированном регионе для Google AI).`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    const reply = data.candidates[0].content.parts[0].text;
    aiText.textContent = reply;

  } catch (error) {
    aiText.textContent = `❌ Не удалось получить ответ.\nОшибка: ${error.message}\n\nВозможные причины:\n1. Ключ вставлен не полностью.\n2. Требуется VPN (Google AI Studio официально не работает без него на территории РФ).`;
  } finally {
    aiBtn.disabled = false;
    aiBtn.style.opacity = '1';
  }
}

function runTests(task, userCode) {
  const resultsContainer = workspaceContainer.querySelector('.test-results');
  const resultsList = workspaceContainer.querySelector('.results-list');
  if (!resultsContainer || !resultsList) return;
  
  resultsList.innerHTML = '';
  resultsContainer.style.display = 'block';
  let allTestsPassed = true;

  try {
    const functionNameMatch = task.starterCode.match(/function\s+([a-zA-Z0-9_]+)/);
    if (!functionNameMatch) throw new Error('Не удалось определить имя функции.');
    const functionName = functionNameMatch[1];

    const getTargetFunction = new Function(`${userCode}; return typeof ${functionName} !== 'undefined' ? ${functionName} : null;`);
    const userFunction = getTargetFunction();

    if (!userFunction || typeof userFunction !== 'function') {
      throw new Error(`Функция "${functionName}" не найдена.`);
    }

    task.tests.forEach((test, index) => {
      const inputArgs = JSON.parse(JSON.stringify(test.input)); 
      const actualResult = userFunction(...inputArgs);
      const isPassed = compareResults(actualResult, test.expected);
      if (!isPassed) allTestsPassed = false;

      const li = document.createElement('li');
      li.style.color = isPassed ? 'var(--success)' : '#ef4444';
      li.innerHTML = `<strong>Тест ${index + 1}:</strong> ${isPassed ? '● Пройден' : '❌ Ошибка'}<br><span style="color: var(--text-muted); font-size: 12px;">Вход: ${JSON.stringify(test.input)} | Ожидалось: ${JSON.stringify(test.expected)} | Получено: ${JSON.stringify(actualResult)}</span>`;
      resultsList.appendChild(li);
    });

    if (allTestsPassed) {
      stopTimer();
      checkAchievementsAfterTaskSolved(task.id, secondsElapsed);
    }

    saveSubmission(task.id, userCode, allTestsPassed);
    saveProgress(task.id, userCode, allTestsPassed, secondsElapsed);
    renderTaskList();

    if (activeTaskTab === 'history') updateTaskLeftContent();

  } catch (error) {
    const li = document.createElement('li');
    li.style.color = '#ef4444';
    li.innerHTML = `<strong>Ошибка:</strong> ${error.message}`;
    resultsList.appendChild(li);

    saveSubmission(task.id, userCode, false);
    saveProgress(task.id, userCode, false, secondsElapsed);
    
    if (activeTaskTab === 'history') updateTaskLeftContent();
  }
}

function compareResults(actual, expected) {
  if (Array.isArray(actual) && Array.isArray(expected)) return JSON.stringify(actual) === JSON.stringify(expected);
  return actual === expected;
}

function renderProfile() {
  const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  const allTasks = getAllTasks();
  const solvedTasks = Object.values(progress).filter(p => p.isPassed);
  const solvedCount = solvedTasks.length;
  const totalTasks = allTasks.length;
  const percent = totalTasks > 0 ? Math.round((solvedCount / totalTasks) * 100) : 0;

  const timesArray = solvedTasks.map(p => p.timeSpent).filter(t => t !== null && t > 0);
  const totalTime = timesArray.reduce((sum, current) => sum + current, 0);
  const avgTime = timesArray.length > 0 ? Math.round(totalTime / timesArray.length) : 0;

  const unlockedList = getUnlockedAchievements();
  
  const savedGeminiKey = localStorage.getItem(GEMINI_KEY) || '';

  let achievementsHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = unlockedList.includes(ach.id);
    achievementsHTML += `
      <div style="background: var(--bg-main); padding: 12px; border-radius: 8px; border: 1px solid ${isUnlocked ? 'var(--warning)' : 'var(--border-color)'}; opacity: ${isUnlocked ? '1' : '0.4'}; display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 24px; filter: ${isUnlocked ? 'none' : 'grayscale(100%)'};">${ach.title.split(' ')[0]}</div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-weight: bold; font-size: 13px; color: ${isUnlocked ? 'var(--warning)' : 'var(--text-main)'};">${ach.title.substring(ach.title.indexOf(' ') + 1)}</span>
          <span style="font-size: 11px; color: var(--text-muted); line-height: 1.3;">${ach.description}</span>
        </div>
      </div>
    `;
  });

  workspaceContainer.innerHTML = `
    <div class="profile-layout" style="width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: start;">
      <div class="profile-container" style="display: flex; flex-direction: column; gap: 25px;">
        <div>
          <h2>Кабинет стажёра</h2>
          <p style="color: var(--text-muted);">Твой личный трекер готовности к работе</p>
        </div>

        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px;">
          <h3 style="font-size: 14px; color: var(--accent);">🔑 Настройка ИИ-Ментора (Gemini API)</h3>
          <p style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Ключ сохраняется локально в вашем браузере. Получить бесплатный ключ можно в Google AI Studio.</p>
          <div style="display: flex; gap: 8px;">
            <input type="password" id="gemini-key-input" value="${savedGeminiKey}" placeholder="AIzaSy..." style="flex: 1; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); font-family: monospace; font-size: 13px;">
            <button id="btn-save-gemini-key" style="background: var(--success); color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Сохранить</button>
          </div>
        </div>

        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 25px; border-radius: 12px; display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Статус:</span>
            <span style="color: var(--accent);">${percent === 100 ? 'Junior+' : (percent >= 50 ? 'Junior' : 'Junior-')}</span>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted); margin-bottom: 5px;">
              <span>Выполнено задач: ${solvedCount} из ${totalTasks}</span>
              <span>${percent}%</span>
            </div>
            <div style="width: 100%; height: 10px; background: var(--bg-main); border-radius: 5px; overflow: hidden;">
              <div style="width: ${percent}%; height: 100%; background: var(--success); transition: width 0.3s ease;"></div>
            </div>
          </div>
          <div style="display: flex; gap: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
            <div style="flex: 1; background: var(--bg-main); padding: 12px; border-radius: 8px; text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Фокус</div>
              <div style="font-size: 16px; font-weight: bold; font-family: monospace;">${formatTime(totalTime)}</div>
            </div>
            <div style="flex: 1; background: var(--bg-main); padding: 12px; border-radius: 8px; text-align: center;">
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase;">Ср. скорость</div>
              <div style="font-size: 16px; font-weight: bold; color: var(--warning); font-family: monospace;">${avgTime > 0 ? formatTime(avgTime) : '--:--'}</div>
            </div>
          </div>
        </div>

        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 25px; border-radius: 12px; display: flex; flex-direction: column; gap: 15px;">
          <h3 style="display: flex; justify-content: space-between; align-items: center;">
            🏆 Стена трофеев 
            <span style="font-size: 12px; color: var(--text-muted); font-weight: normal;">Открыто: ${unlockedList.length} из ${ACHIEVEMENTS.length}</span>
          </h3>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${achievementsHTML}
          </div>
        </div>
      </div>

      <div class="constructor-container" style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 25px; border-radius: 12px; display: flex; flex-direction: column; gap: 15px;">
        <h3 style="margin-bottom: 5px;">🛠 FKонструктор задач</h3>
        <form id="create-task-form" style="display: flex; flex-direction: column; gap: 12px;">
          <input type="text" id="new-task-title" placeholder="Название задачи" required style="width: 100%; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main);">
          <textarea id="new-task-desc" placeholder="Описание задачи..." required rows="3" style="width: 100%; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); font-family: inherit; resize: vertical;"></textarea>
          
          <div style="display: flex; gap: 10px;">
            <select id="new-task-diff" style="flex: 1; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main);">
              <option value="easy">Сложность: Легко</option>
              <option value="medium">Сложность: Средне</option>
            </select>
            <input type="text" id="new-task-id" placeholder="Уникальный ID (латиница)" required style="flex: 1; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main);">
          </div>

          <textarea id="new-task-starter" placeholder="Starter code..." required rows="4" style="width: 100%; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); font-family: monospace; font-size: 13px;">function name() {\n\n}</textarea>
          
          <div style="border-top: 1px solid var(--border-color); padding-top: 10px;">
            <h4 style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">Тест-кейсы: <button type="button" id="add-test-btn" style="background: var(--accent); border: none; color: white; padding: 4px 8px; font-size: 11px; border-radius: 4px;">+ Добавить</button></h4>
            <div id="constructor-tests-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto;">
              <div class="test-fields-group" style="display: flex; gap: 8px;">
                <input type="text" placeholder="Вход ех: [2, 3]" required class="test-input" style="flex: 1; padding: 6px 10px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); font-size: 12px;">
                <input type="text" placeholder="Ожидание ех: 5" required class="test-expected" style="flex: 1; padding: 6px 10px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); font-size: 12px;">
              </div>
            </div>
          </div>
          <button type="submit" style="background: var(--success); color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;">🚀 Создать задачу</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-save-gemini-key').addEventListener('click', () => {
    const keyVal = document.getElementById('gemini-key-input').value;
    localStorage.setItem(GEMINI_KEY, keyVal);
    alert('API-ключ Gemini успешно сохранен!');
  });

  const testsListContainer = document.getElementById('constructor-tests-list');
  document.getElementById('add-test-btn').addEventListener('click', () => {
    const testGroup = document.createElement('div');
    testGroup.classList.add('test-fields-group');
    testGroup.style.display = 'flex';
    testGroup.style.gap = '8px';
    testGroup.innerHTML = `
      <input type="text" placeholder="Вход ех: [5, 5]" required class="test-input" style="flex: 1; padding: 6px 10px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); font-size: 12px;">
      <input type="text" placeholder="Ожидание ех: 10" required class="test-expected" style="flex: 1; padding: 6px 10px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); font-size: 12px;">
    `;
    testsListContainer.appendChild(testGroup);
    testsListContainer.scrollTop = testsListContainer.scrollHeight;
  });

  document.getElementById('create-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('new-task-title').value;
    const description = document.getElementById('new-task-desc').value;
    const difficulty = document.getElementById('new-task-diff').value;
    const id = document.getElementById('new-task-id').value;
    const starterCode = document.getElementById('new-task-starter').value;

    const testGroups = document.querySelectorAll('.test-fields-group');
    const tests = [];

    try {
      testGroups.forEach(group => {
        tests.push({
          input: JSON.parse(group.querySelector('.test-input').value),
          expected: JSON.parse(group.querySelector('.test-expected').value)
        });
      });

      const newTask = { id, title, difficulty, description, starterCode, tests };
      saveCustomTask(newTask);
      renderTaskList();
      renderProfile();
    } catch (err) {
      alert('Ошибка при разборе тестов! Убедитесь, что вводите валидный JSON.');
    }
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) btn.classList.add('active');
  });

  if (tabName === 'profile') {
    stopTimer();
    if (jar) { try { jar.destroy(); jar = null; } catch(e) {} }
    document.querySelectorAll('.task-item').forEach(b => b.classList.remove('active'));
    renderProfile();
  } else if (tabName === 'editor') {
    if (activeTask) {
      selectTask(activeTask.id);
    } else {
      workspaceContainer.innerHTML = '<div class="placeholder-content"><h3>Выберите задачу в меню слева</h3></div>';
    }
  }
}

document.getElementById('search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderTaskList();
});

document.querySelectorAll('.btn-filter').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentDifficultyFilter = e.target.dataset.difficulty;
    renderTaskList();
  });
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    switchTab(e.target.dataset.tab);
  });
});

renderTaskList();



const BACKEND_URL = 'http://localhost:5000/api';
let isSignUpMode = false;

const authScreen = document.getElementById('auth-screen');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const authError = document.getElementById('auth-error');

authToggleBtn.addEventListener('click', () => {
  isSignUpMode = !isSignUpMode;
  authError.style.display = 'none';
  authForm.reset();

  if (isSignUpMode) {
    authTitle.textContent = 'Регистрация';
    authSubtitle.textContent = 'Создайте аккаунт, чтобы сохранять прогресс в базе данных';
    authSubmitBtn.textContent = 'Зарегистрироваться';
    authToggleText.textContent = 'Уже есть аккаунт?';
    authToggleBtn.textContent = 'Войти';
  } else {
    authTitle.textContent = 'Вход в Junior Code';
    authSubtitle.textContent = 'Введите свои данные для доступа к платформе';
    authSubmitBtn.textContent = 'Войти';
    authToggleText.textContent = 'Еще нет аккаунта?';
    authToggleBtn.textContent = 'Зарегистрироваться';
  }
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.style.display = 'none';

  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  
  const endpoint = isSignUpMode ? '/auth/register' : '/auth/login';

  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Что-то пошло не так');
    }

    if (isSignUpMode) {
      alert('Регистрация успешна! Теперь вы можете войти.');
      authToggleBtn.click();
    } 
    else {
      localStorage.setItem('junior_code_token', data.token);
      localStorage.setItem('junior_code_user', JSON.stringify(data.user));
  
      checkAuth();
    }

  } 
  catch (err) {
    authError.textContent = `❌ ${err.message}`;
    authError.style.display = 'block';
  }
});

function checkAuth() {
  const token = localStorage.getItem('junior_code_token');
  
  if (token) {
    authScreen.style.display = 'none';
    
    const user = JSON.parse(localStorage.getItem('junior_code_user'));
    const profileHeader = document.querySelector('.profile-container h2');
    if (profileHeader) {
      profileHeader.textContent = `Кабинет стажёра: ${user.username}`;
    }
  } 
  else {
    authScreen.style.display = 'flex';
  }
}

function appendLogoutButton() {
  const profileLayout = document.querySelector('.profile-layout');
  if (profileLayout && !document.getElementById('btn-logout')) {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'btn-logout';
    logoutBtn.textContent = '🚪 Выйти из аккаунта';
    logoutBtn.style = 'background: #ef4444; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 15px; width: 100%;';
    
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('junior_code_token');
      localStorage.removeItem('junior_code_user');
      location.reload();
    });

    const profileContainer = document.querySelector('.profile-container');
    if (profileContainer) profileContainer.appendChild(logoutBtn);
  }
}

checkAuth();

const originalRenderProfile = renderProfile;
renderProfile = function() {
  originalRenderProfile();
  appendLogoutButton();
};