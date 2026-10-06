import { randomUUID } from "node:crypto";
import { hashPassword } from "../auth/password";
import { Employee } from "../employees/employee.entity";
import { database } from "./data-source";

async function main() {
  await database.initialize();
  try {
    const password = process.env.DEMO_PASSWORD || "DemoPass123!";
    if (password.length < 10 || password.length > 128) {
      throw new Error("DEMO_PASSWORD must be 10–128 characters.");
    }
    const accounts = [
      {
        employeeCode: "HR-001",
        fullName: "Jordan Lee",
        email: "hr@wfh.test",
        department: "People & Culture",
        jobTitle: "HR Administrator",
        role: "HR" as const,
      },
      {
        employeeCode: "EMP-001",
        fullName: "Alex Morgan",
        email: "employee@wfh.test",
        department: "Engineering",
        jobTitle: "Software Engineer",
        role: "EMPLOYEE" as const,
      },
      {
        employeeCode: "EMP-002",
        fullName: "Sam Taylor",
        email: "sam@wfh.test",
        department: "Product",
        jobTitle: "Product Designer",
        role: "EMPLOYEE" as const,
      },
    ];
    for (const account of accounts) {
      if (
        await database
          .getRepository(Employee)
          .existsBy({ email: account.email })
      ) {
        console.log(`Kept existing account: ${account.email}`);
        continue;
      }
      await database.getRepository(Employee).save({
        ...account,
        id: randomUUID(),
        passwordHash: await hashPassword(password),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Created demo account: ${account.email}`);
    }
  } finally {
    await database.destroy();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
