const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const parseDateValue = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateYmd = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return '-';
  return parsed.toISOString().slice(0, 10);
};

export const parseBillingMonthLabel = (value) => {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const parsed = new Date(`${match[1]} 1, ${match[2]}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getNextBillingMonthLabel = (value) => {
  const parsed = parseBillingMonthLabel(value);
  if (!parsed) return '';
  const next = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 1);
  return next.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const getMonthYearFromRecord = ({ billingMonth, dueDate }) => {
  const billingDate = parseBillingMonthLabel(billingMonth);
  if (billingDate) {
    return {
      year: billingDate.getFullYear(),
      month: billingDate.getMonth(),
      label: `${MONTH_NAMES[billingDate.getMonth()]} ${billingDate.getFullYear()}`,
    };
  }

  const parsedDueDate = parseDateValue(dueDate);
  if (!parsedDueDate) return null;

  return {
    year: parsedDueDate.getFullYear(),
    month: parsedDueDate.getMonth(),
    label: `${MONTH_NAMES[parsedDueDate.getMonth()]} ${parsedDueDate.getFullYear()}`,
  };
};

export const toDisplayPaymentStatus = (status, dueDate) => {
  const normalizedStatus = String(status || '').toLowerCase().trim();
  const dueDateObj = parseDateValue(dueDate);
  const now = Date.now();

  if (['paid', 'approved', 'verified'].includes(normalizedStatus)) {
    return 'Paid';
  }

  if (normalizedStatus === 'overdue') {
    return 'Overdue';
  }

  if (dueDateObj && dueDateObj.getTime() < now) {
    return 'Overdue';
  }

  return 'Not Paid';
};

export const buildMonthYearOptions = (rows) => {
  const optionMap = new Map();

  rows.forEach((row) => {
    const parsed = getMonthYearFromRecord({
      billingMonth: row.billingMonth,
      dueDate: row.dueDateRaw || row.dueDate,
    });

    if (!parsed) return;

    const key = `${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}`;

    if (!optionMap.has(key)) {
      optionMap.set(key, {
        key,
        year: parsed.year,
        month: parsed.month,
        monthLabel: MONTH_NAMES[parsed.month],
        label: parsed.label,
      });
    }
  });

  return Array.from(optionMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

export const buildCalendarMatrix = (year, month) => {
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return [];
  }

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDayOfWeek; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
};
