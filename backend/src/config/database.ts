import mysql from 'mysql2/promise';

const connectDB = async (): Promise<mysql.Connection> => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'efbcuser',
      password: process.env.DB_PASSWORD || 'efbcpassword',
      database: process.env.DB_NAME || 'railway',
      port: parseInt(process.env.DB_PORT || '3306'),
      decimalNumbers: true  // Returns DECIMAL values as numbers instead of strings
    });

    console.log('✅ Connected to MySQL database');
    return connection;
  } catch (error) {
    console.error('❌ Error connecting to MySQL:', error);
    throw error;
  }
};

export default connectDB;