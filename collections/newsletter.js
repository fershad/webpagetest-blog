const pathConfig = require("../src/_data/paths.json");

const now = new Date();
const livePosts = (post) => post.date <= now && !post.data.draft;

module.exports = (collection) => {
  return [
    ...collection
      .getFilteredByGlob(`./${pathConfig.src}/newsletter/**/*.md`)
      .filter(livePosts),
  ].reverse();
};
