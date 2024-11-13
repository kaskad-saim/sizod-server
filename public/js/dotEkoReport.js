// Функция для отображения суточного отчета (по часам)
export const dotEkoReportHour = (report) => {
  const reportDiv = document.getElementById('modal-report-content-hour');
  reportDiv.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'mnemo__modal-report-table';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  const header = table.createTHead();
  const headerRow = header.insertRow(0);
  const headers = [
    'Время',
    'Конвейер правый (штук)',
    'Конвейер левый (штук)',
    'Сумма (штук)',
    'Время работы (ч)',
    'Брак (штук)',
  ];

  headers.forEach((text) => {
    const cell = document.createElement('th');
    cell.textContent = text;
    cell.className = 'mnemo__modal-report-header';
    headerRow.appendChild(cell);
  });

  let totalRightSki = 0;
  let totalLeftSki = 0;
  let totalSki = 0;
  let totalWorkTime = 0;
  let totalDefect = 0;

  const body = table.createTBody();

  const currentHour = moment().startOf('hour').format('YYYY-MM-DD HH:00');
  const currentTime = moment().format('HH:mm');

  let previousHourShown = false;

  for (const hour in report) {
    const entry = report[hour];
    const row = body.insertRow();

    const isCurrentHour = hour === currentHour;
    const timeLabel = isCurrentHour
      ? hour.split(' ')[1] // Отображаем начало текущего часа
      : previousHourShown
      ? currentTime
      : hour.split(' ')[1]; // Если предыдущий час показан, то отображаем текущее время

    const cellTime = row.insertCell(0);
    cellTime.textContent = timeLabel;
    cellTime.className = 'mnemo__modal-report-cell';

    const cellRight = row.insertCell(1);
    cellRight.textContent = entry.rightSki;
    cellRight.className = 'mnemo__modal-report-cell';
    totalRightSki += entry.rightSki;

    const cellLeft = row.insertCell(2);
    cellLeft.textContent = entry.leftSki;
    cellLeft.className = 'mnemo__modal-report-cell';
    totalLeftSki += entry.leftSki;

    const cellTotal = row.insertCell(3);
    cellTotal.textContent = entry.totalSki;
    cellTotal.className = 'mnemo__modal-report-cell';
    totalSki += entry.totalSki;

    const cellWorkTime = row.insertCell(4);
    cellWorkTime.textContent = entry.workTime.toFixed(2);
    cellWorkTime.className = 'mnemo__modal-report-cell';
    totalWorkTime += entry.workTime;

    const cellDefect = row.insertCell(5);
    cellDefect.textContent = entry.defect;
    cellDefect.className = 'mnemo__modal-report-cell';
    totalDefect += entry.defect;

    if (entry.defect > 0) {
      cellDefect.style.backgroundColor = '#ffcccc';
    }

    if (isCurrentHour) {
      previousHourShown = true;
    }
  }

  const footerRow = body.insertRow();
  footerRow.style.fontWeight = 'bold';

  const cellTotalLabel = footerRow.insertCell(0);
  cellTotalLabel.textContent = 'Итого';
  cellTotalLabel.className = 'mnemo__modal-report-cell';
  cellTotalLabel.style.backgroundColor = 'green';
  cellTotalLabel.style.color = 'white';

  const cellTotalRight = footerRow.insertCell(1);
  cellTotalRight.textContent = totalRightSki;
  cellTotalRight.className = 'mnemo__modal-report-cell';
  cellTotalRight.style.backgroundColor = '#d1f0ff';

  const cellTotalLeft = footerRow.insertCell(2);
  cellTotalLeft.textContent = totalLeftSki;
  cellTotalLeft.className = 'mnemo__modal-report-cell';
  cellTotalLeft.style.backgroundColor = '#d1ffd1';

  const cellTotalSki = footerRow.insertCell(3);
  cellTotalSki.textContent = totalSki;
  cellTotalSki.className = 'mnemo__modal-report-cell';
  cellTotalSki.style.backgroundColor = '#ffcc99';

  const cellTotalWorkTime = footerRow.insertCell(4);
  cellTotalWorkTime.textContent = totalWorkTime.toFixed(2);
  cellTotalWorkTime.className = 'mnemo__modal-report-cell';
  cellTotalWorkTime.style.backgroundColor = '#fffacd';

  const cellTotalDefect = footerRow.insertCell(5);
  cellTotalDefect.textContent = totalDefect;
  cellTotalDefect.className = 'mnemo__modal-report-cell';
  cellTotalDefect.style.backgroundColor = '#ff6666';

  reportDiv.appendChild(table);
};

// Функция для отображения месячного отчета (по дням)
export const dotEkoReportMonth = (report) => {
  const reportDiv = document.getElementById('modal-report-content-month');
  reportDiv.innerHTML = '';

  // Создаем таблицу с классом mnemo__modal-report-table
  const table = document.createElement('table');
  table.className = 'mnemo__modal-report-table';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  // Добавляем заголовок таблицы
  const header = table.createTHead();
  const headerRow = header.insertRow(0);
  const headers = [
    'Дата',
    'Конвейер правый (штук)',
    'Конвейер левый (штук)',
    'Сумма (штук)',
    'Время работы (ч)',
    'Брак (штук)',
  ];

  headers.forEach((text) => {
    const cell = document.createElement('th');
    cell.textContent = text;
    cell.className = 'mnemo__modal-report-header';
    headerRow.appendChild(cell);
  });

  // Функция для безопасного отображения значений, замена null на 'Нет данных'
  const safeValue = (value, defaultValue = 'Нет данных') => {
    return value !== null && value !== undefined ? value : defaultValue;
  };

  // Переменные для итогов
  let totalRightSki = 0;
  let totalLeftSki = 0;
  let totalSki = 0;
  let totalWorkTime = 0;
  let totalDefect = 0;

  // Добавляем строки с данными
  const body = table.createTBody();
  for (const day in report) {
    const entry = report[day];
    const row = body.insertRow();

    const date = new Date(day).toLocaleDateString();
    const cellDate = row.insertCell(0);
    cellDate.textContent = date;
    cellDate.className = 'mnemo__modal-report-cell';

    const cellRight = row.insertCell(1);
    cellRight.textContent = safeValue(entry.rightSki);
    cellRight.className = 'mnemo__modal-report-cell';
    totalRightSki += entry.rightSki || 0;

    const cellLeft = row.insertCell(2);
    cellLeft.textContent = safeValue(entry.leftSki);
    cellLeft.className = 'mnemo__modal-report-cell';
    totalLeftSki += entry.leftSki || 0;

    const cellTotal = row.insertCell(3);
    cellTotal.textContent = safeValue(entry.totalSki);
    cellTotal.className = 'mnemo__modal-report-cell';
    totalSki += entry.totalSki || 0;

    const cellWorkTime = row.insertCell(4);
    cellWorkTime.textContent = safeValue(entry.workTime ? entry.workTime.toFixed(2) : null); // Округляем до 2 знаков
    cellWorkTime.className = 'mnemo__modal-report-cell';
    totalWorkTime += entry.workTime || 0;

    const cellDefect = row.insertCell(5);
    cellDefect.textContent = safeValue(entry.defect);
    cellDefect.className = 'mnemo__modal-report-cell';
    totalDefect += entry.defect || 0;
    if (entry.defect > 0) {
      cellDefect.style.backgroundColor = '#ffcccc';
    }
  }

  // Добавляем итоговую строку
  const footerRow = body.insertRow();
  footerRow.style.fontWeight = 'bold';

  const cellTotalLabel = footerRow.insertCell(0);
  cellTotalLabel.textContent = 'Итого';
  cellTotalLabel.className = 'mnemo__modal-report-cell';
  cellTotalLabel.style.backgroundColor = 'green';
  cellTotalLabel.style.color = 'white';

  const cellTotalRight = footerRow.insertCell(1);
  cellTotalRight.textContent = totalRightSki;
  cellTotalRight.className = 'mnemo__modal-report-cell';
  cellTotalRight.style.backgroundColor = '#d1f0ff';

  const cellTotalLeft = footerRow.insertCell(2);
  cellTotalLeft.textContent = totalLeftSki;
  cellTotalLeft.className = 'mnemo__modal-report-cell';
  cellTotalLeft.style.backgroundColor = '#d1ffd1';

  const cellTotalSki = footerRow.insertCell(3);
  cellTotalSki.textContent = totalSki;
  cellTotalSki.className = 'mnemo__modal-report-cell';
  cellTotalSki.style.backgroundColor = '#ffcc99';

  const cellTotalWorkTime = footerRow.insertCell(4);
  cellTotalWorkTime.textContent = totalWorkTime.toFixed(2);
  cellTotalWorkTime.className = 'mnemo__modal-report-cell';
  cellTotalWorkTime.style.backgroundColor = '#fffacd';

  const cellTotalDefect = footerRow.insertCell(5);
  cellTotalDefect.textContent = totalDefect;
  cellTotalDefect.className = 'mnemo__modal-report-cell';
  cellTotalDefect.style.backgroundColor = '#ff6666';

  // Добавляем таблицу в контейнер
  reportDiv.appendChild(table);
};