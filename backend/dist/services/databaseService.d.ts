import mysql from 'mysql2/promise';
export declare class DatabaseService {
    private connection;
    constructor(connection: mysql.Connection);
    private reconnect;
    query(sql: string, values?: any[]): Promise<any>;
    insert(table: string, data: Record<string, any>): Promise<any>;
    update(table: string, id: number, data: Record<string, any>): Promise<any>;
    delete(table: string, id: number): Promise<any>;
    findById(table: string, id: number): Promise<any>;
    findAll(table: string, conditions?: Record<string, any>, limit?: number, offset?: number): Promise<any[]>;
    count(table: string, conditions?: Record<string, any>): Promise<number>;
    close(): Promise<void>;
}
//# sourceMappingURL=databaseService.d.ts.map