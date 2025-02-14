const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')

const favoredTapers = ['miller']; // Add more favored tapers as needed
const baseDelay = 3000  // Increased base delay to 3 seconds

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

function selectBestRecording(records) {
  return records.reduce((best, current) => {
    // Check if the current recording is better than the best one found so far
    if (!best) return current; // If no best found yet, return current

    // Criteria 1: Soundboard vs Audience
    const isBestSoundboard = best.identifier.includes('sbd');
    const isCurrentSoundboard = current.identifier.includes('sbd');
    if (isCurrentSoundboard && !isBestSoundboard) return current;

    // Criteria 2: Taper name preference
    const bestTaper = best.identifier.split('.').find(part => favoredTapers.includes(part.toLowerCase()));
    const currentTaper = current.identifier.split('.').find(part => favoredTapers.includes(part.toLowerCase()));
    if (currentTaper && (!bestTaper || favoredTapers.indexOf(currentTaper) < favoredTapers.indexOf(bestTaper))) return current;

    // Criteria 3: Number of downloads (assuming this is available in the metadata)
    if (current.downloads > best.downloads) return current;

    // Criteria 4: Number of tracks
    if (current.tracks.length > best.tracks.length) return current;

    // Criteria 5: Number of named tracks
    const bestNamedTracks = best.tracks.filter(track => track.title).length;
    const currentNamedTracks = current.tracks.filter(track => track.title).length;
    if (currentNamedTracks > bestNamedTracks) return current;

    // Criteria 6: Average rating (assuming this is available in the metadata)
    if (current.rating > best.rating) return current;

    return best; // Return the best found so far
  }, null);
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
  let currentDelay = baseDelay

  console.log('Starting to fetch Grateful Dead shows from Archive.org...')
  
  while (hasMore) {
    try {
      console.log(`Fetching page ${page}...`)
      await sleep(baseDelay)
      
      const url = `https://archive.org/advancedsearch.php?` + new URLSearchParams({
        q: 'collection:(GratefulDead) AND mediatype:(etree)',
        fl: ['identifier', 'date', 'venue', 'coverage', 'title', 'year'].join(','),
        sort: ['date asc'],
        output: 'json',
        rows: perPage,
        page: page
      }).toString()

      const response = await fetch(url)
      
      if (response.status === 507) {
        console.log('Archive.org is temporarily unavailable (507). Waiting 30 seconds...')
        await sleep(30000)  // Wait 30 seconds before retry
        continue  // Retry the same page
      }
      
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

        // Directly extract venue and location from the metadata
        const venue = doc.venue || 'Unknown Venue'; // Assuming 'venue' is a field in the metadata
        const location = doc.location || 'Unknown Location'; // Assuming 'location' is a field in the metadata

        // Debugging: Log extracted venue and location
        console.log(`Extracted Venue: ${venue}, Location: ${location} for ${doc.identifier}`)

        // Create a record object for easier processing
        const record = {
          date: normalizedDate,
          venue: venue,
          location: location,
          identifier: doc.identifier,
          title: doc.title || '',
          year: doc.year || normalizedDate.split('-')[0],
          downloads: doc.downloads || 0, // Assuming this field exists
          tracks: doc.tracks || [], // Assuming this field exists
          rating: doc.rating || 0 // Assuming this field exists
        }

        // Add the record to the showsByDate map
        if (!showsByDate.has(normalizedDate)) {
          showsByDate.set(normalizedDate, [record])
        } else {
          const existingRecords = showsByDate.get(normalizedDate)
          if (Array.isArray(existingRecords)) {
            existingRecords.push(record)
          } else {
            console.error(`Unexpected value for date ${normalizedDate}:`, existingRecords)
            showsByDate.set(normalizedDate, [record])
          }
        }
      })

      // After processing all documents, select the best recording for each date
      showsByDate.forEach((records, date) => {
        if (Array.isArray(records) && records.length > 0) {
          const bestRecording = selectBestRecording(records)
          showsByDate.set(date, bestRecording)
        } else {
          console.error(`No valid records found for date ${date}:`, records)
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
        console.log(`Hit maximum retry attempts. Waiting 2 minutes before continuing...`)
        await sleep(120000)  // Wait 2 minutes
        errorCount = 0  // Reset error count
        continue  // Try again
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