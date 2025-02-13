<template>
  <div class="container">
    <h1>Grateful Dead Time Machine</h1>
    
    <div class="date-input">
      <input 
        type="date" 
        v-model="selectedDate"
        min="1965-01-01"
        max="1995-12-31"
      >
      <button @click="findShow">Find Show</button>
      <button @click="findRandomShow">Random Show</button>
    </div>

    <div v-if="error" class="error">
      {{ error }}
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
          <a :href="currentShow.archiveUrl" target="_blank">View on Archive.org</a>
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
export default {
  data() {
    return {
      selectedDate: '',
      currentShow: null,
      currentTrackIndex: -1,
      error: null
    }
  },
  computed: {
    currentTrack() {
      return this.currentShow?.tracks?.[this.currentTrackIndex]
    }
  },
  methods: {
    async findShow() {
      try {
        const date = new Date(this.selectedDate)
        // Format date correctly for archive.org identifier (YYYY-MM-DD)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        
        // First, search for shows on this date
        const searchUrl = `https://archive.org/advancedsearch.php?q=collection%3AGratefulDead+AND+date%3A${year}-${month}-${day}&fl[]=identifier&fl[]=date&fl[]=venue&sort[]=downloads+desc&output=json`
        
        const searchResponse = await fetch(searchUrl)
        const searchData = await searchResponse.json()
        
        console.log('Search Response:', searchData) // Debug log
        
        if (!searchData.response?.docs?.length) {
          throw new Error('No recordings available for this date')
        }

        // Get the first show's identifier (usually the best quality one)
        const showIdentifier = searchData.response.docs[0].identifier
        
        // Fetch show details
        const response = await fetch(`https://archive.org/metadata/${showIdentifier}`)
        if (!response.ok) {
          throw new Error('Show not found for this date')
        }
        
        const data = await response.json()
        console.log('Show Response:', data) // Debug log
        
        if (!data.files) {
          throw new Error('No recordings available for this date')
        }
        
        // Process the tracks (only get MP3s)
        const tracks = data.files
          .filter(f => f.format === 'VBR MP3' || f.format === 'MP3')
          .filter(f => !f.name.toLowerCase().includes('readme'))  // Filter out readme files
          .map(f => ({
            title: f.title || f.name.replace(/_/g, ' ').replace(/\.mp3$/, ''),
            url: `https://archive.org/download/${showIdentifier}/${f.name}`
          }))
          .sort((a, b) => {
            // Try to sort tracks in setlist order
            const aNum = parseInt(a.title.match(/^\d+/) || '0')
            const bNum = parseInt(b.title.match(/^\d+/) || '0')
            return aNum - bNum
          })

        if (tracks.length === 0) {
          throw new Error('No MP3 tracks found for this show')
        }

        this.currentShow = {
          date: data.metadata?.date || this.selectedDate,
          venue: data.metadata?.venue?.[0] || 'Unknown Venue',
          location: data.metadata?.coverage?.[0] || 'Unknown Location',
          tracks: tracks,
          archiveUrl: `https://archive.org/details/${showIdentifier}`
        }
        
        this.currentTrackIndex = 0
        this.error = null
      } catch (err) {
        console.error('Error:', err)
        this.error = err.message
        this.currentShow = null
        this.currentTrackIndex = -1
      }
    },
    
    findRandomShow() {
      const start = new Date('1965-01-01')
      const end = new Date('1995-12-31')
      const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
      this.selectedDate = randomDate.toISOString().split('T')[0]
      this.findShow()
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

.date-input {
  margin: 20px 0;
}

.error {
  color: red;
  margin: 10px 0;
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
  
  .date-input {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}
</style> 