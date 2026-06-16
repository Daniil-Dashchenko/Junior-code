// main.js
import { tasks } from './tasks.js';
import { CodeJar } from 'codejar';
import Prism from 'prismjs';

let jar = null;
let activeTask = null;

let currentDifficultyFilter = 'all';
let searchQuery = '';
let currentTab = 'editor';

const taskListContainer = document.querySelector('.task-list');
const workspaceContainer = document.querySelector('.workspace');
const STORAGE_KEY = 'junior_code_progress';

function saveProgress(taskId, code, isPassed) {
  const progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  const oldStatus = progress[taskId]?.isPassed || false;
  progress[taskId] = { code, isPassed: isPassed || oldStatus };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getTaskProgress(taskId) {
  const progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  return progress[taskId] || null;
}


function renderTaskList() {
  taskListContainer.innerHTML = '';

  const filteredTasks = tasks.filter(task => {
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

    taskButton.innerHTML = `
      <span class="task-status ${isSolved ? 'status-success' : ''}" id="status-${task.id}">
        ${isSolved ? '✓' : ''}
      </span>
      <div class="task-info">
        <span class="task-title">${task.title}</span>
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
  document.querySelectorAll('.task-item').forEach(button => {
    button.classList.remove('active');
    if (button.dataset.id === taskId) button.classList.add('active');
  });

  activeTask = tasks.find(task => task.id === taskId);

  if (activeTask && currentTab === 'editor') {
    workspaceContainer.innerHTML = `
      <div class="task-workspace" style="width: 100%; height: 100%; display: flex; flex-direction: column; gap: 20px;">
        <h2>${activeTask.title}</h2>
        <p class="task-description" style="line-height: 1.6;">${activeTask.description}</p>
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
    const functionName = task.id === 'reverse-string' ? 'reverseString' : (task.id === 'filter-array' ? 'filterPositive' : 'factorial');
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

    saveProgress(task.id, userCode, allTestsPassed);
    renderTaskList();

  } 
  catch (error) {
    const li = document.createElement('li');
    li.style.color = '#ef4444';
    li.innerHTML = `<strong>Ошибка:</strong> ${error.message}`;
    resultsList.appendChild(li);
    saveProgress(task.id, userCode, false);
  }
}

function compareResults(actual, expected) {
  if (Array.isArray(actual) && Array.isArray(expected)) return JSON.stringify(actual) === JSON.stringify(expected);
  return actual === expected;
}

function renderProfile() {
  const progress = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  const solvedCount = Object.values(progress).filter(p => p.isPassed).length;
  const totalTasks = tasks.length;
  const percent = totalTasks > 0 ? Math.round((solvedCount / totalTasks) * 100) : 0;

  let rank = 'Начинающий (Junior-)';
  if (percent >= 50) rank = 'Уверенный код-боец (Junior)';
  if (percent === 100) rank = 'Готов к стажировке (Junior+)';

  workspaceContainer.innerHTML = `
    <div class="profile-container" style="width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 30px; text-align: left; align-self: flex-start;">
      <div>
        <h2 style="margin-bottom: 5px;">Кабинет стажёра</h2>
        <p style="color: var(--text-muted);">Твой личный трекер готовности к работе</p>
      </div>

      <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 25px; border-radius: 12px; display: flex; flex-direction: column; gap: 15px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span>Текущий статус:</span>
          <span style="color: var(--accent);">${rank}</span>
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
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <h3>Чек-лист навыков</h3>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 14px;">
          <li style="display: flex; align-items: center; gap: 10px;">
            <span style="color: ${percent >= 33 ? 'var(--success)' : 'var(--text-muted)'};">${percent >= 33 ? '✓' : '○'}</span> 
            Базовые алгоритмы и строки (Разворот строки)
          </li>
          <li style="display: flex; align-items: center; gap: 10px;">
            <span style="color: ${percent >= 66 ? 'var(--success)' : 'var(--text-muted)'};">${percent >= 66 ? '✓' : '○'}</span> 
            Методы перебора массивов (Фильтрация массивов)
          </li>
          <li style="display: flex; align-items: center; gap: 10px;">
            <span style="color: ${percent === 100 ? 'var(--success)' : 'var(--text-muted)'};">${percent === 100 ? '✓' : '○'}</span> 
            Математическая логика и рекурсия (Факториал)
          </li>
        </ul>
      </div>
    </div>
  `;
}

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) btn.classList.add('active');
  });

  if (tabName === 'profile') {
    if (jar) {
      try {
        jar.destroy();
        jar = null;
      }
      catch (error) {

      }
    }

    document.querySelectorAll('.task-item').forEach(b => b.classList.remove('active'));
    renderProfile();
  }
  else if (tabName === 'editor') {
    if (activeTask) {
      selectTask(activeTask.id);
    }
    else {
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