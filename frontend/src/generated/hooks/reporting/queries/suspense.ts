// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { DownloadsService, ReportsService } from "../requests/services.gen";
import { ReportFormat, ReportStatus, ReportType } from "../requests/types.gen";
import * as Common from "./common";
export const useReportsServiceGetReportsSuspense = <TData = Common.ReportsServiceGetReportsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ createdBy, endDate, format, limit, page, startDate, status, type }: {
  createdBy?: string;
  endDate?: string;
  format?: ReportFormat;
  limit?: number;
  page?: number;
  startDate?: string;
  status?: ReportStatus;
  type?: ReportType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseReportsServiceGetReportsKeyFn({ createdBy, endDate, format, limit, page, startDate, status, type }, queryKey), queryFn: () => ReportsService.getReports({ createdBy, endDate, format, limit, page, startDate, status, type }) as TData, ...options });
export const useReportsServiceGetReportsByIdSuspense = <TData = Common.ReportsServiceGetReportsByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseReportsServiceGetReportsByIdKeyFn({ id }, queryKey), queryFn: () => ReportsService.getReportsById({ id }) as TData, ...options });
export const useDownloadsServiceGetReportsDownloadByIdSuspense = <TData = Common.DownloadsServiceGetReportsDownloadByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id, inline }: {
  id: string;
  inline?: boolean;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useSuspenseQuery<TData, TError>({ queryKey: Common.UseDownloadsServiceGetReportsDownloadByIdKeyFn({ id, inline }, queryKey), queryFn: () => DownloadsService.getReportsDownloadById({ id, inline }) as TData, ...options });
