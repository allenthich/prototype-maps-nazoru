export const PER_PAGE = 20;

export const readPage = (url: URL) => {
  const n = Number(url.searchParams.get('page') ?? '1');
  return Number.isInteger(n) && n > 0 ? n : 1;
};
