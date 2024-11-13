import ModbusRTU from 'modbus-serial';

const modbusClient = new ModbusRTU();
const ipAddress = '169.254.0.218';
const tcpPort = 7002;
const deviceId = 0x02;

export const readDataDotPro = async (collection) => {
  try {
    await modbusClient.connectTCP(ipAddress, { port: tcpPort });
    modbusClient.setID(deviceId);
    console.log(`Подключено к устройству ${deviceId} по ${ipAddress}:${tcpPort}`);

    setInterval(async () => {
      try {
        if (!modbusClient.isOpen) {
          await modbusClient.connectTCP(ipAddress, { port: tcpPort });
          modbusClient.setID(deviceId);
        }

        // Чтение данных из регистра 0x0004
        const endValueData = await modbusClient.readHoldingRegisters(0x0004, 1);
        const endValue = endValueData.data[0];

        // Чтение данных из регистра 0x0008
        const reportValueData = await modbusClient.readHoldingRegisters(0x0008, 1);
        const reportValue = reportValueData.data[0];

        // Чтение данных из регистра 0x0012 для daylyTimeData
        const daylyTimeData = await modbusClient.readHoldingRegisters(0x000e, 2);
        const daylyTimeBuffer = Buffer.alloc(4);
        daylyTimeBuffer.writeUInt16LE(daylyTimeData.data[0], 0);
        daylyTimeBuffer.writeUInt16LE(daylyTimeData.data[1], 2);
        const daylyTimeValue = parseFloat(daylyTimeBuffer.readFloatLE(0).toFixed(2));

        // Чтение данных из регистра 0x0020 для monthlyTimeData
        const monthlyTimeData = await modbusClient.readHoldingRegisters(0x0012, 2);
        const monthlyTimeBuffer = Buffer.alloc(4);
        monthlyTimeBuffer.writeUInt16LE(monthlyTimeData.data[0], 0);
        monthlyTimeBuffer.writeUInt16LE(monthlyTimeData.data[1], 2);
        const monthlyTimeValue = parseFloat(monthlyTimeBuffer.readFloatLE(0).toFixed(2));

        const doc = {
          timestamp: new Date(),
          endValue: endValue,
          reportValue: reportValue,
          daylyTime: daylyTimeValue,
          monthlyTime: monthlyTimeValue,
          lastUpdated: new Date(),
        };

        await collection.insertOne(doc);
        // console.log(doc);
      } catch (readErr) {
        console.error('Ошибка при чтении данных DOT-PRO:', readErr.message);
      }
    }, 10000); // Интервал 10 секунд

  } catch (err) {
    console.error('Ошибка при подключении к DOT-PRO:', err.message);
  }
};
