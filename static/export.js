// static/export.js

// Инициализация дат
function initDates() {
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);
    
    document.getElementById('endDate').value = endDate;
    document.getElementById('startDate').value = startDate.toISOString().slice(0, 10);
}

// Установка периода в днях
function setDays(days) {
    const today = new Date();
    const endDate = today.toISOString().slice(0, 10);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    document.getElementById('startDate').value = startDate.toISOString().slice(0, 10);
    document.getElementById('endDate').value = endDate;
}

// Установка текущего месяца
function setCurrentMonth() {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('startDate').value = startDate.toISOString().slice(0, 10);
    document.getElementById('endDate').value = endDate.toISOString().slice(0, 10);
}

// Установка прошлого месяца
function setLastMonth() {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    
    document.getElementById('startDate').value = startDate.toISOString().slice(0, 10);
    document.getElementById('endDate').value = endDate.toISOString().slice(0, 10);
}

// Установка "всё время" (по первой записи в БД)
async function setAllTime() {
    try {
        const response = await fetch('/api/completions/list?order_by=date&limit=1');
        const data = await response.json();
        if (data.status === 'success' && data.data && data.data.length > 0) {
            const firstDate = data.data[0].date;
            document.getElementById('startDate').value = firstDate;
            
            const today = new Date();
            document.getElementById('endDate').value = today.toISOString().slice(0, 10);
        } else {
            alert('Нет данных в базе');
        }
    } catch (e) {
        console.error('Error fetching first date:', e);
        alert('Ошибка загрузки дат');
    }
}

// Экспорт в файл
async function doExport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите начальную и конечную дату');
        return;
    }
    
    try {
        const response = await fetch('/api/export/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_date: startDate, end_date: endDate })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `statistics_${startDate}_${endDate}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            const error = await response.json();
            alert('Ошибка: ' + (error.message || 'Неизвестная ошибка'));
        }
    } catch (e) {
        console.error('Export error:', e);
        alert('Ошибка при экспорте: ' + e.message);
    }
}

// Предпросмотр
async function doPreview() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        alert('Пожалуйста, выберите начальную и конечную дату');
        return;
    }
    
    const previewSection = document.getElementById('previewSection');
    const previewContent = document.getElementById('previewContent');
    
    previewSection.style.display = 'block';
    previewContent.innerHTML = '<div class="loading">⏳ Загрузка...</div>';
    
    try {
        const response = await fetch('/api/export/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_date: startDate, end_date: endDate })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            previewContent.textContent = data.report;
        } else {
            previewContent.innerHTML = `<div class="error">❌ ${data.message || 'Ошибка загрузки'}</div>`;
        }
    } catch (e) {
        console.error('Preview error:', e);
        previewContent.innerHTML = `<div class="error">❌ Ошибка: ${e.message}</div>`;
    }
}

// Копирование предпросмотра
function copyPreview() {
    const previewContent = document.getElementById('previewContent');
    const text = previewContent.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyPreviewBtn');
        const originalText = btn.textContent;
        btn.textContent = '✅ Скопировано!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(e => {
        console.error('Copy error:', e);
        alert('Не удалось скопировать');
    });
}

// Инициализация обработчиков
function initEventHandlers() {
    document.getElementById('exportBtn').addEventListener('click', doExport);
    document.getElementById('previewBtn').addEventListener('click', doPreview);
    document.getElementById('copyPreviewBtn').addEventListener('click', copyPreview);
    
    // Быстрые кнопки
    document.querySelectorAll('[data-days]').forEach(btn => {
        btn.addEventListener('click', () => {
            setDays(parseInt(btn.dataset.days));
        });
    });
    
    document.getElementById('currentMonthBtn').addEventListener('click', setCurrentMonth);
    document.getElementById('lastMonthBtn').addEventListener('click', setLastMonth);
    document.getElementById('allTimeBtn').addEventListener('click', setAllTime);
}

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    initDates();
    initEventHandlers();
});