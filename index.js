import * as cheerio from 'cheerio'
import fs from 'fs/promises'
import titles from './titles.js'

const excludeSet = new Set(['/', 'Start', 'Between', 'End'])

const modifiedTitles = titles.map(title => {
  return title.split(' ').filter(word => !excludeSet.has(word)).map(word => {
    if (word.includes('-')) {
      const hyphenIdx = word.indexOf('-')
      if (word.length !== hyphenIdx) {
        word = word.slice(0, hyphenIdx) + '-' + word.charAt(hyphenIdx + 1).toLowerCase() + word.slice(hyphenIdx + 2)
      }
    }
    return word.charAt(0).toLowerCase() + word.slice(1)
  }).join('-')
})

async function fetchData(url) {
  const response = await fetch(url)
  const body = await response.text()
  return body
}

async function getTableContents(url) {
  const html = await fetchData(url)
  const $ = cheerio.load(html)
  const header = $('header')
  let propertyIdx = 0
  header.next().find('thead').children().children().each((headIdx, head) => {
    if ($(head).text() === 'Properties') {
      propertyIdx = headIdx
    }
  })

  let resultMap = {}

  header.next().find('tbody').children().each((rowIdx, row) => {
    resultMap[$(row).children().first().text()] = $(row).children().eq(propertyIdx).text().replace(/\/(\*.*?\*)\//gm, '').trim()
  })

  return resultMap
}

async function writeJSONFile() {
  let classMap = {}
  
  for (const page of modifiedTitles) {
    const resultMapForEachPage = await getTableContents(`https://tailwindcss.com/docs/${page}`)
    classMap = { ...classMap, ...resultMapForEachPage }
  }

  try {
    await fs.writeFile("tw.json", JSON.stringify(classMap, null, 2))
    console.log('done!')
  } catch(err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
  }
}

await writeJSONFile()
