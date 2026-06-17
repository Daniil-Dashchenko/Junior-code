import { tasks } from './tasks.js';
import { CodeJar } from 'codejar';
import Prism from 'prismjs';

let jar = null;
let activeTask = null;

let currentDifficultyFilter = 'all';
let searchQuery = '';
let currentTab = 'editor';

let timerInterval = null;
let secondElapsed = 0;

const taskListContainer = document.querySelector('.task-list');
const workspaceContainer = document.querySelector('.workspace');

const PROGRESS_KEY = 'junior_code_progress';
const CUSTOM_TASKS_KEY = 'junior_code_custom_tasks';
const ACHIEVEMENTS_KEY = 'junior_code_achievements';

const ACHIEVEMENTS = [
  {
    id: 'first-blood',
    title: '🥇 Первая кровь',
    description: 'Реши свою самую первую задачу на платформе.'
  },
  {
    id: 'speed-demon',
    title: '⚡ Демон скорости',
    description: 'Реши любую задачу быстрее чем за 30 секунд.'
  },
  {
    id: 'night-owl',
    title: '🦉 Полуночный кодер',
    description: 'Отправь успешное решение в ночное время (с 22:00 до 06:00).'
  },
  {
    id: 'creator',
    title: '🛠 На все руки мастер',
    description: 'Создай свою собственную задачу в конструкторе.'
  },
  {
    id: 'perfectionist',
    title: '🏆 Перфекционист',
    description: 'Успешно реши задачу, которую ты создал сам.'
  }
];

function getAllTasks() {
  const customTasks = JSON.parse(localStorage.getItem(CUSTOM_TASKS_KEY)) || [];
  return [...tasks, ...customTasks];
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
    if (ach) showAchievementToasts(ach);
  } 
}

function showAchievementToasts(achievement) {
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
      @keyframes slideIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(20px); }
      }
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

  if (solvedTasks.length === 1) {
    unlockAchievement('first-blood');
  }

  if (timeSpent !== null && timeSpent < 30) {
    unlockAchievement('speed-demon');
  }

  const currentHour = new Date().getHours();
  if (currentHour >= 22 || currentHour < 6) {
    unlockAchievement('night-owl');
  }

  const isCustom = !tasks.some(t => t.id === taskId);
  if (isCustom) {
    unlockAchievement('perfectionist');
  }
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

function saveCustomTask(newTask) {
  const customTasks = JSON.parse(localStorage.getItem(CUSTOM_TASKS_KEY)) || [];
  customTasks.push(newTask);
  localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(customTasks));

  unlockAchievement('creator');
}

function getTaskProgress(taskId) {
  const progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  return progress[taskId] || null;
}


function startTimer() {
  stopTimer();
  secondElapsed = 0;
  
  const timerElement = document.getElementById('task-timer');
  if (timerElement) timerElement.textContent = formatTime(secondElapsed);

  timerInterval = setInterval(() => {
    secondElapsed++;
    const timerDisplay = document.getElementById('task-timer');
    if (timerDisplay) {
      timerDisplay.textContent = formatTime(secondElapsed);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
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
    const isCustom = !tasks.some(t => t.id === task.id);

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
    workspaceContainer.innerHTML = `
      <div class="task-workspace" style="width: 100%; height: 100%; display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <h2>${activeTask.title}</h2>
          <div style="background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 6px 14px; border-radius: 20px; font-family: monospace; font-size: 14px; color: var(--warning); display: flex; align-items: center; gap: 6px;">
            ⏱ <span id="task-timer">00:00</span>
          </div>
        </div>
        <p class="task-description" style="line-height: 1.6; white-space: pre-line;">${activeTask.description}</p>
        <div class="editor-container language-js"></div>
        <button class="btn-submit">Проверить решение</button>
        <div class="test-results" style="margin-top: 10px; display: none; background: var(--bg-sidebar); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px;">
          <h3>Результаты тестов:</h3>
          <ul class="results-list" style="list-style: none; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;"></ul>
        </div>
      </div>
    `;

    setTimeout(() => {
      const editorElement = workspaceContainer.querySelector('.editor-container');
      if (editorElement) {
        if (jar) { try { jar.destroy(); } catch(e) {} }
        jar = CodeJar(editorElement, editor => Prism.highlightElement(editor));
        
        const savedData = getTaskProgress(activeTask.id);
        jar.updateCode(savedData ? savedData.code : activeTask.starterCode);

        startTimer();

        workspaceContainer.querySelector('.btn-submit').addEventListener('click', () => {
          if (jar && activeTask) runTests(activeTask, jar.toString());
        });
      }
    }, 0);
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
      checkAchievementsAfterTaskSolved(task.id, secondElapsed);
    }

    saveProgress(task.id, userCode, allTestsPassed, secondElapsed);
    renderTaskList();

  } 
  catch (error) {
    const li = document.createElement('li');
    li.style.color = '#ef4444';
    li.innerHTML = `<strong>Ошибка:</strong> ${error.message}`;
    resultsList.appendChild(li);
    saveProgress(task.id, userCode, false, secondElapsed);
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

  let achievementsHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = unlockedList.includes(ach.id);
    achievementsHTML += `
      <div style="background: var(--bg-main); padding: 12px; border-radius: 8px; border: 1px solid ${isUnlocked ? 'var(--warning)' : 'var(--border-color)'}; opacity: ${isUnlocked ? '1' : '0.4'}; display: flex; align-items: center; gap: 15px; transition: all 0.3s;">
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
          <h2 style="margin-bottom: 5px;">Кабинет стажёра</h2>
          <p style="color: var(--text-muted);">Твой личный трекер готовности к работе</p>
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
        <h3 style="margin-bottom: 5px;">🛠 Конструктор задач</h3>
        <form id="create-task-form" style="display: flex; flex-direction: column; gap: 12px;">
          <input type="text" id="new-task-title" placeholder="Название задачи (например: Сумма двух чисел)" required style="width: 100%; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main);">
          <textarea id="new-task-desc" placeholder="Описание задачи..." required rows="3" style="width: 100%; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); font-family: inherit; resize: vertical;"></textarea>
          
          <div style="display: flex; gap: 10px;">
            <select id="new-task-diff" style="flex: 1; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main);">
              <option value="easy">Сложность: Легко</option>
              <option value="medium">Сложность: Средне</option>
            </select>
            <input type="text" id="new-task-id" placeholder="Уникальный ID (латиница)" required style="flex: 1; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main);">
          </div>

          <textarea id="new-task-starter" placeholder="Starter code..." required rows="4" style="width: 100%; padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-main); font-family: monospace; font-size: 13px;"></textarea>
          
          <div style="border-top: 1px solid var(--border-color); padding-top: 10px;">
            <h4 style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              Тест-кейсы:
              <button type="button" id="add-test-btn" style="background: var(--accent); border: none; color: white; padding: 4px 8px; font-size: 11px; border-radius: 4px; cursor: pointer;">+ Добавить тест</button>
            </h4>
            <div id="constructor-tests-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; padding-right: 5px;">
              <div class="test-fields-group" style="display: flex; gap: 8px;">
                <input type="text" placeholder="Вход ех: [2, 3]" required class="test-input" style="flex: 1; padding: 6px 10px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); font-size: 12px;">
                <input type="text" placeholder="Ожидание ех: 5" required class="test-expected" style="flex: 1; padding: 6px 10px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); font-size: 12px;">
              </div>
            </div>
          </div>

          <button type="submit" style="background: var(--success); color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 5px;">🚀 Создать задачу</button>
        </form>
      </div>

    </div>
  `;

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
    } 
    catch (err) {
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