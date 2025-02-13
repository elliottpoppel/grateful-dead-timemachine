<template>
  <div class="container">
    <h1>Grateful Dead Time Machine</h1>

    <DeloreanDatePicker @date-selected="handleDateSelected" />

    <div v-if="isLoading" class="loading">Searching for shows...</div>

    <div v-if="error" class="error">
      {{ error }}
      <p class="error-help">
        Try another date - not every date has a recorded show available.
      </p>
    </div>

    <div v-if="currentShow" class="show-info">
      <h2>{{ formatDate(currentShow.date) }}</h2>
      <p>{{ currentShow.venue }}, {{ currentShow.location }}</p>

      <div class="audio-player">
        <audio
          v-if="currentTrack"
          :src="currentTrack.url"
          controls
          @ended="playNextTrack"
        ></audio>
        <div class="share-button">
          <a :href="currentShow.archiveUrl" target="_blank"
            >View on Archive.org</a
          >
        </div>
      </div>

      <div class="setlist">
        <h3>Setlist</h3>
        <div
          v-for="(track, index) in currentShow.tracks"
          :key="index"
          class="track"
          :class="{ active: currentTrackIndex === index }"
          @click="playTrack(index)"
        >
          <span>{{ index + 1 }}. {{ track.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DeloreanDatePicker from './components/DeloreanDatePicker.vue'
import AudioPlayer from './components/AudioPlayer.vue'
import SetList from './components/SetList.vue'
import shows from './data/shows.json'

export default {
  components: {
    DeloreanDatePicker,
    AudioPlayer,
    SetList
  },
  data() {
    return {
      selectedDate: '',
      currentShow: null,
      currentTrackIndex: -1,
      error: null,
      isLoading: false,
      showsDatabase: shows.shows
    }
  },
  computed: {
    currentTrack() {
      return this.currentShow?.tracks?.[this.currentTrackIndex]
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
      this.selectedDate = dateStr
      this.findShow()
    },
    async findShow() {
      this.isLoading = true
      this.error = null
      this.currentShow = null
      this.currentTrackIndex = -1

      try {
        const date = new Date(this.selectedDate)
        const formattedDate = date.toISOString().split('T')[0]

        // Search our local database
        const show = this.showsDatabase.find(
          (show) => show.date === formattedDate
        )

        if (!show) {
          throw new Error('No show found for this date - try another date')
        }

        // Fetch show details from Archive.org
        const response = await fetch(
          `https://archive.org/metadata/${show.identifier}`
        )
        if (!response.ok) {
          throw new Error('Unable to fetch show details from Archive.org')
        }

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
          date: show.date,
          venue: show.venue,
          location: show.location,
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
      if (this.currentTrackIndex < this.currentShow.tracks.length - 1) {
        this.currentTrackIndex++
      }
    },

    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString()
    },

    // Add method to check if a date has a show
    hasShow(dateStr) {
      return this.showsDatabase.some((show) => show.date === dateStr)
    }
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.loading {
  text-align: center;
  margin: 20px 0;
  color: #666;
}

.error {
  color: #d32f2f;
  margin: 20px 0;
  padding: 10px;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  background-color: #ffebee;
}

.error-help {
  font-size: 0.9em;
  margin-top: 8px;
  color: #666;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.track {
  padding: 8px;
  cursor: pointer;
}

.track:hover {
  background-color: #f5f5f5;
}

.track.active {
  background-color: #e0e0e0;
}

@media (max-width: 600px) {
  .container {
    padding: 10px;
  }
}
</style>
