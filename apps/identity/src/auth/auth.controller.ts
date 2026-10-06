import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, MessageResponseDto, UserResponseDto } from "@wfh/common";
import type { User } from "@wfh/contracts";
import { SESSION_COOKIE } from "@wfh/contracts";
import type { Request, Response } from "express";
import { identityConfig } from "../config/configuration";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { SessionGuard } from "./session.guard";

@ApiTags("Authentication")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiCreatedResponse({ type: UserResponseDto })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { token, user } = await this.auth.login(body);
    response.cookie(SESSION_COOKIE, token, {
      ...identityConfig.cookie,
      maxAge: identityConfig.sessionLifetimeMs,
    });

    return user;
  }

  @Post("logout")
  @ApiCreatedResponse({ type: MessageResponseDto })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(request.cookies?.[SESSION_COOKIE]);
    response.clearCookie(SESSION_COOKIE, identityConfig.cookie);

    return { message: "Signed out." };
  }

  @Get("me")
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentUser() user: User) {
    return user;
  }
}
