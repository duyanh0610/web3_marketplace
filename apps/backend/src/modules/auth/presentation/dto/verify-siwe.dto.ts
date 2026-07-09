import { IsString, MinLength } from "class-validator";

export class VerifySiweDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsString()
  @MinLength(1)
  signature!: string;
}
