import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AttendanceRecord, Page, User, workDate } from "@wfh/contracts";
import { randomUUID } from "node:crypto";
import { IsNull, Repository } from "typeorm";
import { PhotosService } from "../photos/photos.service";
import { Attendance } from "./attendance.entity";
import { presentAttendance } from "./attendance.presenter";
import { AttendanceQuery } from "./dto/attendance-query.dto";

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly records: Repository<Attendance>,
    private readonly photos: PhotosService,
  ) {}

  async submit(
    user: User,
    action: "check-in" | "check-out",
    file?: Express.Multer.File,
  ) {
    if (user.role !== "EMPLOYEE") {
      throw new ForbiddenException("Only employees can submit attendance.");
    }
    const filename = await this.photos.save(file);
    try {
      const now = new Date();
      const date = workDate(now);
      const repository = this.records;
      if (action === "check-in") {
        const row = repository.create({
          id: randomUUID(),
          employeeId: user.id,
          employeeCode: user.employeeCode,
          fullName: user.fullName,
          department: user.department,
          workDate: date,
          checkInAt: now,
          checkOutAt: null,
          checkInPhoto: filename,
          checkOutPhoto: null,
        });
        await repository.insert(row);

        return presentAttendance(row, date);
      }
      const record = await repository.findOneBy({
        employeeId: user.id,
        workDate: date,
      });
      if (!record) {
        throw new BadRequestException(
          "Check in today before checking out. Check-out must be on the same WIB date.",
        );
      }
      const result = await repository.update(
        { id: record.id, checkOutAt: IsNull() },
        { checkOutAt: now, checkOutPhoto: filename },
      );
      if (result.affected !== 1) {
        throw new ConflictException("You have already checked out today.");
      }

      return presentAttendance({
        ...record,
        checkOutAt: now,
        checkOutPhoto: filename,
      });
    } catch (error) {
      await this.photos.remove(filename);
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
        throw new ConflictException("You have already checked in today.");
      }
      throw error;
    }
  }

  async list(
    user: User,
    query: AttendanceQuery,
  ): Promise<Page<AttendanceRecord>> {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        "Start date must be on or before end date.",
      );
    }
    if (
      user.role !== "HR" &&
      query.employeeId &&
      query.employeeId !== user.id
    ) {
      throw new ForbiddenException("You can only view your own attendance.");
    }
    const today = workDate();
    const builder = this.records.createQueryBuilder("a");
    if (user.role !== "HR") {
      builder.where("a.employeeId = :id", { id: user.id });
    } else if (query.employeeId) {
      builder.where("a.employeeId = :id", { id: query.employeeId });
    }
    if (query.from) {
      builder.andWhere("a.workDate >= :from", { from: query.from });
    }
    if (query.to) {
      builder.andWhere("a.workDate <= :to", { to: query.to });
    }
    if (query.status === "Completed") {
      builder.andWhere("a.checkOutAt IS NOT NULL");
    }
    if (query.status === "Working") {
      builder.andWhere("a.checkOutAt IS NULL AND a.workDate = :today", {
        today,
      });
    }
    if (query.status === "Incomplete") {
      builder.andWhere("a.checkOutAt IS NULL AND a.workDate < :today", {
        today,
      });
    }
    const [rows, total] = await builder
      .orderBy("a.workDate", "DESC")
      .addOrderBy("a.checkInAt", "DESC")
      .addOrderBy("a.id", "ASC")
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    return {
      items: rows.map((row) => presentAttendance(row, today)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async photo(user: User, id: string, action: string) {
    if (!["check-in", "check-out"].includes(action)) {
      throw new NotFoundException("Photo not found.");
    }
    const record = await this.records.findOneBy({ id });
    if (!record) {
      throw new NotFoundException("Attendance not found.");
    }
    if (user.role !== "HR" && record.employeeId !== user.id) {
      throw new ForbiddenException(
        "You can only view your own attendance photos.",
      );
    }
    const filename =
      action === "check-in" ? record.checkInPhoto : record.checkOutPhoto;
    if (!filename) {
      throw new NotFoundException("Photo not found.");
    }

    return this.photos.path(filename);
  }
}
