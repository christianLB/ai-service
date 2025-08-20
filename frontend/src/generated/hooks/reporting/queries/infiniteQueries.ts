// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { InfiniteData, UseInfiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { ReportsService } from "../requests/services.gen";
import { ReportFormat, ReportStatus, ReportType } from "../requests/types.gen";
import * as Common from "./common";
export const useReportsServiceGetReportsInfinite = <TData = InfiniteData<Common.ReportsServiceGetReportsDefaultResponse>, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ createdBy, endDate, format, limit, startDate, status, type }: {
  createdBy?: string;
  endDate?: string;
  format?: ReportFormat;
  limit?: number;
  startDate?: string;
  status?: ReportStatus;
  type?: ReportType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseInfiniteQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useInfiniteQuery({
  queryKey: Common.UseReportsServiceGetReportsKeyFn({ createdBy, endDate, format, limit, startDate, status, type }, queryKey), queryFn: ({ pageParam }) => ReportsService.getReports({ createdBy, endDate, format, limit, page: pageParam as number, startDate, status, type }) as TData, initialPageParam: "1", getNextPageParam: response => (response as {
    nextPage: string;
  }).nextPage, ...options
});
