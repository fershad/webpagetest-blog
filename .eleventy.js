const syntaxHighlightPlugin = require("@11ty/eleventy-plugin-syntaxhighlight");
const htmlMinTransform = require("./utils/transforms/htmlmin.js");
const getPathFromUrl = require("./utils/getPathFromUrl.js");
const markdownIt = require("markdown-it");
const markdownItFootnote = require('markdown-it-footnote')
const contentParser = require("./utils/transforms/contentParser.js");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const rssPlugin = require("@11ty/eleventy-plugin-rss");
const fs = require("fs");
const util = require("util");
const readingTime = require("eleventy-plugin-reading-time");
const { findBySlug } = require("./utils/findBySlug");

/**
 * Import site configuration
 */
const config = require("./src/_data/config.json");
const pathConfig = require("./src/_data/paths.json");

module.exports = function (eleventyConfig) {
  /**
   * Removed renaming Passthrough file copy due to issues with incremental
   * https://github.com/11ty/eleventy/issues/1299
   */
  eleventyConfig.addPassthroughCopy({ assets: "assets" });
  eleventyConfig.addPassthroughCopy({ static: "/" });
  eleventyConfig.addPassthroughCopy("src/admin");

  /**
   * Create custom data collections
   * for blog and feed
   * Code from https://github.com/hankchizljaw/hylia
   */
  eleventyConfig.addCollection("posts", require("./collections/posts"));
  eleventyConfig.addCollection(
    "categories",
    require("./collections/categories")
  );
  eleventyConfig.addCollection(
    "categoriesPaged",
    require("./collections/categoriesPaged")
  );
  eleventyConfig.addCollection(
    "categoriesPosts",
    require("./collections/categoriesPosts")
  );
  eleventyConfig.addCollection("authors", require("./collections/authors"));
  eleventyConfig.addCollection(
    "authorsStaff",
    require("./collections/authorsStaff")
  );
  eleventyConfig.addCollection(
    "authorsPosts",
    require("./collections/authorsPosts")
  );
  eleventyConfig.addCollection(
    "authorsPaged",
    require("./collections/authorsPaged")
  );
  eleventyConfig.addCollection("tagList", require("./collections/tagList"));
  eleventyConfig.addCollection("tagsPaged", require("./collections/tagsPaged"));
  eleventyConfig.addCollection(
    "newsletter",
    require("./collections/newsletter")
  );
  eleventyConfig.addCollection("memoized", require("./collections/memoized"));

  eleventyConfig.addNunjucksFilter("limit", (arr, limit) =>
    arr.slice(0, limit)
  );

  /**
   * Add filters
   *
   * @link https://www.11ty.io/docs/filters/
   */
  dayjs.extend(customParseFormat);

  eleventyConfig.addFilter("monthDayYear", function (date) {
    return dayjs(date).format("MMM. DD, YYYY");
  });

  eleventyConfig.addFilter("fullMonthDayYear", function (date) {
    return dayjs(date).format("MMMM D, YYYY");
  });
  // robot friendly date format for crawlers
  eleventyConfig.addFilter("htmlDate", function (date) {
    return dayjs(date).format();
  });

  eleventyConfig.addFilter("console", function (value) {
    return util.inspect(value);
  });

  eleventyConfig.addFilter("findBySlug", function (slug) {
    return findBySlug(slug);
  });

  eleventyConfig.addFilter("filename", function (path) {
    return path.split("/").pop();
  });

  const mdRender = new markdownIt({html: true});
  eleventyConfig.addFilter("markdown", function (value) {
    if (value) {
      return mdRender.render(value);
    }
    return "";
  });
  /**
   * Add Transforms
   *
   * @link https://www.11ty.io/docs/config/#transforms
   */
  if (process.env.ELEVENTY_ENV === "production") {
    // Minify HTML when building for production
    eleventyConfig.addTransform("htmlmin", htmlMinTransform);
  }
  // Parse the page HTML content and perform some manipulation
  eleventyConfig.addTransform("contentParser", contentParser);

  /**
   * Add Plugins
   * @link https://github.com/11ty/eleventy-plugin-rss
   * @link https://github.com/11ty/eleventy-plugin-syntaxhighlight
   * @link https://github.com/okitavera/eleventy-plugin-pwa
   */
  eleventyConfig.addPlugin(rssPlugin);
  eleventyConfig.addPlugin(syntaxHighlightPlugin);
  eleventyConfig.addPlugin(readingTime);

  /**
   * General Shortcode
   */
  const now = new Date();
  eleventyConfig.addShortcode("copyrightYear", function () {
    if (now.getFullYear() === 2021) {
      return `${now.getFullYear()}`;
    } else {
      return `2021 - ${now.getFullYear()}`;
    }
  });

  /**
   * Cloudinary Shortcodes
   */
  eleventyConfig.addShortcode("cloudinaryImage", function (
    url,
    alt,
    width,
    height,
    sizes,
    loading,
    className,
    attributes
  ) {
    const path = getPathFromUrl(url);
    const multipliers = [
      0.25,
      0.35,
      0.5,
      0.65,
      0.75,
      0.85,
      1,
      1.1,
      1.25,
      1.5,
      1.75,
      2,
    ];
    let srcSetArray = [];
    multipliers.forEach((multiplier) => {
      let currentWidth = Math.round(multiplier * width);
      let currentHeight = Math.round(multiplier * height);
      srcSetArray.push(
        `https://res.cloudinary.com/${config.cloudinaryName}/image/upload/f_auto,q_auto,c_fill,w_${currentWidth},h_${currentHeight}/${path} ${currentWidth}w`
      );
    });
    return `<img ${className ? 'class="' + className + '"' : ""}
        src="https://res.cloudinary.com/${
          config.cloudinaryName
        }/image/upload/f_auto,q_auto,c_fill,w_${width},h_${height}/${path}"
        srcset="${srcSetArray.join(", ")}"
        ${alt ? "alt='" + alt + "'" : ""}
        ${loading ? "loading='" + loading + "'" : ""}
        width="${width}"
        height="${height}"
        ${sizes ? "sizes='" + sizes + "'" : ""}
        ${attributes ? attributes : ""}>`;
  });

    /**
   * Cloudinary Shortcodes
   */
     eleventyConfig.addShortcode("cloudinaryThumb", function (
      url,
      alt,
      width,
      height
    ) {
      const path = getPathFromUrl(url);

      return `<img src="https://res.cloudinary.com/${
            config.cloudinaryName
          }/image/upload/f_auto,q_auto,c_fill,w_${width},h_${height}/${path}"
          ${alt ? "alt='" + alt + "'" : ""}
          width="${width}"
          height="${height}">`;
    });
  /**
   * Override BrowserSync Server options
   *
   * @link https://www.11ty.dev/docs/config/#override-browsersync-server-options
   */
  eleventyConfig.setBrowserSyncConfig({
    notify: false,
    open: true,
    snippetOptions: {
      rule: {
        match: /<\/head>/i,
        fn: function (snippet, match) {
          return snippet + match;
        },
      },
    },
    // Set local server 404 fallback
    callbacks: {
      ready: function (err, browserSync) {
        const content_404 = fs.readFileSync("dist/404.html");

        browserSync.addMiddleware("*", (req, res) => {
          // Provides the 404 content without redirect.
          res.writeHead(404, {
            "Content-Type": "text/html",
          });
          res.write(content_404);
          res.end();
        });
      },
    },
  });

  /*
   * Disable use gitignore for avoiding ignoring of /bundle folder during watch
   * https://www.11ty.dev/docs/ignores/#opt-out-of-using-.gitignore
   */
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.setLibrary("md", markdownIt({html: true})
    .use(markdownItFootnote)
    .use(require('markdown-it-ins'))
  );

  eleventyConfig.addPairedShortcode("note", (content, title) => {
    return (
      '<div class="post__note">' + mdRender.render(content) + '</div>'
    );
  });
  /**
   * Eleventy configuration object
   */
  return {
    dir: {
      input: pathConfig.src,
      includes: pathConfig.includes,
      layouts: `${pathConfig.includes}/layouts`,
      output: pathConfig.output,
    },
    passthroughFileCopy: true,
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
