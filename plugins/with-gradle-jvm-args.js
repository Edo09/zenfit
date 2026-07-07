const { withGradleProperties } = require("expo/config-plugins");

// Prebuild's default (-Xmx2048m -XX:MaxMetaspaceSize=512m) is too small for
// lint's Kotlin analysis during assembleRelease — it dies with a Metaspace
// OutOfMemoryError in library lintVital tasks (e.g. react-native-screens).
const JVM_ARGS = "-Xmx2048m -XX:MaxMetaspaceSize=1024m";

module.exports = function withGradleJvmArgs(config) {
  return withGradleProperties(config, (config) => {
    const existing = config.modResults.find(
      (item) => item.type === "property" && item.key === "org.gradle.jvmargs"
    );
    if (existing) {
      existing.value = JVM_ARGS;
    } else {
      config.modResults.push({
        type: "property",
        key: "org.gradle.jvmargs",
        value: JVM_ARGS,
      });
    }
    return config;
  });
};
