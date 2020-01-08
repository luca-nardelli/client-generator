import BaseGenerator from "./BaseGenerator";
import pluralize from "pluralize";
import Handlebars from "handlebars";

Handlebars.registerHelper("toLowerCase", function(str) {
  return str.toLowerCase();
});

Handlebars.registerHelper("pluralize", function(str) {
  return pluralize(str);
});

Handlebars.registerHelper("camelCaseToKebabCase", function(str) {
  return camelCaseToKebabCase(str);
});

Handlebars.registerHelper("camelCaseToSnakeCase", function(str) {
  return camelCaseToSnakeCase(str);
});

export default class AngularGenerator extends BaseGenerator {
  constructor(params) {
    super(params);

    this.registerTemplates(`angular/`, [
      "interface.ts.hbs",
      "foo.service.ts.hbs",
      "utils.ts.hbs"
    ]);
  }

  help(resource) {
    console.log(
      'Angular interface and service for the resource "%s" type has been generated!',
      resource.title
    );
  }

  generate(api, resource, dir) {
    const { fields, imports } = this.parseFields(resource);

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

    // let generics = {};
    // for (const f of fields) {
    //   if (f.reference) {
    //     generics[f.reference.title] = { name: f.reference.title };
    //   }
    // }
    // generics = Object.keys(generics).map(e => generics[e]);
    //
    // dest = `${dir}/interfaces/generic`;
    // this.createDir(dest, false);
    // this.createFile(
    //   "generic-interface.ts.hbs",
    //   `${dest}/${camelCaseToKebabCase(resource.title)}.ts`,
    //   {
    //     fields,
    //     imports,
    //     generics,
    //     title: resource.title,
    //     name: resource.name,
    //   }
    // );

    dest = `${dir}/services`;
    this.createDir(dest, false);
    this.createFile(
      "foo.service.ts.hbs",
      `${dest}/${camelCaseToKebabCase(resource.title)}.service.ts`,
      {
        fields,
        imports,
        title: resource.title,
        name: resource.name,
        resourceFile: "../interfaces/" + camelCaseToKebabCase(resource.title)
      }
    );

    // Other files
    dest = `${dir}/utils`;
    this.createDir(dest, false);
    this.createFile(
      "utils.ts.hbs",
      `${dir}/utils/utils.ts`,
      {
        hydraPrefix: this.hydraPrefix
      },
      false
    );
  }

  getType(field) {
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
      case "http://www.w3.org/2001/XMLSchema#time":
        return "string";
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

  parseFields(resource) {
    const fields = {};

    for (let field of resource.writableFields) {
      fields[field.name] = {
        notrequired: !field.required,
        name: field.name,
        type: this.getReferenceFieldType(field),
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
        type: this.getReferenceFieldType(field),
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
        readonly: false
      };
    }

    // Parse fields to add relevant imports, required for Typescript
    const fieldsArray = Object.keys(fields).map(e => fields[e]);
    const imports = {};

    for (const field of fieldsArray) {
      if (field.reference) {
        imports[field.reference.title] = {
          type: field.reference.title,
          file: "./" + camelCaseToKebabCase(field.reference.title)
        };
      }
    }

    const importsArray = Object.keys(imports).map(e => imports[e]);

    return { fields: fieldsArray, imports: importsArray };
  }

  getReferenceFieldType(field) {
    if (field.maxCardinality === 1) {
      return field.reference
        ? this.getType(field) + " | string"
        : this.getType(field);
    } else {
      return field.reference
        ? this.getType(field) + "[]" + " | string[]"
        : this.getType(field);
    }
  }
}

function camelCaseToKebabCase(val) {
  return val.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function camelCaseToSnakeCase(val) {
  return val.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}
