import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  AttendancePageDto,
  AttendanceResponseDto,
  CurrentUser,
  Roles,
  RolesGuard,
} from "@wfh/common";
import type { User } from "@wfh/contracts";
import type { Response } from "express";
import { IdentityGuard } from "../identity-client/identity.guard";
import { MAX_PHOTO_BYTES } from "../photos/photos.service";
import { AttendanceService } from "./attendance.service";
import { AttendanceQuery } from "./dto/attendance-query.dto";

const photoSchema = {
  type: "object",
  required: ["photo"],
  properties: { photo: { type: "string", format: "binary" } },
};
const photoInterceptor = FileInterceptor("photo", {
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 },
});

@ApiTags("Attendance")
@ApiCookieAuth()
@UseGuards(IdentityGuard, RolesGuard)
@Controller("api/attendance")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  @ApiOkResponse({ type: AttendancePageDto })
  list(@CurrentUser() user: User, @Query() query: AttendanceQuery) {
    return this.attendance.list(user, query);
  }

  @Post("check-in")
  @Roles("EMPLOYEE")
  @ApiCreatedResponse({ type: AttendanceResponseDto })
  @UseInterceptors(photoInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: photoSchema })
  checkIn(
    @CurrentUser() user: User,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.attendance.submit(user, "check-in", photo);
  }

  @Post("check-out")
  @Roles("EMPLOYEE")
  @ApiCreatedResponse({ type: AttendanceResponseDto })
  @UseInterceptors(photoInterceptor)
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: photoSchema })
  checkOut(
    @CurrentUser() user: User,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.attendance.submit(user, "check-out", photo);
  }

  @Get(":id/photos/:action")
  @ApiOkResponse({
    schema: { type: "string", format: "binary" },
    description: "Authenticated JPEG attendance evidence",
  })
  async photo(
    @CurrentUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("action") action: string,
    @Res() res: Response,
  ) {
    const path = await this.attendance.photo(user, id, action);
    res.setHeader("Content-Type", "image/jpeg");
    res.sendFile(
      path,
      { headers: { "Cache-Control": "no-store" } },
      (error) => {
        if (error && !res.headersSent) {
          res.status(404).type("application/json").json({
            statusCode: 404,
            message: "Photo file is unavailable.",
            timestamp: new Date().toISOString(),
          });
        }
      },
    );
  }
}
