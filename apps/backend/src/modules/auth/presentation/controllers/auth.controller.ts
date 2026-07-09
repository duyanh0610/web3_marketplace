import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { RequestNonceUseCase } from "@app/modules/auth/application/request-nonce.use-case";
import { VerifySiweUseCase } from "@app/modules/auth/application/verify-siwe.use-case";
import { RequestNonceDto } from "@app/modules/auth/presentation/dto/request-nonce.dto";
import { VerifySiweDto } from "@app/modules/auth/presentation/dto/verify-siwe.dto";

// Rate-limited (see AuthModule's ThrottlerModule.forRoot) — SIWE nonce
// issuance/verification are exactly the endpoints most attractive to spam
// (each nonce request creates an Account row) per docs/09-security-model.md §4.
@UseGuards(ThrottlerGuard)
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
