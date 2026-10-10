import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { IamModule } from './iam/iam.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule, AuthModule, IamModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
