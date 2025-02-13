const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractVenueFromTitle(title) {
  if (!title) return null
  // Look for text between "Live at" and the year
  const venueMatch = title.match(/Live at ([^,]+?)(?:,|\s+on\s+|$)/)
  return venueMatch ? venueMatch[1].trim() : null
}

function normalizeDate(dateStr) {
  // Handle formats like "1977-04-23", "77-04-23", and "gd77-04-23"
  const match = dateStr.match(/(?:gd)?(?:19)?(\d{2})-(\d{2})-(\d{2})/)
  if (!match) return null
  
  const [_, year, month, day] = match
  return `19${year}-${month}-${day}`
}

async function buildDatabase() {
  // Load existing database if it exists
  let showsByDate = new Map()
  const dbPath = path.join(__dirname, '..', 'src', 'data', 'shows.json')
  const dataDir = path.dirname(dbPath)
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  // Load existing data and get last processed page
  let startPage = 1
  if (fs.existsSync(dbPath)) {
    console.log('Loading existing database...')
    const existing = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
    if (existing.shows) {
      existing.shows.forEach(show => {
        showsByDate.set(show.date, show)
      })
      startPage = existing.lastProcessedPage || 1
      console.log(`Loaded ${showsByDate.size} existing shows, resuming from page ${startPage}`)
    }
  }

  let page = startPage
  const perPage = 100
  let hasMore = true
  let errorCount = 0
  const MAX_ERRORS = 3
  const baseDelay = 1000
  let currentDelay = baseDelay

  console.log('Starting to fetch Grateful Dead shows from Archive.org...')
  
  while (hasMore) {
    try {
      console.log(`Fetching page ${page}...`)
      const url = `https://archive.org/advancedsearch.php?` + new URLSearchParams({
        q: 'collection:(GratefulDead) AND mediatype:(etree)',
        fl: ['identifier', 'date', 'venue', 'coverage', 'title', 'year'].join(','),
        sort: ['date asc'],
        output: 'json',
        rows: perPage,
        page: page
      }).toString()

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (!data.response?.docs?.length) {
        console.log('No more documents found, ending search')
        hasMore = false
        break
      }

      console.log(`Found ${data.response.docs.length} documents on page ${page}`)
      let newShowsOnThisPage = 0

      // Process each document
      data.response.docs.forEach(doc => {
        const normalizedDate = normalizeDate(doc.date)
        if (!normalizedDate) {
          console.log(`Invalid date format: ${doc.date} for ${doc.identifier}`)
          return
        }

        // Extract full venue name and location
        const venue = doc.venue?.[0] || extractVenueFromTitle(doc.title) || 'Unknown Venue'
        const location = doc.coverage?.[0] || 
          (doc.title?.match(/,\s*([^,]+?)(?:\s+on\s+|$)/) || [])[1] || 
          'Unknown Location'

        // Only add if we don't have this date yet, or if this is a better quality recording
        if (!showsByDate.has(normalizedDate) || doc.identifier.includes('sbd')) {
          showsByDate.set(normalizedDate, {
            date: normalizedDate,
            venue: venue.replace(/\s+/g, ' ').trim(),
            location: location.replace(/\s+/g, ' ').trim(),
            identifier: doc.identifier,
            title: doc.title || '',
            year: doc.year || normalizedDate.split('-')[0]
          })
          newShowsOnThisPage++
        }
      })

      // Save progress after each page
      const shows = Array.from(showsByDate.values())
        .sort((a, b) => a.date.localeCompare(b.date))
      
      fs.writeFileSync(
        dbPath,
        JSON.stringify({ shows, lastProcessedPage: page }, null, 2)
      )

      console.log(`Added ${newShowsOnThisPage} new shows on this page`)
      console.log(`Total unique shows so far: ${showsByDate.size}`)

      await sleep(currentDelay)
      currentDelay = baseDelay // Reset delay on success
      page++

    } catch (error) {
      console.error(`Error on page ${page}:`, error)
      errorCount++
      
      if (errorCount >= MAX_ERRORS) {
        console.log(`Hit maximum retry attempts. Saving progress at page ${page}...`)
        break
      }
      
      currentDelay *= 2
      console.log(`Backing off for ${currentDelay}ms before retry...`)
      await sleep(currentDelay)
    }
  }

  // Final save
  const shows = Array.from(showsByDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
  
  fs.writeFileSync(
    dbPath,
    JSON.stringify({ shows, lastProcessedPage: page }, null, 2)
  )

  console.log(`Database built with ${showsByDate.size} unique shows`)
  console.log(`Last processed page: ${page}`)
}

buildDatabase().catch(console.error)