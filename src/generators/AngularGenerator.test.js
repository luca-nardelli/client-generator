import { Api, Resource, Field } from "@api-platform/api-doc-parser/lib";
import fs from "fs";
import tmp from "tmp";
import AngularGenerator from "./AngularGenerator";

describe("Angular generator test", () => {
  let tmpobj = null;
  beforeEach(() => {
    tmpobj = tmp.dirSync({ unsafeCleanup: true });
  });

  it("Ensure directories exist", () => {
    const generator = new AngularGenerator({
      hydraPrefix: "hydra:",
      templateDirectory: `${__dirname}/../../templates`,
    });

    const fields = [
      new Field("bar", {
        id: "http://schema.org/url",
        range: "http://www.w3.org/2001/XMLSchema#string",
        reference: null,
        required: true,
        description: "An URL",
      }),
    ];
    const resource = new Resource("abc", "http://example.com/foos", {
      id: "foo",
      title: "Foo",
      readableFields: fields,
      writableFields: fields,
    });
    const api = new Api("http://example.com", {
      entrypoint: "http://example.com:8080",
      title: "My API",
      resources: [resource],
    });

    generator.generate(api, resource, tmpobj.name);
    generator.finalize(tmpobj.name);

    expect(fs.existsSync(tmpobj.name + "/interfaces/foo.ts")).toBe(true);
    expect(fs.existsSync(tmpobj.name + "/raw-interfaces/foo.ts")).toBe(true);
    expect(fs.existsSync(tmpobj.name + "/services/foo.service.ts")).toBe(true);

    expect(
      fs.existsSync(tmpobj.name + "/serializer/serializer.metadata.ts")
    ).toBe(true);
    expect(
      fs.existsSync(tmpobj.name + "/serializer/serializer.service.ts")
    ).toBe(true);
    expect(fs.existsSync(tmpobj.name + "/serializer/serializer.ts")).toBe(true);

    expect(fs.existsSync(tmpobj.name + "/utils/base-resource.service.ts")).toBe(
      true
    );
    expect(fs.existsSync(tmpobj.name + "/utils/utils.ts")).toBe(true);
  });

  afterEach(() => {
    tmpobj.removeCallback();
  });
});
