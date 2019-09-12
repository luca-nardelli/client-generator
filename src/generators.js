import AdminOnRestGenerator from "./generators/AdminOnRestGenerator";
import NextGenerator from "./generators/NextGenerator";
import ReactGenerator from "./generators/ReactGenerator";
import ReactNativeGenerator from "./generators/ReactNativeGenerator";
import TypescriptInterfaceGenerator from "./generators/TypescriptInterfaceGenerator";
import VueGenerator from "./generators/VueGenerator";
import QuasarGenerator from "./generators/QuasarGenerator";
import AngularGenerator from "./generators/AngularGenerator";
import VuePluginAxiosGenerator from "./generators/VuePluginAxiosGenerator";
import FlutterDioGenerator from "./generators/FlutterDioGenerator";

function wrap(cl) {
  return ({ hydraPrefix, templateDirectory }) =>
    new cl({ hydraPrefix, templateDirectory });
}

export default function generators(generator = "react") {
  switch (generator) {
    case "admin-on-rest":
      return wrap(AdminOnRestGenerator);
    case "next":
      return wrap(NextGenerator);
    case "react":
      return wrap(ReactGenerator);
    case "react-native":
      return wrap(ReactNativeGenerator);
    case "typescript":
      return wrap(TypescriptInterfaceGenerator);
    case "vue":
      return wrap(VueGenerator);
    case "quasar":
      return wrap(QuasarGenerator);
    case "angular":
      return wrap(AngularGenerator);
    case "vue-plugin-axios":
      return wrap(VuePluginAxiosGenerator);
    case "flutter-dio":
      return wrap(FlutterDioGenerator);
  }
}
