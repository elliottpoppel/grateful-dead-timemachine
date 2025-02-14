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
      <button 
        class="destination-time" 
        @click="emitDestinationTime"
        :disabled="!isValidDate"
      >
        SET DESTINATION TIME
      </button>
      <button 
        class="random" 
        @click="$emit('random')"
      >
        RANDOM
      </button>
      <img 
        src="../assets/images/grayssportsalmanac.png" 
        class="almanac-icon" 
        @click="$emit('show-list')"
        alt="Show List"
      />
    </div>
  </div>
</template>

<script>
export default {
  emits: ['date-selected', 'destination-time', 'random', 'show-list'],
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
      // Simple date validation without creating Date objects
      const month = parseInt(this.month)
      const day = parseInt(this.day)
      const year = fullYear

      // Basic range checks
      if (month < 1 || month > 12) return false
      if (day < 1 || day > 31) return false
      if (year < 1965 || year > 1995) return false

      // Check days in month (including leap years)
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      if (year % 4 === 0) daysInMonth[1] = 29
      if (day > daysInMonth[month - 1]) return false

      return true
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
      const dateStr = `${this.month.padStart(2, '0')}/${this.day.padStart(2, '0')}/${this.year.padStart(2, '0')}`
      this.$emit('date-selected', dateStr)
    },
    randomDate() {
      const start = new Date(Date.UTC(1965, 0, 1))
      const end = new Date(Date.UTC(1995, 11, 31))
      const date = new Date(
        start.getTime() + Math.random() * (end.getTime() - start.getTime())
      )

      this.month = String(date.getUTCMonth() + 1).padStart(2, '0')
      this.day = String(date.getUTCDate()).padStart(2, '0')
      this.year = String(date.getUTCFullYear() - 1900).padStart(2, '0')
      this.emitDate()
    },
    setDate(dateStr) {
      // Parse the incoming MM/DD/YY format
      const [month, day, year] = dateStr.split('/')
      this.month = month.padStart(2, '0')
      this.day = day.padStart(2, '0')
      this.year = year.padStart(2, '0')
    },
    emitDestinationTime() {
      if (!this.isValidDate) return
      const dateStr = `${this.month.padStart(2, '0')}/${this.day.padStart(2, '0')}/${this.year.padStart(2, '0')}`
      this.$emit('destination-time', dateStr)
    }
  }
}
</script>

<style scoped>
.delorean-date {
  background: #414549;
  padding: 20px;
  border-radius: 10px;
  margin: 20px 0;
}

@media (max-width: 600px) {
  .delorean-date {
    padding: 15px;
    margin: 10px;
  }
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
  border-radius: 4px;
  padding: 8px;
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
