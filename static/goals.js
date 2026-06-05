console.log('goals.js loaded');

let goals = [];

// Глобальные хранилища для справочников
let habitsList = [];
let substancesList = [];
let activityTypesList = [];

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Request failed');
    return data;
}

// ========== ЗАГРУЗКА СПРАВОЧНИКОВ ==========
async function loadHabits() {
    const data = await fetchJSON('/api/habits/list');
    habitsList = data.data;
}

async function loadSubstances() {
    const data = await fetchJSON('/api/biometric_substances/list');
    substancesList = data.data;
}

async function loadActivityTypes() {
    const data = await fetchJSON('/api/biometric/activity/types');
    activityTypesList = data.data;
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ЦЕЛЕЙ ==========
async function loadGoalsWithProgress() {
    try {
        const data = await fetchJSON('/api/goals/progress');
        goals = data.data;
        renderGoals();
    } catch (e) {
        console.error('loadGoals error', e);
        alert('Не удалось загрузить цели');
    }
}

function renderGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    if (goals.length === 0) {
        container.innerHTML = '<div class="empty-state">Нет целей. Создайте первую!</div>';
        return;
    }
    container.innerHTML = goals.map(goal => `
        <div class="goal-card" data-id="${goal.id}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin:0">${escapeHtml(goal.name)}</h3>
                <div>
                    <button class="edit-goal" data-id="${goal.id}">✎</button>
                    <button class="delete-goal" data-id="${goal.id}">🗑</button>
                </div>
            </div>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${goal.percent}%">${goal.percent}%</div>
                </div>
                <div>${goal.current} / ${goal.target}</div>
            </div>
            <div class="goal-meta">
                <strong>Тип:</strong> ${translateType(goal.type)}<br>
                <strong>Ключ:</strong> ${escapeHtml(goal.target_key)}<br>
                <strong>Период:</strong> ${goal.start_date} – ${goal.end_date}<br>
                ${goal.description ? `<strong>Описание:</strong> ${escapeHtml(goal.description)}` : ''}
            </div>
        </div>
    `).join('');

    // Обработчики кнопок редактирования/удаления
    document.querySelectorAll('.edit-goal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            const goal = goals.find(g => g.id === id);
            if (goal) editGoal(goal);
        });
    });
    document.querySelectorAll('.delete-goal').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(btn.dataset.id);
            if (confirm('Удалить цель?')) {
                await fetchJSON(`/api/goals/delete/${id}`, { method: 'DELETE' });
                await loadGoalsWithProgress();
            }
        });
    });
}

function translateType(type) {
    const map = {
        'habit_count': 'Выполнение привычки',
        'habit_streak': 'Стрик привычки',
        'activity_count': 'Повторения упражнения',
        'substance_count': 'Приём добавки'
    };
    return map[type] || type;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showModal() {
    document.getElementById('goalModal').style.display = 'flex';
}
function hideModal() {
    document.getElementById('goalModal').style.display = 'none';
}

function resetForm() {
    document.getElementById('goalId').value = '';
    document.getElementById('goalName').value = '';
    document.getElementById('goalType').value = 'habit_count';
    // targetKeyContainer будет заполнен onGoalTypeChange()
    document.getElementById('targetCount').value = '';
    document.getElementById('startDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('endDate').value = '';
    document.getElementById('goalDesc').value = '';
    // Перестроить интерфейс выбора ключа
    onGoalTypeChange();
}

// Переключение интерфейса в зависимости от типа цели
function onGoalTypeChange() {
    const type = document.getElementById('goalType').value;
    const container = document.getElementById('targetKeyContainer');
    if (!container) return;

    let html = '';
    if (type === 'habit_count' || type === 'habit_streak') {
        html = `<select id="targetKeySelect" class="form-control" required>
                    <option value="">Выберите привычку</option>
                    ${habitsList.map(h => `<option value="habit:${h.id}">${h.name}</option>`).join('')}
                </select>`;
    } else if (type === 'activity_count') {
        html = `<select id="targetKeySelect" class="form-control" required>
                    <option value="">Выберите тип активности</option>
                    ${activityTypesList.map(t => `<option value="activity:${t}">${t}</option>`).join('')}
                </select>`;
    } else if (type === 'substance_count') {
        html = `<select id="targetKeySelect" class="form-control" required>
                    <option value="">Выберите вещество</option>
                    ${substancesList.map(s => `<option value="substance:${s.id}">${s.name}</option>`).join('')}
                </select>`;
    } else {
        html = `<input type="text" id="targetKeySelect" class="form-control" placeholder="тип:значение" required>`;
    }
    container.innerHTML = html;
}

async function saveGoal() {
    const id = document.getElementById('goalId').value;
    const targetKeyEl = document.getElementById('targetKeySelect');
    let targetKey = targetKeyEl ? targetKeyEl.value : '';

    if (!targetKey) {
        alert('Пожалуйста, выберите или введите ключ цели');
        return;
    }

    const data = {
        name: document.getElementById('goalName').value.trim(),
        type: document.getElementById('goalType').value,
        target_key: targetKey,
        target_count: parseInt(document.getElementById('targetCount').value),
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        description: document.getElementById('goalDesc').value
    };

    if (!data.name || !data.target_count || !data.start_date || !data.end_date) {
        alert('Заполните все обязательные поля');
        return;
    }

    try {
        if (id) {
            await fetchJSON(`/api/goals/update/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        } else {
            await fetchJSON('/api/goals/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        }
        await loadGoalsWithProgress();
        hideModal();
        resetForm();
    } catch(e) {
        alert('Ошибка сохранения: ' + e.message);
    }
}

function editGoal(goal) {
    document.getElementById('goalId').value = goal.id;
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalType').value = goal.type;
    // Перестраиваем селект в соответствии с типом
    onGoalTypeChange();
    // Устанавливаем значение после того, как селект отрисовался
    setTimeout(() => {
        const select = document.getElementById('targetKeySelect');
        if (select && goal.target_key) {
            select.value = goal.target_key;
        }
    }, 50);
    document.getElementById('targetCount').value = goal.target_count;
    document.getElementById('startDate').value = goal.start_date;
    document.getElementById('endDate').value = goal.end_date;
    document.getElementById('goalDesc').value = goal.description || '';
    document.getElementById('modalTitle').innerText = 'Редактировать цель';
    showModal();
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    // Загружаем справочники
    await Promise.all([loadHabits(), loadSubstances(), loadActivityTypes()]);
    
    // Загружаем цели
    await loadGoalsWithProgress();
    
    // Кнопка добавления
    document.getElementById('newGoalBtn').addEventListener('click', () => {
        resetForm();
        document.getElementById('modalTitle').innerText = 'Добавить цель';
        showModal();
    });
    
    // Обработка формы
    document.getElementById('goalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveGoal();
    });
    
    // Закрытие модалок
    document.querySelectorAll('.close, #cancelBtn').forEach(btn => {
        btn.addEventListener('click', hideModal);
    });
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) hideModal();
    };
    
    // Смена типа цели -> обновление интерфейса
    document.getElementById('goalType').addEventListener('change', onGoalTypeChange);
    onGoalTypeChange(); // начальное состояние
});