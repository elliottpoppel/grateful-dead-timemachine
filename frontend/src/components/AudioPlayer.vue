<template>
  <div class="audio-player">
    <audio
      ref="audioPlayer"
      :src="currentTrack?.url"
      @ended="handleTrackEnd"
      controls
    ></audio>
    <div class="share-button">
      <a 
        v-if="archiveUrl"
        :href="archiveUrl"
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Archive.org
      </a>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    currentTrack: {
      type: Object,
      default: null
    },
    archiveUrl: {
      type: String,
      default: ''
    }
  },
  methods: {
    handleTrackEnd() {
      this.$emit('track-ended')
    }
  },
  watch: {
    currentTrack() {
      // Reset and play when track changes
      this.$nextTick(() => {
        const audio = this.$refs.audioPlayer
        if (audio) {
          audio.load()
          audio.play()
        }
      })
    }
  }
}
</script>

<style scoped>
.audio-player {
  margin: 20px 0;
}

audio {
  width: 100%;
}

.share-button {
  margin-top: 10px;
  text-align: right;
}

.share-button a {
  color: #1a0dab;
  text-decoration: none;
}

.share-button a:hover {
  text-decoration: underline;
}
</style> 