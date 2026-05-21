export const parseEventDateInput = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }

  const ukMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }

  return null;
};

export const isValidEventDate = (date) =>
  date instanceof Date && !Number.isNaN(date.getTime());

export const toApiDate = (value) => {
  const parsed = parseEventDateInput(value);
  return isValidEventDate(parsed) ? parsed.toISOString() : null;
};

export const formatEventDate = (value) => {
  if (!value) return 'Date to be confirmed';
  const date = new Date(value);
  if (!isValidEventDate(date)) return 'Date to be confirmed';

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatEventDateRange = (startValue, endValue) => {
  if (!startValue && !endValue) return 'Dates to be confirmed';
  if (!endValue || startValue === endValue) return formatEventDate(startValue);

  const startDate = new Date(startValue);
  const endDate = new Date(endValue);
  if (!isValidEventDate(startDate) || !isValidEventDate(endDate)) {
    return formatEventDate(startValue);
  }

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const sameMonth = sameYear && startDate.getMonth() === endDate.getMonth();

  if (sameMonth) {
    return `${startDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
    })} - ${endDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }

  return `${formatEventDate(startValue)} - ${formatEventDate(endValue)}`;
};

export const getCountdownParts = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (!isValidEventDate(date)) return null;

  const diff = date.getTime() - Date.now();
  const absDiff = Math.abs(diff);
  const totalHours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return {
    isPast: diff < 0,
    days,
    hours,
  };
};

export const getCountdownLabel = (value) => {
  const countdown = getCountdownParts(value);
  if (!countdown) return 'Set a date to start the countdown';

  if (countdown.isPast) {
    if (countdown.days === 0) return 'Today is party day';
    return `${countdown.days} day${countdown.days === 1 ? '' : 's'} since the party`;
  }

  if (countdown.days === 0) {
    return `${countdown.hours || 1} hour${countdown.hours === 1 ? '' : 's'} to go`;
  }

  return `${countdown.days} day${countdown.days === 1 ? '' : 's'} to go`;
};

export const getEventMediaWindows = (event = {}) => {
  const now = new Date();
  const startDate = event.event_date ? new Date(event.event_date) : null;
  const endDate = event.event_end_date ? new Date(event.event_end_date) : startDate;
  const tier = event.event_tier || 'prime';

  const validStart = isValidEventDate(startDate) ? startDate : null;
  const validEnd = isValidEventDate(endDate) ? endDate : validStart;
  const uploadGraceEnd = validEnd ? new Date(validEnd.getTime() + 24 * 60 * 60 * 1000) : null;

  const downloadUntil = (() => {
    if (!validEnd || tier === 'prime') return null;
    const days = tier === 'one_day' ? 1 : 30;
    return new Date(validEnd.getTime() + days * 24 * 60 * 60 * 1000);
  })();

  const uploadsOpen =
    !validStart ||
    (now >= validStart && (!uploadGraceEnd || now <= uploadGraceEnd));

  const downloadsOpen =
    !validEnd ||
    (now >= validEnd && (!downloadUntil || now <= downloadUntil));

  const uploadStatus = (() => {
    if (!validStart) return 'Uploads are open';
    if (now < validStart) return `Uploads open ${formatEventDate(validStart)}`;
    if (uploadGraceEnd && now > uploadGraceEnd) return 'Uploads are closed';
    return 'Uploads are open';
  })();

  const downloadStatus = (() => {
    if (!validEnd) return 'Downloads are open';
    if (now < validEnd) return `Downloads open after ${formatEventDate(validEnd)}`;
    if (downloadUntil && now > downloadUntil) return 'Download window has ended';
    if (downloadUntil) return `Downloads available until ${formatEventDate(downloadUntil)}`;
    return 'Downloads available forever';
  })();

  return {
    uploadsOpen,
    downloadsOpen,
    uploadStatus,
    downloadStatus,
    downloadUntil: downloadUntil?.toISOString?.() || null,
  };
};
