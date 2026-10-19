import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../iam/guards/jwt-auth/jwt-auth.guard';
import { PasswordChangeGuard } from '../iam/guards/password-change/password-change.guard';
import { Roles } from '../iam/decorators/roles.decorator';
import { RolesGuard } from '../iam/guards/roles/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';

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
}
