import {
  addGlossaryEntry,
  updateGlossaryEntry,
  removeGlossaryEntry,
  validateGlossaryEntry,
  exportGlossaryToJson,
  importGlossaryFromJson,
  type GlossaryEntry,
} from "../app/tools/document-studio/utils/glossary";

describe("validateGlossaryEntry", () => {
  test("rejects an empty incorrect term", () => {
    expect(validateGlossaryEntry("", "test")).not.toBeNull();
  });

  test("rejects an empty correct term", () => {
    expect(validateGlossaryEntry("test", "")).not.toBeNull();
  });

  test("rejects identical incorrect/correct terms", () => {
    expect(validateGlossaryEntry("same", "same")).not.toBeNull();
  });

  test("accepts a valid, distinct pair", () => {
    expect(validateGlossaryEntry("علي", "علی")).toBeNull();
  });

  test("treats whitespace-only terms as empty", () => {
    expect(validateGlossaryEntry("   ", "test")).not.toBeNull();
  });
});

describe("addGlossaryEntry", () => {
  test("adds a new entry with a generated id", () => {
    const { entries, error } = addGlossaryEntry([], "internet", "انٹرنیٹ");
    expect(error).toBeNull();
    expect(entries).toHaveLength(1);
    expect(entries[0].incorrectTerm).toBe("internet");
    expect(entries[0].correctTerm).toBe("انٹرنیٹ");
    expect(typeof entries[0].id).toBe("string");
  });

  test("trims whitespace from both terms", () => {
    const { entries } = addGlossaryEntry([], "  internet  ", "  انٹرنیٹ  ");
    expect(entries[0].incorrectTerm).toBe("internet");
    expect(entries[0].correctTerm).toBe("انٹرنیٹ");
  });

  test("rejects an invalid pair without modifying entries", () => {
    const original: GlossaryEntry[] = [{ id: "1", incorrectTerm: "a", correctTerm: "b" }];
    const { entries, error } = addGlossaryEntry(original, "same", "same");
    expect(error).not.toBeNull();
    expect(entries).toBe(original);
  });

  test("duplicate handling: adding the same incorrectTerm again UPDATES in place, does not create a second entry", () => {
    const first = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const second = addGlossaryEntry(first.entries, "internet", "انٹرنیٹ نیٹ ورک");
    expect(second.entries).toHaveLength(1);
    expect(second.entries[0].correctTerm).toBe("انٹرنیٹ نیٹ ورک");
    expect(second.entries[0].id).toBe(first.entries[0].id); // same entry, updated
  });

  test("different incorrectTerms produce separate entries", () => {
    const first = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const second = addGlossaryEntry(first.entries, "web", "ویب");
    expect(second.entries).toHaveLength(2);
  });
});

describe("updateGlossaryEntry", () => {
  test("updates an existing entry by id", () => {
    const { entries } = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const result = updateGlossaryEntry(entries, entries[0].id, "internet", "نیٹ", "a note");
    expect(result.error).toBeNull();
    expect(result.entries[0].correctTerm).toBe("نیٹ");
    expect(result.entries[0].note).toBe("a note");
  });

  test("rejects an update that would conflict with another entry's incorrectTerm", () => {
    const step1 = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const step2 = addGlossaryEntry(step1.entries, "web", "ویب");
    const result = updateGlossaryEntry(step2.entries, step2.entries[1].id, "internet", "کچھ اور");
    expect(result.error).not.toBeNull();
    expect(result.entries).toBe(step2.entries);
  });

  test("allows updating an entry's own incorrectTerm to something new and unused", () => {
    const { entries } = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const result = updateGlossaryEntry(entries, entries[0].id, "web", "ویب");
    expect(result.error).toBeNull();
    expect(result.entries[0].incorrectTerm).toBe("web");
  });

  test("rejects an invalid replacement pair", () => {
    const { entries } = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const result = updateGlossaryEntry(entries, entries[0].id, "same", "same");
    expect(result.error).not.toBeNull();
  });
});

describe("removeGlossaryEntry", () => {
  test("removes the entry with the given id", () => {
    const step1 = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const step2 = addGlossaryEntry(step1.entries, "web", "ویب");
    const result = removeGlossaryEntry(step2.entries, step2.entries[0].id);
    expect(result).toHaveLength(1);
    expect(result[0].incorrectTerm).toBe("web");
  });

  test("is a no-op if the id doesn't exist", () => {
    const { entries } = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const result = removeGlossaryEntry(entries, "nonexistent-id");
    expect(result).toEqual(entries);
  });
});

describe("exportGlossaryToJson / importGlossaryFromJson", () => {
  test("round-trips a glossary through export and import unchanged", () => {
    const step1 = addGlossaryEntry([], "internet", "انٹرنیٹ");
    const step2 = addGlossaryEntry(step1.entries, "web", "ویب");
    const json = exportGlossaryToJson(step2.entries);
    const { entries, error } = importGlossaryFromJson(json);
    expect(error).toBeNull();
    expect(entries).toEqual(step2.entries);
  });

  test("rejects non-JSON input", () => {
    const { entries, error } = importGlossaryFromJson("not valid json{{{");
    expect(entries).toEqual([]);
    expect(error).not.toBeNull();
  });

  test("rejects JSON that isn't an array", () => {
    const { entries, error } = importGlossaryFromJson('{"foo": "bar"}');
    expect(entries).toEqual([]);
    expect(error).not.toBeNull();
  });

  test("silently skips individually invalid entries rather than rejecting the whole import", () => {
    const json = JSON.stringify([
      { incorrectTerm: "internet", correctTerm: "انٹرنیٹ" },
      { incorrectTerm: "same", correctTerm: "same" }, // invalid pair
      { incorrectTerm: "web" }, // missing correctTerm
    ]);
    const { entries, error } = importGlossaryFromJson(json);
    expect(error).toBeNull();
    expect(entries).toHaveLength(1);
    expect(entries[0].incorrectTerm).toBe("internet");
  });

  test("generates a fresh id for imported entries missing one", () => {
    const json = JSON.stringify([{ incorrectTerm: "internet", correctTerm: "انٹرنیٹ" }]);
    const { entries } = importGlossaryFromJson(json);
    expect(typeof entries[0].id).toBe("string");
    expect(entries[0].id.length).toBeGreaterThan(0);
  });
});
