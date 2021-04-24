export function camelCaseToKebabCase(val) {
  return val.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function camelCaseToSnakeCase(val) {
  return val.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}
