import BaseGenerator from "./BaseGenerator";
import { camelCaseToKebabCase } from "../utils/string";

export default class AngularV2Generator extends BaseGenerator {
  processedResources = [];

  constructor(params) {
    super(params);

    this.registerTemplates(`angular-v2/`, [
      "raw-interface.ts.hbs",
      "interface.ts.hbs",
      "base-resource.service.ts.hbs",
      "foo.service.ts.hbs",
      "serializer.ts.hbs",
      "serializer.metadata.ts.hbs",
      "serializer.service.ts.hbs",
      "utils.ts.hbs"
    ]);
  }

  help(resource) {
    console.log(
      'Angular interface and service for the resource "%s" type has been generated!',
      resource.title
    );
  }

  generateRawInterface(resource, dir) {
    const { fields, imports } = this.parseFields(resource, "raw");

    let dest = `${dir}/raw-interfaces`;
    this.createDir(dest, false);
    this.createFile(
      "raw-interface.ts.hbs",
      `${dest}/${camelCaseToKebabCase(resource.title)}.ts`,
      {
        fields: fields,
        imports: imports,
        title: `Raw${resource.title}`,
        name: resource.name
      }
    );
  }

  generateInterface(resource, dir) {
    const { fields, imports } = this.parseFields(resource, "default");

    let dest = `${dir}/interfaces`;
    this.createDir(dest, false);
    this.createFile(
      "interface.ts.hbs",
      `${dest}/${camelCaseToKebabCase(resource.title)}.ts`,
      {
        fields: fields,
        imports: imports,
        title: resource.title,
        name: resource.name
      }
    );
  }

  generateService(resource, dir) {
    const { fields, imports } = this.parseFields(resource, "default");

    let dest = `${dir}/services`;
    this.createDir(dest, false);
    this.createFile(
      "foo.service.ts.hbs",
      `${dest}/${camelCaseToKebabCase(resource.title)}.service.ts`,
      {
        fields,
        imports,
        title: resource.title,
        name: resource.name,
        resourceFile: camelCaseToKebabCase(resource.title)
      }
    );
  }

  finalize(dir) {
    let dest = `${dir}/utils`;
    this.createDir(dest, false);
    this.createFile(
      "utils.ts.hbs",
      `${dir}/utils/utils.ts`,
      {
        hydraPrefix: this.hydraPrefix
      },
      false
    );
    this.createFile(
      "base-resource.service.ts.hbs",
      `${dir}/utils/base-resource.service.ts`,
      {},
      false
    );
    // Prepare context
    const context = { resources: [] };
    for (const res of this.processedResources) {
      res.interfaceFilename = camelCaseToKebabCase(res.title);
      // eslint-disable-next-line no-unused-vars
      const { fields, imports } = this.parseFields(res);
      res.fields = fields;
      context.resources.push(res);
    }

    dest = `${dir}/serializer`;
    this.createDir(dest, false);
    this.createFile(
      "serializer.ts.hbs",
      `${dest}/serializer.ts`,
      context,
      false
    );
    this.createFile(
      "serializer.service.ts.hbs",
      `${dest}/serializer.service.ts`,
      context,
      false
    );
    this.createFile(
      "serializer.metadata.ts.hbs",
      `${dest}/serializer.metadata.ts`,
      context,
      false
    );
  }

  generate(api, resource, dir) {
    this.generateRawInterface(resource, dir);
    this.generateInterface(resource, dir);
    this.generateService(resource, dir);

    this.processedResources.push(resource);

    // let dest = `${dir}/services`;
    // this.createDir(dest, false);
    // this.createFile(
    //   "foo.service.ts.hbs",
    //   `${dest}/${camelCaseToKebabCase(resource.title)}.service.ts`,
    //   {
    //     fields,
    //     imports,
    //     title: resource.title,
    //     name: resource.name,
    //     resourceFile: "../interfaces/" + camelCaseToKebabCase(resource.title)
    //   }
    // );
  }

  getType(field, mode = "default") {
    if (field.reference) {
      return mode === "raw"
        ? `Raw${field.reference.title}`
        : field.reference.title;
    }

    switch (field.range) {
      case "http://www.w3.org/2001/XMLSchema#integer":
      case "http://www.w3.org/2001/XMLSchema#decimal":
        return "number";
      case "http://www.w3.org/2001/XMLSchema#boolean":
        return "boolean";
      case "http://www.w3.org/2001/XMLSchema#date":
      case "http://www.w3.org/2001/XMLSchema#dateTime":
      case "http://www.w3.org/2001/XMLSchema#time":
        return mode === "raw" ? "string" : "Date";
      case "http://www.w3.org/2001/XMLSchema#string":
        return "string";
    }

    return "any";
  }

  getSerializerType(field) {
    if (field.reference) {
      return field.reference.title;
    }
    switch (field.range) {
      case "http://www.w3.org/2001/XMLSchema#integer":
      case "http://www.w3.org/2001/XMLSchema#decimal":
        return "number";
      case "http://www.w3.org/2001/XMLSchema#boolean":
        return "boolean";
      case "http://www.w3.org/2001/XMLSchema#date":
      case "http://www.w3.org/2001/XMLSchema#dateTime":
        return "date";
      case "http://www.w3.org/2001/XMLSchema#time":
        return "time";
      case "http://www.w3.org/2001/XMLSchema#string":
        return "string";
    }

    return "any";
  }

  getDescription(field) {
    return field.description ? field.description.replace(/"/g, "'") : "";
  }

  parseOperations(resource) {
    const operations = resource.operations;
    console.log(operations);
  }

  parseFields(resource, mode = "default") {
    const fields = {};

    for (let field of resource.writableFields) {
      fields[field.name] = {
        notrequired: !field.required,
        name: field.name,
        type: this.getReferenceFieldType(field, mode),
        serializerType: this.getSerializerType(field),
        description: this.getDescription(field),
        readonly: false,
        reference: field.reference,
        maxCardinality: field.maxCardinality || null
      };
    }

    for (let field of resource.readableFields) {
      if (fields[field.name] !== undefined) {
        continue;
      }

      fields[field.name] = {
        notrequired: !field.required,
        name: field.name,
        type: this.getReferenceFieldType(field, mode),
        serializerType: this.getSerializerType(field),
        description: this.getDescription(field),
        readonly: true,
        reference: field.reference,
        maxCardinality: field.maxCardinality || null
      };
    }

    // If id is not present, add it manually with default values
    if (!("id" in fields)) {
      fields["id"] = {
        notrequired: true,
        name: "id",
        type: "string",
        description: "id field",
        serializerType: "string",
        readonly: false
      };
    }

    // Parse fields to add relevant imports, required for Typescript
    const fieldsArray = Object.keys(fields).map(e => fields[e]);

    // Patch properties for templates
    for (const field of fieldsArray) {
      field.isDate = field.type === "Date";
      field.isMultiple = field.reference && field.maxCardinality !== 1;
    }

    const imports = {};

    for (const field of fieldsArray) {
      if (field.reference) {
        // Ignore self references
        if (field.reference.title === resource.title) {
          continue;
        }
        imports[field.reference.title] = {
          type:
            mode === "raw"
              ? `Raw${field.reference.title}`
              : field.reference.title,
          file: "./" + camelCaseToKebabCase(field.reference.title)
        };
      }
    }

    const importsArray = Object.keys(imports).map(e => imports[e]);

    return { fields: fieldsArray, imports: importsArray };
  }

  getReferenceFieldType(field, mode = "default") {
    if (field.reference) {
      if (mode === "raw") {
        return field.maxCardinality === 1
          ? this.getType(field, mode) + " | string"
          : this.getType(field, mode) + "[]" + " | string[]";
      } else {
        return field.maxCardinality === 1
          ? this.getType(field, mode)
          : this.getType(field, mode) + "[]";
      }
    } else {
      return this.getType(field, mode);
    }
    // if (field.maxCardinality === 1) {
    //   return field.reference
    //     ? this.getType(field) + " | string"
    //     : this.getType(field);
    // } else {
    //   return field.reference
    //     ? this.getType(field) + "[]" + " | string[]"
    //     : this.getType(field);
    // }
  }
}
