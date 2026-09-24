const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const getPaginationOptions = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildPagination = (totalItems, page, limit) => ({
  currentPage: page,
  totalPages: Math.max(Math.ceil(totalItems / limit), 1),
  totalItems,
  hasNextPage: page < Math.ceil(totalItems / limit),
  hasPrevPage: page > 1,
});

const paginateResults = {
  getPaginationOptions,
  buildPagination,
};

module.exports = paginateResults;