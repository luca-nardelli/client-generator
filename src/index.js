#!/usr/bin/env node

import "isomorphic-fetch";
import program from "commander";
import parseHydraDocumentation from "@api-platform/api-doc-parser/lib/hydra/parseHydraDocumentation";
import parseSwaggerDocumentation from "@api-platform/api-doc-parser/lib/swagger/parseSwaggerDocumentation";
import parseOpenApi3Documentation from "@api-platform/api-doc-parser/lib/openapi3/parseOpenApi3Documentation";
import { version } from "../package.json";
import generators from "./generators";
import fs from "fs";

program
  .version(version)
  .description(
    "Generate a CRUD application built with React, Redux and React Router from an Hydra-enabled API"
  )
  .usage("entrypoint outputDirectory")
  .option(
    "-r, --resource [resourceName]",
    "Generate CRUD for the given resource"
  )
  .option(
    "-p, --hydra-prefix [hydraPrefix]",
    "The hydra prefix used by the API",
    "hydra:"
  )
  .option("--username [username]", "Username for basic auth (Hydra only)")
  .option("--password [password]", "Password for basic auth (Hydra only)")
  .option(
    "--resource-prefix [resourcePrefix]",
    "Prefix to append for generated resources (useful to avoid naming conflicts)"
  )
  .option(
    "--dump-schema [schemaFile]",
    "Dump API resources to schema file schemaFile"
  )
  .option(
    "--patch-schema [schemaFile]",
    "Patches the API resource schema using the provided schemaFile"
  )
  .option("--username [username]", "Username for basic auth (Hydra only)")
  .option("--password [password]", "Password for basic auth (Hydra only)")
  .option(
    "-g, --generator [generator]",
    'The generator to use, one of "react", "react-native", "vue", "admin-on-rest", "typescript", "next", "angular", "vue-plugin-axios", "flutter-dio"',
    "react"
  )
  .option(
    "-t, --template-directory [templateDirectory]",
    "The templates directory base to use. Final directory will be ${templateDirectory}/${generator}",
    `${__dirname}/../templates/`
  )
  .option("-f, --format [hydra|swagger]", '"hydra" or "swagger', "hydra")
  .option(
    "-s, --server-path [serverPath]",
    "Path to express server file to allow route dynamic addition (Next.js generator only)"
  )
  .parse(process.argv);

if (
  2 !== program.args.length &&
  (!process.env.API_PLATFORM_CLIENT_GENERATOR_ENTRYPOINT ||
    !process.env.API_PLATFORM_CLIENT_GENERATOR_OUTPUT)
) {
  program.help();
}

const entrypoint =
  program.args[0] || process.env.API_PLATFORM_CLIENT_GENERATOR_ENTRYPOINT;
const outputDirectory =
  program.args[1] || process.env.API_PLATFORM_CLIENT_GENERATOR_OUTPUT;

const entrypointWithSlash = entrypoint.endsWith("/")
  ? entrypoint
  : entrypoint + "/";

const generator = generators(program.generator)({
  hydraPrefix: program.hydraPrefix,
  templateDirectory: program.templateDirectory
});
const resourceToGenerate = program.resource
  ? program.resource.toLowerCase()
  : null;
const serverPath = program.serverPath ? program.serverPath.toLowerCase() : null;

const parser = entrypointWithSlash => {
  const options = {};
  if (program.username && program.password) {
    const encoded = Buffer.from(
      `${program.username}:${program.password}`
    ).toString("base64");
    options.headers = new Headers();
    options.headers.set("Authorization", `Basic ${encoded}`);
  }
  switch (program.format) {
    case "swagger":
      return parseSwaggerDocumentation(entrypointWithSlash);
    case "openapi3":
      return parseOpenApi3Documentation(entrypointWithSlash);
    default:
      return parseHydraDocumentation(entrypointWithSlash, options);
  }
};

// check generator dependencies
generator.checkDependencies(outputDirectory, serverPath);

if (program.dumpSchema) {
  parser(entrypointWithSlash).then(ret => {
    console.log(`Dumped schema file to ${program.dumpSchema}`);
    fs.writeFileSync(
      program.dumpSchema,
      JSON.stringify(ret.api.resources, null, 2)
    );
  });
} else {
  parser(entrypointWithSlash)
    .then(ret => {
      if (program.patchSchema) {
        console.log(`Reading patch schema ${program.patchSchema}`);
        const patchData = JSON.parse(fs.readFileSync(program.patchSchema));
        const patchMap = {};
        if (patchData.resources && program.format === "hydra") {
          for (const resource of patchData.resources) {
            const resourceData = {};
            const resourceFullId = `${entrypointWithSlash}docs.jsonld#${resource.id}`;
            if (!resource.id.startsWith("http")) {
              resource.id = resourceFullId;
            }
            if (resource.newFields) {
              const fieldData = {};
              for (const field of resource.newFields) {
                field.name = field.name || field.id;
                if (!field.id.startsWith("http")) {
                  field.id = `${resourceFullId}/${field.id}`;
                }
                if (field.reference && !field.reference.startsWith("http")) {
                  field.reference = `${entrypointWithSlash}docs.jsonld#${field.reference}`;
                }
                field.readable =
                  "readable" in fieldData ? fieldData.readable : true;
                field.writable =
                  "writable" in fieldData ? fieldData.writable : true;
                fieldData[field.id] = field;
              }
              resourceData.newFields = fieldData;
            }
            patchMap[resourceFullId] = resourceData;
          }
        }
        for (const origResource of ret.api.resources) {
          const origId = origResource.id;
          if (origId in patchMap) {
            const resourceData = patchMap[origId];
            console.log(`Patching ${origResource.title}`);
            if ("newFields" in resourceData) {
              for (const fieldData of Object.values(resourceData.newFields)) {
                const fieldElement = {
                  name: fieldData.name,
                  id: fieldData.id,
                  range: fieldData.range || "",
                  reference: fieldData.reference || null,
                  required: fieldData.required || null,
                  description: fieldData.description || "",
                  maxCardinality: fieldData.maxCardinality || "",
                  deprecated: fieldData.deprecated || false
                };
                origResource.fields.push(fieldElement);
                if (fieldData.readable) {
                  origResource.readableFields.push(fieldElement);
                }
                if (fieldData.writable) {
                  origResource.readableFields.push(fieldElement);
                }
                if (fieldElement.reference) {
                  const refId = fieldElement.reference;
                  fieldElement.reference = ret.api.resources.find(
                    o => o.id === refId
                  );
                  if (!fieldElement.reference) {
                    console.error(`Error while looking for reference ${refId}`);
                  }
                }
                // console.log("Added field", fieldElement);
              }
            }
          }
        }
      }

      ret.api.resources
        .filter(({ deprecated }) => !deprecated)
        .filter(resource => {
          const nameLc = resource.name.toLowerCase();
          const titleLc = resource.title.toLowerCase();

          return (
            null === resourceToGenerate ||
            nameLc === resourceToGenerate ||
            titleLc === resourceToGenerate
          );
        })
        .map(resource => {
          if (program.resourcePrefix) {
            resource.prefixedTitle = `${program.resourcePrefix}${resource.title}`;
          } else {
            resource.prefixedTitle = resource.title;
          }
          return resource;
        })
        .map(resource => {
          const filterDeprecated = list =>
            list.filter(({ deprecated }) => !deprecated);

          resource.fields = filterDeprecated(resource.fields);
          resource.readableFields = filterDeprecated(resource.readableFields);
          resource.writableFields = filterDeprecated(resource.writableFields);

          generator.generate(ret.api, resource, outputDirectory, serverPath);

          return resource;
        })
        // display helps after all resources have been generated to check relation dependency for example
        .forEach(resource => generator.help(resource, outputDirectory));
      // Invoke the finalize function for the generator
      generator.finalize(outputDirectory);
    })
    .catch(e => {
      console.log(e);
    });
}
