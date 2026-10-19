import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetEmployeePasswordDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
