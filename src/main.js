// main.js
import { tasks } from './tasks.js';
import { CodeJar } from 'codejar';
import Prism from 'prismjs';

let jar = null;
let activeTask = null;

const taskListContainer = document.querySelector('.task-list');
const workspaceContainer = document.querySelector('.workspace');

function renderTaskList() {
  taskListContainer.innerHTML = '';
  tasks.forEach(task => {
    const taskButton = document.createElement('button');
    taskButton.classList.add('task-item');
    taskButton.dataset.id = task.id;

    taskButton.innerHTML = `
      <span class="task-status" id="status-${task.id}"></span>
      <div class="task-info">
        <span class="task-title">${task.title}</span>
        <span class="task-difficulty ${task.difficulty}">
          ${task.difficulty === 'easy' ? 'Легко' : 'Средне'}
        </span>
      </div>
    `;

    taskButton.addEventListener('click', () => selectTask(task.id));
    taskListContainer.appendChild(taskButton);
  });
}

function selectTask(taskId) {
  document.querySelectorAll('.task-item').forEach(button => {
    button.classList.remove('active');
    if (button.dataset.id === taskId) button.classList.add('active');
  });

  activeTask = tasks.find(task => task.id === taskId);

  if (activeTask) {
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
        if (jar) {
          try { jar.destroy(); } catch(e) {}
        }

        jar = CodeJar(editorElement, editor => Prism.highlightElement(editor));
        jar.updateCode(activeTask.starterCode);

        workspaceContainer.querySelector('.btn-submit').addEventListener('click', () => {
          if (jar && activeTask) {
            runTests(activeTask, jar.toString());
          }
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

    const getTargetFunction = new Function(`
      ${userCode};
      return typeof ${functionName} !== 'undefined' ? ${functionName} : null;
    `);

    const userFunction = getTargetFunction();

    if (!userFunction || typeof userFunction !== 'function') {
      throw new Error(`Функция с именем "${functionName}" не найдена в коде.`);
    }

    task.tests.forEach((test, index) => {
      const inputArgs = JSON.parse(JSON.stringify(test.input)); 
      const actualResult = userFunction(...inputArgs);
      const isPassed = compareResults(actualResult, test.expected);

      if (!isPassed) allTestsPassed = false;

      const li = document.createElement('li');
      li.style.color = isPassed ? 'var(--success)' : '#ef4444';
      li.style.fontSize = '14px';
      li.innerHTML = `
        <strong>Тест ${index + 1}:</strong> ${isPassed ? '● Пройден' : '❌ Ошибка'} <br>
        <span style="color: var(--text-muted); font-size: 12px; margin-left: 15px;">
          Вход: ${JSON.stringify(test.input)} | Ожидалось: ${JSON.stringify(test.expected)} | Получено: ${JSON.stringify(actualResult)}
        </span>
      `;
      resultsList.appendChild(li);
    });

    const statusIcon = document.getElementById(`status-${task.id}`);
    if (statusIcon) {
      if (allTestsPassed) {
        statusIcon.innerHTML = '✓';
        statusIcon.className = 'task-status status-success';
      } else {
        statusIcon.innerHTML = '×';
        statusIcon.className = 'task-status';
        statusIcon.style.borderColor = '#ef4444';
        statusIcon.style.color = '#ef4444';
      }
    }

  } catch (error) {
    const li = document.createElement('li');
    li.style.color = '#ef4444';
    li.innerHTML = `<strong>Ошибка выполнения:</strong> ${error.message}`;
    resultsList.appendChild(li);
  }
}

function compareResults(actual, expected) {
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
  return actual === expected;
}

renderTaskList();