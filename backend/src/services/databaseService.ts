import mysql from 'mysql2/promise';
import connectDB from '../config/database';

export class DatabaseService {
  private connection: mysql.Connection;

  constructor(connection: mysql.Connection) {
    this.connection = connection;
  }

  private async reconnect(): Promise<void> {
    try {
      this.connection = await connectDB();
      console.log('🔄 Reconnected to MySQL');
    } catch (e) {
      console.error('❌ Reconnect failed:', e);
      throw e;
    }
  }

  // Generic query method
  async query(sql: string, values?: any[]): Promise<any> {
    const run = async () => {
      const [rows] = await this.connection.execute(sql, values);
      return rows;
    };
    try {
      return await run();
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase();
      // Auto-reconnect on closed/lost connection and retry once
      if (
        msg.includes('closed state') ||
        msg.includes('cannot enqueue') ||
        msg.includes('protocol_connection_lost') ||
        msg.includes('ecconnreset')
      ) {
        console.warn('⚠️ MySQL connection lost. Attempting reconnect...');
        await this.reconnect();
        return await run();
      }
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Generic insert method
  async insert(table: string, data: Record<string, any>): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `INSERT INTO \`${table}\` (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);
    return result;
  }

  // Generic update method
  async update(table: string, id: number, data: Record<string, any>): Promise<any> {
    // Filter out undefined values but keep null values (for explicit NULL updates)
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        filteredData[key] = value;
      }
    }
    
    if (Object.keys(filteredData).length === 0) {
      console.warn(`[DB UPDATE] No fields to update for ${table} id ${id}`);
      return { affectedRows: 0 };
    }
    
    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
    const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
    
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
    console.log(`[DB UPDATE] Executing: ${sql.substring(0, 200)}...`);
    console.log(`[DB UPDATE] Values count: ${values.length + 1}, ID: ${id}`);
    
    const result = await this.query(sql, [...values, id]);
    // MySQL2 returns [ResultSetHeader, FieldPacket[]] for UPDATE
    const affectedRows = Array.isArray(result) ? (result[0] as any)?.affectedRows : (result as any)?.affectedRows || 0;
    console.log(`[DB UPDATE] Affected rows: ${affectedRows}`);
    return result;
  }

  // Generic delete method
  async delete(table: string, id: number): Promise<any> {
    const sql = `DELETE FROM \`${table}\` WHERE id = ?`;
    const result = await this.query(sql, [id]);
    return result;
  }

  // Generic find by ID method
  async findById(table: string, id: number): Promise<any> {
    const sql = `SELECT * FROM \`${table}\` WHERE id = ?`;
    const result = await this.query(sql, [id]);
    return result[0] || null;
  }

  // Generic find all method with optional conditions
  async findAll(table: string, conditions?: Record<string, any>, limit?: number, offset: number = 0): Promise<any[]> {
    let sql = `SELECT * FROM \`${table}\``;
    const values: any[] = [];

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

  // Count records
  async count(table: string, conditions?: Record<string, any>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM \`${table}\``;
    const values: any[] = [];

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      sql += ` WHERE ${whereClause}`;
      values.push(...Object.values(conditions));
    }

    const result = await this.query(sql, values);
    return result[0].count;
  }

  // Close connection
  async close(): Promise<void> {
    await this.connection.end();
  }
}
