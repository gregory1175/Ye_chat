import { Module } from '@nestjs/common';

import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../iam/guards/jwt-auth/jwt-auth.guard';
import { PasswordChangeGuard } from '../iam/guards/password-change/password-change.guard';
import { RolesGuard } from '../iam/guards/roles/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, JwtAuthGuard, PasswordChangeGuard, RolesGuard],
})
export class EmployeesModule {}
