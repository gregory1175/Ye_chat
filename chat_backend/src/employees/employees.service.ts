import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const employees = await this.prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        login: true,
        createdAt: true,
        role: {
          select: {
            name: true,
          },
        },
        profile: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            nickname: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return employees.map(({ role, ...employee }) => ({
      ...employee,
      role: role.name,
    }));
  }

  async findOne(id: string) {
    const employee = await this.prisma.user.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        login: true,
        createdAt: true,
        role: {
          select: {
            name: true,
          },
        },
        profile: {
          select: {
            firstName: true,
            lastName: true,
            middleName: true,
            nickname: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const { role, ...employeeData } = employee;

    return {
      ...employeeData,
      role: role.name,
    };
  }
}
