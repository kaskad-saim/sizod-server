import moment from 'moment';

// Функция для получения суточного отчета
export const dotEkoReportHour = async (collection) => {
  const startDate = moment().startOf('day').toDate(); // Начало текущего дня (00:00)
  const endDate = moment().toDate(); // Текущая дата и время
  const data = await collection
    .find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .toArray();

  const hourlyData = {};

  data.forEach((entry) => {
    const adjustedHour = moment(entry.timestamp).add(1, 'hours').format('YYYY-MM-DD HH:00');
    if (!hourlyData[adjustedHour]) {
      hourlyData[adjustedHour] = {
        rightSkiReport: [],
        leftSkiReport: [],
        defectReport: [],
        workTime: [],
      };
    }
    hourlyData[adjustedHour].rightSkiReport.push(entry.rightSkiReport);
    hourlyData[adjustedHour].leftSkiReport.push(entry.leftSkiReport);
    hourlyData[adjustedHour].defectReport.push(entry.defect);
    hourlyData[adjustedHour].workTime.push(entry.workTime);
  });

  const result = {};
  for (const hour in hourlyData) {
    const rightSkiValues = hourlyData[hour].rightSkiReport;
    const leftSkiValues = hourlyData[hour].leftSkiReport;
    const defectValues = hourlyData[hour].defectReport;
    const workTimeValues = hourlyData[hour].workTime;
    const maxRightSki = Math.max(...rightSkiValues);
    const minRightSki = Math.min(...rightSkiValues);
    const maxLeftSki = Math.max(...leftSkiValues);
    const minLeftSki = Math.min(...leftSkiValues);
    const maxDefect = Math.max(...defectValues);
    const minDefect = Math.min(...defectValues);
    const totalDefects = maxDefect - minDefect;

    // Вычисляем workTime как разницу между максимальным и минимальным значением
    const maxWorkTime = Math.max(...workTimeValues);
    const minWorkTime = Math.min(...workTimeValues);
    const totalWorkTime = maxWorkTime - minWorkTime;

    result[hour] = {
      rightSki: maxRightSki - minRightSki,
      leftSki: maxLeftSki - minLeftSki,
      totalSki: maxRightSki - minRightSki + (maxLeftSki - minLeftSki),
      defect: totalDefects,
      workTime: totalWorkTime,
    };
  }

  return result;
};

// Функция для получения месячного отчета
export const dotEkoReportMonth = async (collection) => {
  const startDate = moment().startOf('month').toDate(); // Начало текущего месяца (00:00 первого дня)
  const endDate = moment().toDate(); // Текущая дата и время
  const data = await collection
    .find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    })
    .toArray();

  const dailyData = {};

  data.forEach((entry) => {
    const day = moment(entry.timestamp).format('YYYY-MM-DD'); // Форматируем как дату без времени
    if (!dailyData[day]) {
      dailyData[day] = {
        rightSkiReport: [],
        leftSkiReport: [],
        defectReport: [],
        workTime: [],
      };
    }
    dailyData[day].rightSkiReport.push(entry.rightSkiReport);
    dailyData[day].leftSkiReport.push(entry.leftSkiReport);
    dailyData[day].defectReport.push(entry.defect);
    dailyData[day].workTime.push(entry.workTime);
  });

  const result = {};
  for (const day in dailyData) {
    const rightSkiValues = dailyData[day].rightSkiReport;
    const leftSkiValues = dailyData[day].leftSkiReport;
    const defectValues = dailyData[day].defectReport;
    const workTimeValues = dailyData[day].workTime;
    const maxRightSki = Math.max(...rightSkiValues);
    const minRightSki = Math.min(...rightSkiValues);
    const maxLeftSki = Math.max(...leftSkiValues);
    const minLeftSki = Math.min(...leftSkiValues);
    const maxDefect = Math.max(...defectValues);
    const minDefect = Math.min(...defectValues);
    const totalDefects = maxDefect - minDefect;

    // Вычисляем workTime как разницу между максимальным и минимальным значением
    const maxWorkTime = Math.max(...workTimeValues);
    const minWorkTime = Math.min(...workTimeValues);
    const totalWorkTime = maxWorkTime - minWorkTime;

    result[day] = {
      rightSki: maxRightSki - minRightSki,
      leftSki: maxLeftSki - minLeftSki,
      totalSki: maxRightSki - minRightSki + (maxLeftSki - minLeftSki),
      defect: totalDefects,
      workTime: totalWorkTime,
    };
  }

  return result;
};