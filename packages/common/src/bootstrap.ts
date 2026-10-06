import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  Type,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, getSchemaPath, SwaggerModule } from "@nestjs/swagger";
import { SESSION_COOKIE } from "@wfh/contracts";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import "reflect-metadata";
import { httpConfig } from "./config";
import { ErrorResponseDto } from "./responses";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body =
      error instanceof HttpException
        ? error.getResponse()
        : "An unexpected error occurred. Please try again.";
    const message =
      typeof body === "string" ? body : (body as { message?: unknown }).message;
    if (status >= 500) {
      new Logger("ApiExceptionFilter").error(
        error instanceof Error ? error.stack : "Unhandled error",
      );
    }
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      ...(typeof body === "object" && "fieldErrors" in body
        ? { fieldErrors: body.fieldErrors }
        : {}),
    });
  }
}

export async function bootstrap(
  module: Type<unknown>,
  title: string,
  port: number,
  docsPath: string,
) {
  const app = await NestFactory.create(module);
  if (httpConfig.trustProxy) {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.headers.origin;
      const expected = httpConfig.origin;
      if (
        (origin && origin !== expected) ||
        req.headers["sec-fetch-site"] === "cross-site"
      ) {
        res.status(403).json({
          statusCode: 403,
          message: "This request origin is not allowed.",
          timestamp: new Date().toISOString(),
        });

        return;
      }
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: errors.flatMap((error) =>
            Object.values(error.constraints || {}),
          ),
          fieldErrors: Object.fromEntries(
            errors.map((error) => [
              error.property,
              Object.values(error.constraints || {}),
            ]),
          ),
        }),
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle(title)
    .setVersion("1.0")
    .addCookieAuth(SESSION_COOKIE)
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto],
  });
  for (const path of Object.values(document.paths)) {
    for (const method of ["get", "post", "patch", "delete"] as const) {
      const operation = path[method];
      if (operation) {
        operation.responses.default = {
          description:
            "Validation, authentication, authorization or service error",
          content: {
            "application/json": {
              schema: { $ref: getSchemaPath(ErrorResponseDto) },
            },
          },
        };
      }
    }
  }
  SwaggerModule.setup(docsPath, app, document);
  app.enableShutdownHooks();
  await app.listen(port, "0.0.0.0");

  return app;
}
