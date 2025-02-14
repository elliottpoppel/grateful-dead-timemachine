<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <div class="search-container">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search venues or dates..."
            class="search-input"
            @click.stop
          />
        </div>
        <button class="close-button" @click="$emit('close')">×</button>
      </div>
      <div class="shows-list">
        <div
          v-for="show in filteredShows"
          :key="show.date"
          class="show-item"
          @click="selectShow(show)"
        >
          <span class="show-venue">{{ show.venue }}</span>
          <span class="show-date">{{ formatDate(show.date) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    show: {
      type: Boolean,
      default: false
    },
    shows: {
      type: Array,
      required: true
    }
  },
  emits: ['close', 'select-show'],
  data() {
    return {
      searchQuery: ''
    }
  },
  computed: {
    sortedShows() {
      return [...this.shows].sort((a, b) => b.date.localeCompare(a.date))
    },
    filteredShows() {
      if (!this.searchQuery) return this.sortedShows
      
      const query = this.searchQuery.toLowerCase()
      return this.sortedShows.filter(show => {
        const venue = show.venue.toLowerCase()
        const date = this.formatDate(show.date).toLowerCase()
        return venue.includes(query) || date.includes(query)
      })
    }
  },
  methods: {
    formatDate(dateStr) {
      const [year, month, day] = dateStr.split('-')
      return `${month}/${day}/${year.slice(2)}`
    },
    selectShow(show) {
      this.$emit('select-show', show)
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  position: relative;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.modal-header {
  height: 48px;
  border-bottom: 1px solid #e2e8f0;
  position: relative;
  display: flex;
  align-items: center;
  padding: 8px;
}

.search-container {
  flex: 1;
  margin-right: 48px;
}

.search-input {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  font-size: 14px;
  color: #2d3748;
  background-color: #f7fafc;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #4a5568;
  background-color: white;
  box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
}

.search-input::placeholder {
  color: #a0aec0;
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #414549;
  color: #ff0000;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.close-button:hover {
  background: #555;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
}

.shows-list {
  max-height: calc(70vh - 48px);
  overflow-y: auto;
  padding: 20px;
}

.show-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #e2e8f0;
}

.show-item:last-child {
  border-bottom: none;
}

.show-item:hover {
  background-color: #f7fafc;
}

.show-venue {
  color: #2d3748;
  font-weight: 500;
}

.show-date {
  color: #718096;
}
</style> 