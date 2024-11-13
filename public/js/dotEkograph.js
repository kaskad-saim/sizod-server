export const renderMonthlyGraph = (labels, values) => {
  const ctx = document.getElementById('monthly-graph-canvas').getContext('2d');

  // Удаляем предыдущий график, если он был нарисован
  if (window.monthlyChart) {
    window.monthlyChart.destroy();
  }

  // Создаем новый график
  window.monthlyChart = new Chart(ctx, {
    type: 'bar', // Столбчатый график
    data: {
      labels: labels, // Дни месяца
      datasets: [{
        label: 'Произведено за день (шт.)',
        data: values, // Значения для каждого дня
        backgroundColor: 'rgba(75, 192, 192, 0.2)', // Цвет столбцов
        borderColor: 'rgba(75, 192, 192, 1)', // Цвет рамки
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true // Начало оси Y с нуля
        }
      }
    }
  });
}


// Функция для рендеринга суточного графика
export const renderHourlyGraph = (labels, values) => {
  const ctx = document.getElementById('hourly-graph-canvas').getContext('2d');

  // Удаляем предыдущий график, если он был нарисован
  if (window.hourlyChart) {
    window.hourlyChart.destroy();
  }

  // Создаем новый график
  window.hourlyChart = new Chart(ctx, {
    type: 'bar', // Столбчатый график
    data: {
      labels: labels, // Часы (например, "14:00", "15:00")
      datasets: [{
        label: 'Произведено за час (шт.)',
        data: values, // Значения для каждого часа
        backgroundColor: 'rgba(54, 162, 235, 0.2)', // Цвет столбцов
        borderColor: 'rgba(54, 162, 235, 1)', // Цвет рамки
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true // Начало оси Y с нуля
        }
      }
    }
  });
};
