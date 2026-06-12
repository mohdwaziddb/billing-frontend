export const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "--";
  }
  const date = parseDateValue(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return formatDateParts(date);
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${formatDateParts(date)} ${new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)}`;
};

export const formatDateInputDisplay = (value: string | null | undefined) => formatDate(value);

const parseDateValue = (value: string) => {
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoDateOnly) {
    return new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]));
  }
  return new Date(value);
};

const formatDateParts = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};
