import { IsString, MaxLength, MinLength, NotEquals } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @NotEquals('', { message: 'New password cannot be empty' })
  newPassword!: string;
}
