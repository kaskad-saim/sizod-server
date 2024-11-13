import { MongoClient } from 'mongodb';

const mongoClient = new MongoClient('mongodb://localhost:27017/');
const dbName = 'sizod';

// Подключение к коллекции DOT-EKO
export const connectToDotEkoDb = async () => {
  await mongoClient.connect();
  console.log('Подключено к MongoDB для DOT-EKO');
  return mongoClient.db(dbName).collection('DOT-EKO');
};

// Подключение к коллекции DOT-PRO
export const connectToDotProDb = async () => {
  await mongoClient.connect();
  console.log('Подключено к MongoDB для DOT-PRO');
  return mongoClient.db(dbName).collection('DOT-PRO');
};