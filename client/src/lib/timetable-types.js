export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Period definitions (IDENTICAL behavior to Lovable)
export const DEFAULT_PERIODS = [
  { number: 1, start: "08:00", end: "08:45", isBreak: false },
  { number: 2, start: "08:45", end: "09:30", isBreak: false },
  { number: 3, start: "09:30", end: "10:15", isBreak: false },

  {
    number: 0,
    start: "10:15",
    end: "10:30",
    isBreak: true,
    label: "Short Break",
  },

  { number: 4, start: "10:30", end: "11:15", isBreak: false },
  { number: 5, start: "11:15", end: "12:00", isBreak: false },

  {
    number: 0,
    start: "12:00",
    end: "12:45",
    isBreak: true,
    label: "Lunch Break",
  },

  { number: 6, start: "12:45", end: "13:30", isBreak: false },
  { number: 7, start: "13:30", end: "14:15", isBreak: false },
  { number: 8, start: "14:15", end: "15:00", isBreak: false },
];