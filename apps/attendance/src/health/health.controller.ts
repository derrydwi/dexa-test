import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { InjectDataSource } from "@nestjs/typeorm";
import { HealthResponseDto } from "@wfh/common";
import { DataSource } from "typeorm";

@ApiTags("Health")
@Controller("api/attendance")
export class HealthController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get("health")
  @ApiOkResponse({ type: HealthResponseDto })
  async health() {
    await this.db.query("SELECT 1");

    return { service: "attendance", status: "ok" };
  }
}
