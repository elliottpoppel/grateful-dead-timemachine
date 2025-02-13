<template>
  <div class="delorean-date">
    <div class="date-display">
      <div class="input-group">
        <div class="label">MONTH</div>
        <div class="display-box">
          <input
            ref="monthInput"
            v-model="month"
            type="text"
            maxlength="2"
            placeholder="05"
            @input="handleMonthInput"
            @keydown="handleBackspace($event, 'month')"
          />
        </div>
      </div>

      <div class="input-group">
        <div class="label">DAY</div>
        <div class="display-box">
          <input
            ref="dayInput"
            v-model="day"
            type="text"
            maxlength="2"
            placeholder="08"
            @input="handleDayInput"
            @keydown="handleBackspace($event, 'day')"
          />
        </div>
      </div>

      <div class="input-group">
        <div class="label">YEAR</div>
        <div class="display-box">
          <input
            ref="yearInput"
            v-model="year"
            type="text"
            maxlength="2"
            placeholder="77"
            @input="handleYearInput"
            @keydown="handleBackspace($event, 'year')"
          />
        </div>
      </div>
    </div>

    <div class="buttons">
      <button @click="emitDate" :disabled="!isValidDate">
        DESTINATION TIME
      </button>
      <button @click="randomDate">RANDOM</button>
      <img 
        src="../assets/images/grayssportsalmanac.png" 
        alt="Gray's Sports Almanac"
        class="almanac-icon"
      />
    </div>
  </div>
</template>

<script>
export default {
  emits: ['date-selected'],
  data() {
    return {
      month: '',
      day: '',
      year: ''
    }
  },
  computed: {
    isValidDate() {
      if (!this.month || !this.day || !this.year) return false

      const fullYear = 1900 + parseInt(this.year)
      const date = new Date(
        fullYear,
        parseInt(this.month) - 1,
        parseInt(this.day)
      )

      // Check if date is valid and within Grateful Dead era
      return (
        date instanceof Date &&
        !isNaN(date) &&
        date >= new Date('1965-01-01') &&
        date <= new Date('1995-12-31') &&
        date.getMonth() === parseInt(this.month) - 1 &&
        date.getDate() === parseInt(this.day)
      )
    }
  },
  methods: {
    handleMonthInput(e) {
      const val = e.target.value.replace(/\D/g, '')
      this.month = val
      if (val.length === 2 && parseInt(val) > 0 && parseInt(val) <= 12) {
        this.$refs.dayInput.focus()
      }
    },
    handleDayInput(e) {
      const val = e.target.value.replace(/\D/g, '')
      this.day = val
      if (val.length === 2) {
        this.$refs.yearInput.focus()
      }
    },
    handleYearInput(e) {
      const val = e.target.value.replace(/\D/g, '')
      this.year = val
      if (val.length === 2) {
        this.$refs.yearInput.blur()
      }
    },
    handleBackspace(e, field) {
      if (e.key === 'Backspace' && !this[field]) {
        if (field === 'year') this.$refs.dayInput.focus()
        if (field === 'day') this.$refs.monthInput.focus()
      }
    },
    emitDate() {
      if (!this.isValidDate) return
      const fullYear = 1900 + parseInt(this.year)
      const dateStr = `${fullYear}-${this.month.padStart(
        2,
        '0'
      )}-${this.day.padStart(2, '0')}`
      this.$emit('date-selected', dateStr)
    },
    randomDate() {
      const start = new Date('1965-01-01')
      const end = new Date('1995-12-31')
      const date = new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      )

      this.month = String(date.getMonth() + 1).padStart(2, '0')
      this.day = String(date.getDate()).padStart(2, '0')
      this.year = String(date.getFullYear() - 1900).padStart(2, '0')
      this.emitDate()
    }
  }
}
</script>

<style scoped>
.delorean-date {
  background: #414549;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.date-display {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.label {
  color: #ff0000;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  margin-bottom: 5px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.display-box {
  background: #000;
  padding: 10px;
  border-radius: 4px;
  width: 80px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

input {
  background: transparent;
  border: none;
  color: #ff0000;
  font-family: 'DSEG7', monospace;
  font-size: 48px;
  width: 100%;
  text-align: center;
  outline: none;
}

input::placeholder {
  color: #440000;
}

.buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

button {
  background: #333;
  color: #ff0000;
  border: 1px solid #ff0000;
  padding: 8px 16px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover:not(:disabled) {
  background: #444;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.almanac-icon {
  height: 41px;  /* Match button height */
  width: auto;
  object-fit: contain;
  cursor: pointer;
}
</style>
