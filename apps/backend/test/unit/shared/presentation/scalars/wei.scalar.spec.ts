import { Kind } from "graphql";
import { WeiScalar } from "@app/shared/presentation/scalars/wei.scalar";

describe("WeiScalar", () => {
  const scalar = new WeiScalar();

  describe("serialize / parseValue", () => {
    it("accepts a numeric string", () => {
      expect(scalar.serialize("1000000000000000")).toBe("1000000000000000");
      expect(scalar.parseValue("0")).toBe("0");
    });

    it("rejects a non-numeric string", () => {
      expect(() => scalar.serialize("not-a-number")).toThrow(/numeric string/);
    });

    it("rejects a JS number (precision-loss risk is the whole reason this scalar exists)", () => {
      expect(() => scalar.serialize(1000000000000000)).toThrow(/numeric string/);
    });

    it("rejects a negative number string", () => {
      expect(() => scalar.serialize("-5")).toThrow(/numeric string/);
    });
  });

  describe("parseLiteral", () => {
    it("accepts a string literal with numeric content", () => {
      expect(scalar.parseLiteral({ kind: Kind.STRING, value: "42" })).toBe("42");
    });

    it("rejects a non-string literal (e.g. an int literal)", () => {
      expect(() => scalar.parseLiteral({ kind: Kind.INT, value: "42" })).toThrow(/must be a string/);
    });
  });
});
