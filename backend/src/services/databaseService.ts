import mysql from 'mysql2/promise';

export class DatabaseService {
  private connection: mysql.Connection;

  constructor(connection: mysql.Connection) {
    this.connection = connection;
  }

  // Generic query method
  async query(sql: string, values?: any[]): Promise<any> {
    try {
      const [rows] = await this.connection.execute(sql, values);
      return rows;
    } catch (error) {
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
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
    const result = await this.query(sql, [...values, id]);
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
