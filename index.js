import * as cheerio from 'cheerio'
import fs from 'fs/promises'

const excludeSet = new Set(['container'])
const titleSet = new Set([
  'Layout',
  'Flexbox & Grid',
  'Spacing',
  'Sizing',
  'Typography',
  'Backgrounds',
  'Borders',
  'Effects',
  'Filters',
  'Tables',
  'Transitions & Animation',
  'Transforms',
  'Interactivity',
  'SVG',
  'Accessibility',
])

/**
 * It requires the latest node version as it uses the builtin fetch api
 *
 * @param {string} url url of the page
 * @returns {Promise} text component of the response
 */
async function fetchData(url) {
  const response = await fetch(url)
  const body = await response.text()
  return body
}

/**
 * @param {string} url url of page(tailwindcss doc)
 */
async function getLinks(url) {
  try {
    const html = await fetchData(url)
    const $ = cheerio.load(html)
    const links = []
    $('#nav')
      .children()
      .last() // ul
      .children()
      .each((_, list) => {
        const li = $(list)
        // only for the ones in the titleSet
        if (
          li.children().length > 1 &&
          titleSet.has(li.children().first().text())
        ) {
          li.children()
            .last()
            .children()
            .each((_, list) => {
              const li = $(list)
              // grap the link from href attr
              const link = li.children('a').attr('href')
              if (!excludeSet.has(link.split('/')[2])) {
                links.push(link)
              }
            })
        }
      })
    return links
  } catch (e) {
    console.log(e)
  }
}

/**
 * @param {string} url url of the page
 * @returns {Promise} promise object that has tailwindcss class name as key and css code as value
 */
async function getTableContents(url) {
  try {
    const html = await fetchData(url)
    const $ = cheerio.load(html)
    const header = $('header')
    let propertyIdx = 0
    header
      .next()
      .find('thead')
      .children()
      .children()
      .each((headIdx, head) => {
        if ($(head).text() === 'Properties') {
          propertyIdx = headIdx
        }
      })

    let resultMap = {}

    header
      .next()
      .find('tbody')
      .children()
      .each((rowIdx, row) => {
        resultMap[$(row).children().first().text()] = $(row)
          .children()
          .eq(propertyIdx)
          .text()
          .replace(/\/(\*.*?\*)\//gm, '')
          .trim()
      })

    return resultMap
  } catch (err) {
    console.error(err)
  }
}

/* Construct object for each page and write a JSON file */
async function writeJSONFile() {
  let classMap = {}
  // const modifiedTitles = modify(titles)
  const links = await getLinks('https://tailwindcss.com/docs/')
  for (const page of links) {
    const resultMapForEachPage = await getTableContents(
      `https://tailwindcss.com${page}`
    )
    classMap = { ...classMap, ...resultMapForEachPage }
  }

  try {
    await fs.writeFile('tw.json', JSON.stringify(classMap, null, 2))
    console.log('done!')
  } catch (err) {
    console.log('An error occured while writing JSON Object to File.')
    return console.error(err)
  }
}

await writeJSONFile()
