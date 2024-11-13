import ModbusRTU from 'modbus-serial';

const modbusClient = new ModbusRTU();
const port = 'COM2';
const baudRate = 57600;

export const readData = async (collection) => {
  try {
    await modbusClient.connectRTUBuffered(port, { baudRate: baudRate });
    modbusClient.setID(0x01);
    console.log('Подключено к устройству с адресом 0x01');

    setInterval(async () => {
      try {
        const rightSkiData = await modbusClient.readHoldingRegisters(0x0002, 1);
        const leftSkiData = await modbusClient.readHoldingRegisters(0x0004, 1);
        const defectData = await modbusClient.readHoldingRegisters(0x0000, 1);
        const defectReportData = await modbusClient.readHoldingRegisters(0x0006, 1);
        const rightSkiReportData = await modbusClient.readHoldingRegisters(0x0008, 1);
        const leftSkiReportData = await modbusClient.readHoldingRegisters(0x000a, 1);
        const shiftTimeData = await modbusClient.readHoldingRegisters(0x000e, 2);
        const workTimeData = await modbusClient.readHoldingRegisters(0x0012, 2);
        const lineStatusData = await modbusClient.readHoldingRegisters(0x004a, 2);
        const rightSkiValue = rightSkiData.data[0];
        const leftSkiValue = leftSkiData.data[0];
        const defectValue = defectData.data[0];
        const defectReportValue = defectReportData.data[0];
        const rightSkiReportValue = rightSkiReportData.data[0];
        const leftSkiReportValue = leftSkiReportData.data[0];

        // Объединяем два регистра в одно значение float для статуса работы линии
        const lineStatusBuffer = Buffer.alloc(4);
        lineStatusBuffer.writeUInt16LE(lineStatusData.data[0], 0);
        lineStatusBuffer.writeUInt16LE(lineStatusData.data[1], 2);
        const lineStatusValue = lineStatusBuffer.readFloatLE(0); // Преобразуем в float

        const shiftTimeBuffer = Buffer.alloc(4);
        shiftTimeBuffer.writeUInt16LE(shiftTimeData.data[0], 0);
        shiftTimeBuffer.writeUInt16LE(shiftTimeData.data[1], 2);
        const shiftTimeValue = shiftTimeBuffer.readFloatLE(0);
        const workTimeBuffer = Buffer.alloc(4);
        workTimeBuffer.writeUInt16LE(workTimeData.data[0], 0);
        workTimeBuffer.writeUInt16LE(workTimeData.data[1], 2);
        const workTimeValue = workTimeBuffer.readFloatLE(0);

        const roundedShiftTime = parseFloat(shiftTimeValue.toFixed(2));
        const roundedWorkTime = parseFloat(workTimeValue.toFixed(2));
        const totalSkiValue = rightSkiValue + leftSkiValue;
        const totalSkiValueReport = rightSkiReportValue + leftSkiReportValue;

        const doc = {
          timestamp: new Date(),
          rightSki: rightSkiValue,
          leftSki: leftSkiValue,
          defect: defectValue,
          defectReport: defectReportValue,
          rightSkiReport: rightSkiReportValue,
          leftSkiReport: leftSkiReportValue,
          shiftTime: roundedShiftTime,
          workTime: roundedWorkTime,
          totalSki: totalSkiValue,
          totalSkiReport: totalSkiValueReport,
          lineStatusValue: lineStatusValue,
          lastUpdated: new Date(), // Время последней записи
        };

        // console.log('Данные', doc);

        await collection.insertOne(doc);
      } catch (err) {
        console.error('Ошибка при чтении данных:', err);
      }
    }, 10000);
  } catch (err) {
    console.error('Ошибка при подключении:', err);
  }
};