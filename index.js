import * as cheerio from "cheerio";
import fs from "fs/promises";
import titles from "./titles.js";

const excludeSet = new Set(["/", "Start", "Between", "End"]);

// For each title in the titles list, check if it contains any word that is in the excludeSet.
// Capitalize the title and replace whitespaces with hypens
const modifiedTitles = titles.map((title) => {
  return title
    .split(" ")
    .filter((word) => !excludeSet.has(word))
    .map((word) => {
      if (word.includes("-")) {
        const hyphenIdx = word.indexOf("-");
        if (word.length !== hyphenIdx) {
          word =
            word.slice(0, hyphenIdx) +
            "-" +
            word.charAt(hyphenIdx + 1).toLowerCase() +
            word.slice(hyphenIdx + 2);
        }
      }
      return word.charAt(0).toLowerCase() + word.slice(1);
    })
    .join("-");
});

/**
 * It requires the latest node version as it uses the builtin fetch api
 *
 * @param {string} url url of the page
 * @returns {Promise} text component of the response
 */
async function fetchData(url) {
  const response = await fetch(url);
  const body = await response.text();
  return body;
}

/**
 * @param {string} url url of the page
 * @returns {Promise} promise object that has tailwindcss class name as key and css code as value
 */
async function getTableContents(url) {
  try {
    const html = await fetchData(url);
    const $ = cheerio.load(html);
    const header = $("header");
    let propertyIdx = 0;
    header
      .next()
      .find("thead")
      .children()
      .children()
      .each((headIdx, head) => {
        if ($(head).text() === "Properties") {
          propertyIdx = headIdx;
        }
      });

    let resultMap = {};

    header
      .next()
      .find("tbody")
      .children()
      .each((rowIdx, row) => {
        resultMap[$(row).children().first().text()] = $(row)
          .children()
          .eq(propertyIdx)
          .text()
          .replace(/\/(\*.*?\*)\//gm, "")
          .trim();
      });

    return resultMap;
  } catch (err) {
    console.error(err);
  }
}

/* Construct object for each page and write a JSON file */
async function writeJSONFile() {
  let classMap = {};

  for (const page of modifiedTitles) {
    const resultMapForEachPage = await getTableContents(
      `https://tailwindcss.com/docs/${page}`
    );
    classMap = { ...classMap, ...resultMapForEachPage };
  }

  try {
    await fs.writeFile("tw.json", JSON.stringify(classMap, null, 2));
    console.log("done!");
  } catch (err) {
    console.log("An error occured while writing JSON Object to File.");
    return console.error(err);
  }
}

await writeJSONFile();
