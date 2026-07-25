"use strict";

/**
 * Temporary CommonJS compatibility bridge for legacy minimatch consumers.
 *
 * The repository pins brace-expansion 5.0.8 to address
 * GHSA-mh99-v99m-4gvg. That release exposes `expand` as a named export,
 * while minimatch 3 still expects `require("brace-expansion")` itself to be
 * callable. ESLint currently includes both minimatch 3 and minimatch 10, so
 * the secure brace-expansion release must support both shapes during linting.
 *
 * Remove this bridge once every ESLint dependency has moved off minimatch 3.
 */
const Module = require("node:module");

const originalLoad = Module._load;
const compatibilityWrappers = new WeakMap();

Module._load = function loadWithBraceExpansionCompatibility(
  request,
  parent,
  isMain,
) {
  const loaded = originalLoad.call(this, request, parent, isMain);

  if (
    request !== "brace-expansion" ||
    typeof loaded === "function" ||
    loaded === null ||
    typeof loaded !== "object" ||
    typeof loaded.expand !== "function"
  ) {
    return loaded;
  }

  const existingWrapper = compatibilityWrappers.get(loaded);
  if (existingWrapper) {
    return existingWrapper;
  }

  const callableExport = (...args) => loaded.expand(...args);
  Object.assign(callableExport, loaded);
  compatibilityWrappers.set(loaded, callableExport);

  return callableExport;
};
