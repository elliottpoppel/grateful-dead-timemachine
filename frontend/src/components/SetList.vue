<template>
  <div class="setlist">
    <h3>Setlist</h3>
    <div class="tracks">
      <div
        v-for="(track, index) in tracks"
        :key="index"
        class="track"
        :class="{ active: currentTrackIndex === index }"
        @click="$emit('select-track', index)"
      >
        <span class="track-number">{{ index + 1 }}.</span>
        <span class="track-title">{{ track.title }}</span>
        <span class="track-duration">{{ formatDuration(track.duration) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['select-track'],
  props: {
    tracks: {
      type: Array,
      required: true
    },
    currentTrackIndex: {
      type: Number,
      default: -1
    }
  },
  methods: {
    formatDuration(seconds) {
      if (!seconds) return '--:--'
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
  }
}
</script>

<style scoped>
.setlist {
  margin: 20px 0;
}

.tracks {
  max-height: 400px;
  overflow-y: auto;
}

.track {
  padding: 8px;
  cursor: pointer;
  display: grid;
  grid-template-columns: 30px 1fr 60px;
  gap: 10px;
  align-items: center;
}

.track:hover {
  background-color: #f5f5f5;
}

.track.active {
  background-color: #e0e0e0;
}

.track-duration {
  text-align: right;
  color: #666;
}
</style>
