import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('PrismaService');

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    super({ adapter: new PrismaPg(pool) as any });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conectado correctamente a PostgreSQL');
    } catch (error) {
      this.logger.error('Error al conectar con PostgreSQL', String(error));
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexión a PostgreSQL Finalizada');
  }
}
