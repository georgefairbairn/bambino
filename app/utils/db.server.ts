import { PrismaClient } from '@prisma/client';

let db: PrismaClient;

declare global {
  var __db: PrismaClient | undefined;
}

function initializePrismaClient() {
  const client = new PrismaClient();
  client
    .$connect()
    .then(() => console.log('Connected to the database successfully'))
    .catch(error => {
      console.error('Failed to connect to the database', error);
      throw new Error('Database connection error');
    });
  return client;
}

if (process.env.NODE_ENV === 'production') {
  db = initializePrismaClient();
} else {
  if (!global.__db) {
    global.__db = initializePrismaClient();
  }
  db = global.__db;
}

export { db };
