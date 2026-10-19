import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  Patch,
  Req,
} from '@nestjs/common';

import { Request } from 'express';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../iam/guards/jwt-auth/jwt-auth.guard';
import { PasswordChangeGuard } from '../iam/guards/password-change/password-change.guard';
import { Roles } from '../iam/decorators/roles.decorator';
import { RolesGuard } from '../iam/guards/roles/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import { ResetEmployeePasswordDto } from './dto/reset-employee-password.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, PasswordChangeGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    return this.employeesService.update(id, dto, req.user.sub);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.employeesService.updateStatus(id, dto.isActive);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN')
  resetPassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResetEmployeePasswordDto,
  ) {
    return this.employeesService.resetPassword(id, dto.newPassword);
  }
}
