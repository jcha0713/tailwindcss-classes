import * as cheerio from 'cheerio'
import fs from 'fs'
import titles from './titles.js'

const classMap = {}

const excludeSet = new Set(['/', 'Start', 'End'])

const modifiedTitles = titles.map(title => {
  return title.split(' ').filter(word => !excludeSet.has(word) ).map(word => {
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
  header.next().find('tbody').children().each((rowIdx, row) => {
    classMap[$(row).children().first().text()] = $(row).children().eq(1).text().replace('\n', '')
  })
}

modifiedTitles.forEach(async (page) => {
  await getTableContents(`https://tailwindcss.com/docs/${page}`)
  fs.writeFile("tw.json", JSON.stringify(classMap), 'utf8', function (err) {
    if (err) {
      console.log("An error occured while writing JSON Object to File.");
      return console.log(err);
    }
  });
})
