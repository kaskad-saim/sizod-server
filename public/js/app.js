import { updateDateTime } from './utils.js';
import { setupModalHandlers } from './modal.js';
import { fetchHourlyReport, fetchMonthlyReport } from './report.js';
import { updateGifStatus } from './lineStatusAnimate.js';
import { fetchHourlyGraph, fetchMonthlyGraph } from './graph.js';

async function fetchData() {
  try {
    const response = await fetch('/api/dot-eko');
    if (!response.ok) {
      throw new Error('Ошибка сети');
    }
    const data = await response.json();

    // для таблицы
    const leftSkiDotEKO = document.getElementById('left-ski-dot-eko');
    const rightSkiDotEKO = document.getElementById('right-ski-dot-eko');
    const totalSkiDotEKO = document.getElementById('total-ski-dot-eko');
    const defectDotEKO = document.getElementById('defect-dot-eko');
    const shiftTimeDotEKO = document.getElementById('shift-time-dot-eko');
    const modeDotEKO = document.getElementById('mode-dot-eko');
    const leftSkireportDotEKO = document.getElementById('left-ski-report-dot-eko');
    const rightSkireportDotEKO = document.getElementById('right-ski-report-dot-eko');
    const totalSkiReportDotEKO = document.getElementById('total-ski-report-dot-eko');
    const defectReportDotEKO = document.getElementById('defect-report-dot-eko');
    const workTimeDotEKO = document.getElementById('work-time-dot-eko');
    const lastUpdatedDotEKO = document.getElementById('last-updated-dot-eko');

    leftSkiDotEKO.textContent = data.leftSki !== undefined ? data.leftSki : 'Нет данных';
    rightSkiDotEKO.textContent = data.rightSki !== undefined ? data.rightSki : 'Нет данных';
    defectDotEKO.textContent = data.defect !== undefined ? data.defect : 'Нет данных';
    shiftTimeDotEKO.textContent = data.shiftTime !== undefined ? data.shiftTime : 'Нет данных';
    totalSkiDotEKO.textContent = data.totalSki !== undefined ? data.totalSki : 'Нет данных';
    leftSkireportDotEKO.textContent = data.leftSkiReport !== undefined ? data.leftSkiReport : 'Нет данных';
    rightSkireportDotEKO.textContent = data.rightSkiReport !== undefined ? data.rightSkiReport : 'Нет данных';
    totalSkiReportDotEKO.textContent = data.totalSkiReport !== undefined ? data.totalSkiReport : 'Нет данных';
    defectReportDotEKO.textContent = data.defectReport !== undefined ? data.defectReport : 'Нет данных';
    workTimeDotEKO.textContent = data.workTime !== undefined ? data.workTime : 'Нет данных';

    // для мнемосхемы
    const leftSkiDotEKOMnemo = document.querySelector('.mnemo-left-ski-dot-eko');
    const rightSkiDotEKOMnemo = document.querySelector('.mnemo-right-ski-dot-eko');
    const totalSkiDotEKOMnemo = document.querySelector('.mnemo-total-ski-dot-eko');
    const defectDotEKOMnemo = document.querySelector('.mnemo-defect-dot-eko');

    leftSkiDotEKOMnemo.textContent = data.leftSki !== undefined ? data.leftSki : 'Нет данных';
    rightSkiDotEKOMnemo.textContent = data.rightSki !== undefined ? data.rightSki : 'Нет данных';
    totalSkiDotEKOMnemo.textContent = data.totalSki !== undefined ? data.totalSki : 'Нет данных';
    defectDotEKOMnemo.textContent = data.defect !== undefined ? data.defect : 'Нет данных';

    // Обработка статуса работы линии и обновление GIF
    modeDotEKO.textContent =
      data.lineStatusValue !== undefined ? (data.lineStatusValue === 1 ? 'работает' : 'стоит') : 'Нет данных';
    updateGifStatus(data.lineStatusValue);
    lastUpdatedDotEKO.textContent = data.lastUpdated ? data.lastUpdated : 'Нет данных';

  } catch (error) {
    console.error('Ошибка при получении данных:', error);
  }
}

// Обновление данных каждые 5 секунд
setInterval(fetchData, 5000);
fetchData(); // Первоначальный вызов для получения данных сразу при загрузке страницы

// Обновление времени каждые 1 секунду
setInterval(updateDateTime, 1000);
updateDateTime(); // Первоначальный вызов для получения текущей даты и времени сразу при загрузке страницы

// Настройка обработчиков модальных окон
setupModalHandlers();

// Обработчик клика по кнопке "Получить часовой отчет"
document.getElementById('dot-eko-hour-report-btn').addEventListener('click', () => {
  fetchHourlyReport();
});

document.getElementById('dot-eko-month-report-btn').addEventListener('click', () => {
  fetchMonthlyReport();
});

document.getElementById('dot-eko-month-graph-btn').addEventListener('click', () => {
  fetchMonthlyGraph();
});

// Обработчик клика по кнопке "Получить суточный график"
document.getElementById('dot-eko-hour-graph-btn').addEventListener('click', () => {
  fetchHourlyGraph();
});
