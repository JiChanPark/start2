export const todayKey = () => new Date().toISOString().slice(0, 10);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
