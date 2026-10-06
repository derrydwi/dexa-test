import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  EmployeePageDto,
  Roles,
  RolesGuard,
  UserResponseDto,
} from "@wfh/common";
import { SessionGuard } from "../auth/session.guard";
import {
  CreateEmployeeDto,
  EmployeeQuery,
  UpdateEmployeeDto,
} from "./dto/employee.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("Employees")
@ApiCookieAuth()
@UseGuards(SessionGuard, RolesGuard)
@Roles("HR")
@Controller("api/employees")
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @ApiOkResponse({ type: EmployeePageDto })
  list(@Query() query: EmployeeQuery) {
    return this.employees.list(query);
  }

  @Get(":id")
  @ApiOkResponse({ type: UserResponseDto })
  employee(@Param("id", ParseUUIDPipe) id: string) {
    return this.employees.employee(id);
  }

  @Post()
  @ApiCreatedResponse({ type: UserResponseDto })
  create(@Body() body: CreateEmployeeDto) {
    return this.employees.create(body);
  }

  @Patch(":id")
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateEmployeeDto,
  ) {
    return this.employees.update(id, body);
  }

  @Delete(":id")
  @ApiOkResponse({ type: UserResponseDto })
  deactivate(@Param("id", ParseUUIDPipe) id: string) {
    return this.employees.update(id, { status: "inactive" });
  }
}
