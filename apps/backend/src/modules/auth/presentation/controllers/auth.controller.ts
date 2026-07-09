import { Body, Controller, Post } from "@nestjs/common";
import { RequestNonceUseCase } from "@app/modules/auth/application/request-nonce.use-case";
import { VerifySiweUseCase } from "@app/modules/auth/application/verify-siwe.use-case";
import { RequestNonceDto } from "@app/modules/auth/presentation/dto/request-nonce.dto";
import { VerifySiweDto } from "@app/modules/auth/presentation/dto/verify-siwe.dto";

@Controller("auth/siwe")
export class AuthController {
  constructor(
    private readonly requestNonce: RequestNonceUseCase,
    private readonly verifySiwe: VerifySiweUseCase,
  ) {}

  @Post("nonce")
  async nonce(@Body() dto: RequestNonceDto) {
    const result = await this.requestNonce.execute(dto.address);
    return { nonce: result.nonce, expiresAt: result.expiresAt.toISOString() };
  }

  @Post("verify")
  async verify(@Body() dto: VerifySiweDto) {
    const result = await this.verifySiwe.execute(dto.message, dto.signature);
    return {
      accessToken: result.accessToken,
      expiresAt: result.expiresAt.toISOString(),
    };
  }
}
