<template>
  <div class="container">
    <div class="header">
      <img 
        :src="headerImage" 
        alt="Grateful Dead Time Machine" 
        class="header-image"
      />
    </div>

    <ShowListModal
      :show="showListModalVisible"
      :shows="showsDatabase.shows"
      @close="showListModalVisible = false"
      @select-show="handleShowSelect"
    />

    <DeloreanDatePicker 
      ref="datePicker"
      @date-selected="handleDateSelected"
      @destination-time="handleDestinationTime"
      @random="handleRandom"
      @show-list="showListModalVisible = true"
    />

    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <span>Searching for shows...</span>
    </div>

    <div v-if="error" class="error">
      <p class="error-message">{{ error }}</p>
      <p class="error-help">
        Try another date - not every date has a recorded show available.
      </p>
    </div>

    <div v-if="currentShow" class="show-info">
      <div class="show-header">
        <h2 class="venue">{{ currentShow.venue }}</h2>
        <p class="date">{{ formatDateLong(currentShow.date) }}</p>
      </div>

      <div class="audio-player">
        <audio
          v-if="currentTrack"
          :src="currentTrack.url"
          controls
          @ended="playNextTrack"
          autoplay
        ></audio>
      </div>

      <div class="setlist">
        <div class="tracks">
          <div
            v-for="(track, index) in currentShow.tracks"
            :key="index"
            class="track"
            :class="{ active: currentTrackIndex === index }"
            @click="playTrack(index)"
          >
            <span class="track-number">{{ index + 1 }}.</span>
            <span class="track-title">{{ track.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DeloreanDatePicker from './components/DeloreanDatePicker.vue'
import ShowListModal from './components/ShowListModal.vue'
import headerImage from './assets/images/gddelorean.png'
import shows from './data/shows.json'

export default {
  components: {
    DeloreanDatePicker,
    ShowListModal
  },
  data() {
    return {
      headerImage,
      selectedDate: '',
      currentShow: null,
      currentTrackIndex: -1,
      error: null,
      isLoading: false,
      showsDatabase: shows,
      showListModalVisible: false
    }
  },
  computed: {
    currentTrack() {
      return this.currentShow?.tracks?.[this.currentTrackIndex]
    },
    pageTitle() {
      if (this.currentShow && this.currentTrack) {
        return `🎶 ${this.currentTrack.title} - ${this.currentShow.venue} on ${this.formatDateLong(this.currentShow.date)}`
      }
      return 'Grateful Dead Time Machine'
    }
  },
  methods: {
    async fetchWithRetry(url, maxRetries = 3, delay = 1000) {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(url, {
            headers: {
              Accept: 'application/json',
              Origin: window.location.origin
            },
            mode: 'cors'
          })

          // Check if response is JSON before trying to parse
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            console.error('Non-JSON response:', contentType)
            throw new Error('Invalid response format from Archive.org')
          }

          if (response.ok) return response

          if (response.status === 503) {
            console.log(
              `Attempt ${
                i + 1
              }/${maxRetries}: Got 503, retrying after ${delay}ms...`
            )
            await new Promise((resolve) => setTimeout(resolve, delay))
            delay *= 2
            continue
          }

          throw new Error(
            `Request failed: ${response.status} ${response.statusText}`
          )
        } catch (err) {
          console.error(`Attempt ${i + 1}/${maxRetries} failed:`, err)

          if (i === maxRetries - 1) {
            // On final attempt, throw a more user-friendly error
            throw new Error(
              'Unable to connect to Archive.org. Please try again later.'
            )
          }

          await new Promise((resolve) => setTimeout(resolve, delay))
          delay *= 2
        }
      }
    },
    handleDateSelected(dateStr) {
      // Format the date string to ensure it's in MM/DD/YY format
      const [month, day, year] = dateStr.split('/')
      if (month && day && year) {
        this.selectedDate = `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${year.padStart(2, '0')}`
        this.findShow()
      }
    },
    async findShow() {
      this.isLoading = true
      this.error = null
      this.currentShow = null
      this.currentTrackIndex = -1

      try {
        // Parse the input date string (MM/DD/YY format)
        const [month, day, year] = this.selectedDate.split('/')
        
        // Convert to YYYY-MM-DD format without any Date object creation
        const formattedDate = `19${year}-${month}-${day}`

        // Search our local database
        const show = this.showsDatabase.shows.find(
          (show) => show.date === formattedDate
        )

        if (!show) {
          throw new Error('No show found for this date - try another date')
        }

        // Fetch show details from Archive.org
        const response = await this.fetchWithRetry(
          `https://archive.org/metadata/${show.identifier}`
        )
        
        const showData = await response.json()
        
        // Process the tracks
        const tracks = showData.files
          .filter((f) => f.format === 'VBR MP3' || f.format === 'MP3')
          .filter((f) => !f.name.toLowerCase().includes('readme'))
          .map((f) => ({
            title: f.title || f.name.replace(/_/g, ' ').replace(/\.mp3$/, ''),
            url: `https://archive.org/download/${show.identifier}/${f.name}`
          }))
          .sort((a, b) => {
            const aNum = parseInt(a.title.match(/^\d+/) || '0')
            const bNum = parseInt(b.title.match(/^\d+/) || '0')
            return aNum - bNum
          })

        if (tracks.length === 0) {
          throw new Error('No MP3 tracks found for this show')
        }

        this.currentShow = {
          ...show,
          tracks: tracks,
          archiveUrl: `https://archive.org/details/${show.identifier}`
        }

        this.currentTrackIndex = 0

      } catch (err) {
        console.error('Error:', err)
        this.error = err.message
      } finally {
        this.isLoading = false
      }
    },

    playTrack(index) {
      this.currentTrackIndex = index
    },

    playNextTrack() {
      if (this.currentShow && this.currentTrackIndex < this.currentShow.tracks.length - 1) {
        this.currentTrackIndex++
      } else if (this.currentShow && this.currentTrackIndex === this.currentShow.tracks.length - 1) {
        // Reset to first track if we want to loop the show
        this.currentTrackIndex = 0
      }
    },

    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString()
    },

    formatDateLong(dateStr) {
      const [year, month, day] = dateStr.split('-')
      const date = new Date(Date.UTC(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      ))
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'  // Ensure we use UTC to prevent date shifting
      })
    },

    // Add method to check if a date has a show
    hasShow(dateStr) {
      return this.showsDatabase.shows.some((show) => show.date === dateStr)
    },

    async handleDestinationTime(dateStr) {
      if (dateStr) {
        this.handleDateSelected(dateStr)
      }
    },

    async handleRandom() {
      // Get a random show from the database
      const shows = this.showsDatabase.shows
      const randomShow = shows[Math.floor(Math.random() * shows.length)]
      
      // Convert the date format from YYYY-MM-DD to MM/DD/YY
      const [year, month, day] = randomShow.date.split('-')
      const twoDigitYear = year.slice(2)
      const dateStr = `${month}/${day}/${twoDigitYear}`
      
      // Update the date picker display
      this.$refs.datePicker.setDate(dateStr)
      
      // Handle the date selection
      this.handleDateSelected(dateStr)
    },

    async handleShowSelect(show) {
      this.showListModalVisible = false
      // Parse the YYYY-MM-DD format directly and ensure we use the exact date
      const [year, month, day] = show.date.split('-')
      const dateStr = `${month}/${day}/${year.slice(2)}`
      
      // Update the date picker display
      this.$refs.datePicker.setDate(dateStr)
      
      // Handle the date selection
      await this.handleDateSelected(dateStr)
    }
  },
  watch: {
    pageTitle: {
      handler(newTitle) {
        document.title = newTitle
      },
      immediate: true
    }
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header-image {
  max-width: 50%;
  height: auto;
  border-radius: 8px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 2rem 0;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  background-color: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.error-message {
  color: #c53030;
  font-weight: 500;
  margin: 0;
}

.error-help {
  color: #718096;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.show-info {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 2rem;
  margin-top: 2rem;
}

.show-header {
  text-align: center;
  margin-bottom: 2rem;
}

.show-header h2.venue {
  color: #2c3e50;
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
}

.show-header .date {
  color: #64748b;
  font-size: 1.1rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.audio-player {
  margin: 2rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

audio {
  width: 100%;
  max-width: 500px;
}

.setlist {
  margin-top: 2rem;
}

.setlist h3 {
  color: #2c3e50;
  font-size: 1.4rem;
  margin-bottom: 1rem;
}

.tracks {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.track {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #e2e8f0;
}

.track:last-child {
  border-bottom: none;
}

.track:hover {
  background-color: #f7fafc;
}

.track.active {
  background-color: #ebf8ff;
}

.track-number {
  color: #718096;
  font-weight: 500;
  margin-right: 1rem;
  min-width: 2rem;
}

.track-title {
  color: #2d3748;
  font-weight: 400;
}

@media (max-width: 600px) {
  .container {
    padding: 1rem;
  }

  h1 {
    font-size: 2rem;
  }

  .show-info {
    padding: 1rem;
  }
}
</style>
