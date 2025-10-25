import mysql from 'mysql2/promise';

const connectDB = async (): Promise<mysql.Connection> => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'has10129656',
      database: process.env.DB_NAME || 'efbctestdb',
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('✅ Connected to MySQL database');
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MySQL:', error);
    throw error;
  }
};

export default connectDB;