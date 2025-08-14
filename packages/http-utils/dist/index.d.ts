export type Pagination = {
    page: number;
    limit: number;
    skip: number;
};
export declare function parsePagination(query: Record<string, unknown>): Pagination;
