import mongoose from 'mongoose';
import { createMongoConnectionManager } from '#infrastructure/mongoConnectionManager.js';

const mongoURI = 'mongodb://127.0.0.1:27017/sizod';

const databaseConnection = createMongoConnectionManager({
  connection: mongoose.connection,
  open: (uri) => mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 }),
  label: 'База данных СИЗОД',
});

export const connectDB = () => databaseConnection.connect(mongoURI);
