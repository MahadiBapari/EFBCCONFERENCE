"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const connectDB = async () => {
    try {
        const connection = await promise_1.default.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'efbcuser',
            password: process.env.DB_PASSWORD || 'efbcpassword',
            database: process.env.DB_NAME || 'efbctestdb',
            port: parseInt(process.env.DB_PORT || '3306')
        });
        console.log('✅ Connected to MySQL database');
        return connection;
    }
    catch (error) {
        console.error('❌ Error connecting to MySQL:', error);
        throw error;
    }
};
exports.default = connectDB;
//# sourceMappingURL=database.js.map