// utils/timeFormatter.js

export const pad = (num) => String(num).padStart(2, '0');

export const formatTime = (timestamp, interval) => {
  const date = new Date(timestamp);
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const year = date.getFullYear();

  switch (interval) {
    case '1s':
    case '1m':
      return `${hours}:${minutes}`;
    case '5m':
      return `${month}/${day} ${hours}:${minutes}`;
    case '30m':
    case '4h':
      return `${month}/${day}`;
    case '1d':
      return `${year}/${month}`;
    default:
      return '';
  }
};

export const shouldShowTick = (timestamp, interval) => {
  const date = new Date(timestamp);
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const day = date.getDate();
  const month = date.getMonth(); // 0-based index
  const year = date.getFullYear();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();

  switch (interval) {
    case '1s':
      // Show ticks at exact multiples of 5 minutes
      return (
        minutes % 5 === 0 &&
        seconds === 0 &&
        milliseconds === 0
      );

    case '1m':
      // Show ticks at exact multiples of 30 minutes
      return (
        minutes % 30 === 0 &&
        seconds === 0 &&
        milliseconds === 0
      );

    case '5m':
      // Show ticks only at 00:00 and 12:00
      return (
        (hours === 0 || hours === 12) &&
        minutes === 0 &&
        seconds === 0 &&
        milliseconds === 0
      );

    case '30m':
      // Show ticks once per day at 00:00
      return (
        hours === 0 &&
        minutes === 0 &&
        seconds === 0 &&
        milliseconds === 0
      );

    case '4h':
      // Show ticks every seven days at 00:00
      return (
        day % 7 === 0 &&
        hours === 0 &&
        minutes === 0 &&
        seconds === 0 &&
        milliseconds === 0
      );

    case '1d':
      // Show ticks on the first day of each quarter at 00:00
      return (
        day === 1 &&
        (month === 0 || month === 3 || month === 6 || month === 9) && // January, April, July, October
        hours === 0 &&
        minutes === 0 &&
        seconds === 0 &&
        milliseconds === 0
      );

    default:
      return false;
  }
};
