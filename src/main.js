import { tasks } from "./tasks.js";

const taskListContainer = document.querySelector('.task-list');
const workspaceContainer = document.querySelector('.workspace');

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
      <div class="task-workspace" style="width: 100%; height: 100%; display: flex; flex-direction: column; gap: 20px; align-items: flex-start; text-align: left;">
        <h2>${currentTask.title}</h2>
        <p class="task-description" style="line-height: 1.6; color: var(--text-main);">${currentTask.description}</p>
        
        <div class="editor-stub" style="width: 100%; background: var(--bg-card); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; font-family: monospace;">
          <pre>${currentTask.starterCode}</pre>
        </div>
      </div>
    `;
  }
}

renderTaskList();