import { tasks } from "./tasks.js";
import { CodeJar } from "codejar";
import Prism from 'prismjs';

const taskListContainer = document.querySelector('.task-list');
const workspaceContainer = document.querySelector('.workspace');

let jar = null;
let currentCode = '';

function renderTaskList() {
  taskListContainer.innerHTML = '';

  tasks.forEach(task => {
    const taskButton = document.createElement('button');
    taskButton.classList.add('task-item');
    taskButton.dataset.id = task.id;

    taskButton.innerHTML = `
      <span class="task-status"></span>
      <div class="task-info">
        <span class="task-title">${task.title}</span>
        <span class="task-difficulty ${task.difficulty}">
          ${task.difficulty === 'easy' ? 'Легко' : 'Средне'}
        </span>
      </div>
    `;
    
    taskButton.addEventListener('click', () => selectTask(task.id));

    taskListContainer.appendChild(taskButton);

  })
}

function selectTask(taskId) {
  document.querySelectorAll('.task-item').forEach(button => {
    button.classList.remove('active');
    if (button.dataset.id === taskId) {
      button.classList.add('active');
    }
  });

  const currentTask = tasks.find(task => task.id === taskId);

  if (currentTask) {
    workspaceContainer.innerHTML = `
      <div class="task-workspace" style="width: 100%; height: 100%; display: flex; flex-direction: column; gap: 20px;">
        <h2>${currentTask.title}</h2>
        <p class="task-description" style="line-height: 1.6;">${currentTask.description}</p>
        <div class="editor-container language-js"></div>
        <button class="btn-submit">Проверить решение</button>
      </div>
    `;

    setTimeout(() => {
      const editorElement = document.querySelector('.editor-container');
      
      if (editorElement) {
        if (jar) {
          try { jar.destroy(); } catch(e) {}
        }

        jar = CodeJar(editorElement, withLineNumbers(Prism.highlightElement));
        jar.updateCode(currentTask.starterCode);

        document.querySelector('.btn-submit').addEventListener('click', () => {
          const userCode = jar.toString();
          console.log('Код отправлен на проверку:', userCode);
        });
      }
    }, 0);
  }
}

function withLineNumbers(higlight) {
  return editor => {
    higlight(editor);
  }
}

renderTaskList();