"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const database_1 = __importDefault(require("../config/database"));
class DatabaseService {
    constructor(connection) {
        this.connection = connection;
    }
    async reconnect() {
        try {
            this.connection = await (0, database_1.default)();
            console.log('🔄 Reconnected to MySQL');
        }
        catch (e) {
            console.error('❌ Reconnect failed:', e);
            throw e;
        }
    }
    async query(sql, values) {
        const run = async () => {
            const [rows] = await this.connection.execute(sql, values);
            return rows;
        };
        try {
            return await run();
        }
        catch (error) {
            const msg = String(error?.message || '').toLowerCase();
            if (msg.includes('closed state') ||
                msg.includes('cannot enqueue') ||
                msg.includes('protocol_connection_lost') ||
                msg.includes('ecconnreset')) {
                console.warn('⚠️ MySQL connection lost. Attempting reconnect...');
                await this.reconnect();
                return await run();
            }
            console.error('Database query error:', error);
            throw error;
        }
    }
    async insert(table, data) {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO \`${table}\` (${columns.join(', ')}) VALUES (${placeholders})`;
        const result = await this.query(sql, values);
        return result;
    }
    async update(table, id, data) {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const setClause = columns.map(col => `${col} = ?`).join(', ');
        const sql = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
        const result = await this.query(sql, [...values, id]);
        return result;
    }
    async delete(table, id) {
        const sql = `DELETE FROM \`${table}\` WHERE id = ?`;
        const result = await this.query(sql, [id]);
        return result;
    }
    async findById(table, id) {
        const sql = `SELECT * FROM \`${table}\` WHERE id = ?`;
        const result = await this.query(sql, [id]);
        return result[0] || null;
    }
    async findAll(table, conditions, limit, offset = 0) {
        let sql = `SELECT * FROM \`${table}\``;
        const values = [];
        if (conditions && Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            values.push(...Object.values(conditions));
        }
        if (limit) {
            const safeLimit = parseInt(String(limit), 10);
            const safeOffset = parseInt(String(offset), 10);
            if (Number.isInteger(safeLimit) && Number.isInteger(safeOffset)) {
                sql += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;
            }
        }
        const result = await this.query(sql, values);
        return result;
    }
    async count(table, conditions) {
        let sql = `SELECT COUNT(*) as count FROM \`${table}\``;
        const values = [];
        if (conditions && Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            values.push(...Object.values(conditions));
        }
        const result = await this.query(sql, values);
        return result[0].count;
    }
    async close() {
        await this.connection.end();
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=databaseService.js.map