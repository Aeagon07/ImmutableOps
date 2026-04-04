export const formatTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(date));
};

export const formatISO = (date) => {
  return new Date(date).toISOString();
};

export const addMinutes = (date, minutes) => {
  const newDate = new Date(date);
  newDate.setMinutes(newDate.getMinutes() + minutes);
  return newDate;
};

export const minutesFromNow = (minutes) => {
  return addMinutes(new Date(), minutes);
};

export const timeInputToISO = (timeString, baseDate = new Date()) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const newDate = new Date(baseDate);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate.toISOString();
};
