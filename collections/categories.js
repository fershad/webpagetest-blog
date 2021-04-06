const pathConfig = require("../src/_data/paths.json");

module.exports = (collection) => {
  return [
    ...collection.getFilteredByGlob(`./${pathConfig.src}/categories/**/*.md`),
  ].sort(function (a, b) {
    return a.data.name.localeCompare(b.data.name);
  });
};
