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

export default class FlutterDioGenerator extends BaseGenerator {
  processedResources = [];

  constructor(params) {
    super(params);

    this.registerTemplates(`flutter-dio/`, [
      "utils/api-platform.dart.hbs",
      "utils/maker.dart.hbs",
      "models/model.dart.hbs",
      "services/service.dart.hbs"
    ]);
  }

  help(resource) {
    console.log(
      'Flutter files resource "%s" type have been generated!',
      resource.title
    );
  }

  generateUtils(dir) {
    const dest = `${dir}/utils`;
    this.createDir(dest, false);
    this.createFile(
      "utils/api-platform.dart.hbs",
      `${dest}/api-platform.dart`,
      {
        hydraPrefix: this.hydraPrefix
      },
      false
    );
    const resources = this.processedResources.map(res => this.parseFields(res));
    const importsMap = new Map();
    for (const res of resources) {
      for (const importedRes of res.imports) {
        importsMap.set(importedRes.type, importedRes);
      }
    }
    const imports = [...importsMap.values()];
    this.createFile(
      "utils/maker.dart.hbs",
      `${dest}/maker.dart`,
      {
        imports
      },
      false
    );
  }

  finalize(dir) {
    this.generateUtils(dir);
  }

  generate(api, resource, dir) {
    this.processedResources.push(resource);

    const { fields, imports } = this.parseFields(resource);

    let dest = `${dir}/models`;
    this.createDir(dest, false);
    this.createFile(
      "models/model.dart.hbs",
      `${dest}/${camelCaseToKebabCase(resource.prefixedTitle)}.dart`,
      {
        fields: fields,
        imports: imports,
        name: resource.prefixedTitle
      }
    );

    dest = `${dir}/services`;
    this.createDir(dest, false);
    this.createFile(
      "services/service.dart.hbs",
      `${dest}/${camelCaseToKebabCase(resource.prefixedTitle)}.service.dart`,
      {
        fields,
        imports,
        name: resource.title,
        prefixedName: resource.prefixedTitle,
        resourceFile: camelCaseToKebabCase(resource.prefixedTitle) + ".dart"
      }
    );
  }

  getType(field) {
    if (field.reference) {
      return field.reference.prefixedTitle;
    }

    switch (field.range) {
      case "http://www.w3.org/2001/XMLSchema#integer":
        return "num";
      case "http://www.w3.org/2001/XMLSchema#decimal":
        return "num";
      case "http://www.w3.org/2001/XMLSchema#boolean":
        return "bool";
      case "http://www.w3.org/2001/XMLSchema#date":
      case "http://www.w3.org/2001/XMLSchema#dateTime":
      case "http://www.w3.org/2001/XMLSchema#time":
        return "String";
      case "http://www.w3.org/2001/XMLSchema#string":
        return "String";
    }

    return "dynamic";
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
        type: this.getType(field),
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
        type: this.getType(field),
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
        type: "String",
        description: "id field",
        readonly: false
      };
    }

    // Parse fields to add relevant imports
    const fieldsArray = Object.keys(fields).map(e => fields[e]);
    const imports = {};

    for (const field of fieldsArray) {
      if (field.reference) {
        imports[field.reference.prefixedTitle] = {
          type: field.reference.prefixedTitle,
          file: camelCaseToKebabCase(field.reference.prefixedTitle) + ".dart"
        };
      }
    }

    const importsArray = Object.keys(imports).map(e => imports[e]);

    return { fields: fieldsArray, imports: importsArray };
  }
}

function camelCaseToKebabCase(val) {
  return val.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function camelCaseToSnakeCase(val) {
  return val.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}
