// Global type declarations for modules without type definitions
declare module 'express' {
  import { Application, Request, Response, NextFunction, Router } from 'express';
  export { Application, Request, Response, NextFunction, Router };
  export default function express(): Application;
}

declare module 'cors' {
  import { Request, Response, NextFunction } from 'express';
  function cors(options?: any): (req: Request, res: Response, next: NextFunction) => void;
  export = cors;
}

declare module 'dotenv' {
  function config(): void;
  export { config };
}

declare module 'mysql2/promise' {
  export interface Connection {
    query(sql: string, values?: any[]): Promise<any>;
    execute(sql: string, values?: any[]): Promise<any>;
    ping(): Promise<void>;
    end(): Promise<void>;
  }
  
  export function createConnection(config: {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
    decimalNumbers?: boolean;  // Returns DECIMAL values as numbers instead of strings
  }): Promise<Connection>;
}

// Node.js global types
declare var process: {
  env: { [key: string]: string | undefined };
  on(event: string, listener: Function): void;
  exit(code: number): void;
};

declare var console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
