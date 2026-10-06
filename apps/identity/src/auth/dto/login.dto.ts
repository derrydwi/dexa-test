import { ApiProperty } from "@nestjs/swagger";
import type { LoginInput } from "@wfh/contracts";
import { Transform } from "class-transformer";
import { IsEmail, IsString, Length } from "class-validator";

export class LoginDto implements LoginInput {
  @ApiProperty({ example: "employee@wfh.test" })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(3, 254)
  email!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 128)
  password!: string;
}
