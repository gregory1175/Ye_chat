/// <reference types="node" />

import 'dotenv/config';
import {
  defineConfig as prismaDefineConfig,
  env as prismaEnv,
} from 'prisma/config';
import type { PrismaConfig } from 'prisma/config';

// типизируем функцию defineConfig и env, чтобы избежать ошибок типов в TypeScript

const defineConfig = prismaDefineConfig as (
  config: PrismaConfig,
) => PrismaConfig;

const env = prismaEnv as (name: string) => string;

// конфигурация Prisma

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
