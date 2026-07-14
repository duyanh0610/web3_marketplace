import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PinStatusCheckerPort } from "@app/modules/metadata/application/ports/pin-status-checker.port";

const PINATA_V3_FILES_URL = "https://api.pinata.cloud/v3/files/public";

interface PinataV3FilesResponse {
  data: { files: { cid: string }[] };
}

@Injectable()
export class PinataPinStatusChecker implements PinStatusCheckerPort {
  private readonly jwt: string;

  constructor(configService: ConfigService) {
    this.jwt = configService.getOrThrow<string>("PINATA_JWT");
  }

  async isPinned(cid: string): Promise<boolean> {
    const response = await fetch(`${PINATA_V3_FILES_URL}?cid=${encodeURIComponent(cid)}&limit=1`, {
      headers: { Authorization: `Bearer ${this.jwt}` },
    });

    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as PinataV3FilesResponse;
    return body.data.files.length > 0;
  }
}
