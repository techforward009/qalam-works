import * as CFB from "cfb";

export function inpageContainer(main: Uint8Array, name = "InPage300"): Buffer {
  const container = CFB.utils.cfb_new();
  CFB.utils.cfb_add(container, "DocumentInfo", Buffer.from([0, 0]));
  CFB.utils.cfb_add(container, name, main);
  return Buffer.from(CFB.write(container, { type: "buffer", fileType: "cfb" }));
}

export function unicodeInpage(stories: string[][], stale = ""): Buffer {
  const encoded = stories.map((story) => story.map((p) => Buffer.from(`${p}\r`, "utf16le")));
  const words = encoded.flatMap((story) => [...story.map((p) => p.length), 0]);
  const table = Buffer.alloc(words.length * 4);
  words.forEach((n, i) => table.writeUInt32LE(n, i * 4));
  const header = Buffer.from([0, 0, 3, 0]);
  return inpageContainer(Buffer.concat([header, table, Buffer.from([255, 255, 255, 255]), ...encoded.flat(), Buffer.from(stale, "utf16le")]));
}

export function legacyInpage(paragraphs: number[][], name = "InPage100"): Buffer {
  const records = paragraphs.flatMap((p) => {
    const bytes = Buffer.from([...p, 13]);
    const length = Buffer.alloc(4);
    length.writeUInt32LE(bytes.length);
    return [length, bytes];
  });
  return inpageContainer(Buffer.concat([Buffer.from([0, 0, 2, 0]), ...records, Buffer.alloc(4)]), name);
}
