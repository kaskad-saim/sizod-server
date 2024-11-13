import { dotEkoReportHour, dotEkoReportMonth } from './dotEkoReport.js'; // Импортируем обе функции
import { openModal } from './modal.js';

// Функция для получения и отображения суточного отчета
export const fetchHourlyReport = async () => {
  const overlay = document.querySelector('.overlay-hour-report');
  const modalReport = document.querySelector('#modal-report-content-hour');

  try {
    overlay.classList.add('active');
    modalReport.style.visibility = 'hidden';

    const response = await fetch(`/api/hourly-report`);
    if (!response.ok) {
      throw new Error('Ошибка сети');
    }

    const report = await response.json();

    setTimeout(() => {
      overlay.classList.remove('active');
      modalReport.style.visibility = 'visible';
      dotEkoReportHour(report); // Отображаем суточный отчет
      openModal('dot-eko-hour-report');
    }, 1000);
  } catch (error) {
    overlay.classList.remove('active');
    console.error('Ошибка при получении часового отчета:', error);
  }
};

// Функция для получения и отображения месячного отчета
export const fetchMonthlyReport = async () => {
  const overlay = document.querySelector('.overlay-month-report');
  const modalReport = document.querySelector('#modal-report-content-month');

  try {
    overlay.classList.add('active');
    modalReport.style.visibility = 'hidden';

    const response = await fetch(`/api/monthly-report`); // Запрос месячного отчета
    if (!response.ok) {
      throw new Error('Ошибка сети');
    }

    const report = await response.json();

    setTimeout(() => {
      overlay.classList.remove('active');
      modalReport.style.visibility = 'visible';
      dotEkoReportMonth(report); // Отображаем месячный отчет
      openModal('dot-eko-month-report'); // Открываем модальное окно для месячного отчета
    }, 1000);
  } catch (error) {
    overlay.classList.remove('active');
    console.error('Ошибка при получении месячного отчета:', error);
  }
};
