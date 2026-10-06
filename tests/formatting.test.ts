import assert from "node:assert/strict";
import { test } from "node:test";
import { ESLint } from "eslint";
import * as prettier from "prettier";

test("formatting conventions are autofixable, preserve decorators and stay stable", async () => {
  const fixer = new ESLint({ fix: true });
  const checker = new ESLint();
  const filePath = "apps/identity/src/formatting.fixture.ts";
  const source = `import { Controller, Get, Inject } from "@nestjs/common";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
@Controller("fixture") @ApiTags("Fixture")
export class Fixture {
  @ApiProperty() /* keep field comment */ name!: string;
  @ApiProperty() @ApiProperty({ required: false }) optional?: string;
  constructor(@Inject("token") private readonly token: string) {}
  @Get() // keep method comment
  run(flag: boolean) {
    if (flag) return this.token;
    for (const value of [this.name]) console.log(value);
    while (flag) break;
    return this.name;
  }
}
export function sibling() { return "ok"; }
`;
  const [fixed] = await fixer.lintText(source, { filePath });
  assert.deepEqual(fixed.messages, []);
  const formatted = await prettier.format(fixed.output ?? source, {
    ...(await prettier.resolveConfig(filePath)),
    filepath: filePath,
  });

  assert.match(
    formatted,
    /import \{ Controller, Get, Inject \}[^\n]*\nimport \{ ApiProperty, ApiTags \}[^\n]*\n\n@Controller/,
  );
  assert.match(
    formatted,
    /@Controller\("fixture"\)\n@ApiTags\("Fixture"\)\nexport class Fixture/,
  );
  assert.match(
    formatted,
    /@ApiProperty\(\)\n\s*\/\* keep field comment \*\/\s*name!: string;\n\n\s*@ApiProperty\(\)\n\s*@ApiProperty\(\{ required: false \}\)\n\s*optional\?: string;/,
  );
  assert.match(
    formatted,
    /constructor\(@Inject\("token"\) private readonly token: string\) \{\}/,
  );
  assert.match(formatted, /\n\n\s*@Get\(\)\n\s*\/\/ keep method comment/);
  assert.match(formatted, /if \(flag\) \{\n\s*return this.token;\n\s*\}/);
  assert.match(formatted, /for \(const value of \[this.name\]\) \{\n/);
  assert.match(formatted, /while \(flag\) \{\n\s*break;\n\s*\}/);
  assert.match(formatted, /\}\n\n\s*return this.name;/);
  assert.match(formatted, /\n\}\n\nexport function sibling/);

  const [checked] = await checker.lintText(formatted, { filePath });
  assert.deepEqual(checked.messages, []);
  const [second] = await fixer.lintText(formatted, { filePath });
  assert.equal(second.output, undefined);
  assert.equal(
    await prettier.format(formatted, {
      ...(await prettier.resolveConfig(filePath)),
      filepath: filePath,
    }),
    formatted,
  );

  const frontendPath = "apps/web/src/components/formatting.fixture.tsx";
  const [nested] = await checker.lintText(
    "export function Fixture() { function handler() { return 1; } return handler(); }",
    { filePath: frontendPath },
  );
  assert.ok(
    nested.messages.some(
      (message) => message.ruleId === "no-restricted-syntax",
    ),
  );

  const frontendSource = `function helper() { return 1; }
export function Fixture() {
  const handler = () => helper();
  const submit = async () => handler();
  return submit();
}`;
  const [frontend] = await fixer.lintText(frontendSource, {
    filePath: frontendPath,
  });
  assert.deepEqual(frontend.messages, []);
  const [frontendCheck] = await checker.lintText(
    await prettier.format(frontend.output ?? frontendSource, {
      ...(await prettier.resolveConfig(frontendPath)),
      filepath: frontendPath,
    }),
    { filePath: frontendPath },
  );
  assert.deepEqual(frontendCheck.messages, []);
});
