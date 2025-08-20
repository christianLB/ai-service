// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseQueryResult } from "@tanstack/react-query";
import { DownloadsService, GenerationService, ReportsService } from "../requests/services.gen";
import { ReportFormat, ReportStatus, ReportType } from "../requests/types.gen";
export type ReportsServiceGetReportsDefaultResponse = Awaited<ReturnType<typeof ReportsService.getReports>>;
export type ReportsServiceGetReportsQueryResult<TData = ReportsServiceGetReportsDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useReportsServiceGetReportsKey = "ReportsServiceGetReports";
export const UseReportsServiceGetReportsKeyFn = ({ createdBy, endDate, format, limit, page, startDate, status, type }: {
  createdBy?: string;
  endDate?: string;
  format?: ReportFormat;
  limit?: number;
  page?: number;
  startDate?: string;
  status?: ReportStatus;
  type?: ReportType;
} = {}, queryKey?: Array<unknown>) => [useReportsServiceGetReportsKey, ...(queryKey ?? [{ createdBy, endDate, format, limit, page, startDate, status, type }])];
export type ReportsServiceGetReportsByIdDefaultResponse = Awaited<ReturnType<typeof ReportsService.getReportsById>>;
export type ReportsServiceGetReportsByIdQueryResult<TData = ReportsServiceGetReportsByIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useReportsServiceGetReportsByIdKey = "ReportsServiceGetReportsById";
export const UseReportsServiceGetReportsByIdKeyFn = ({ id }: {
  id: string;
}, queryKey?: Array<unknown>) => [useReportsServiceGetReportsByIdKey, ...(queryKey ?? [{ id }])];
export type DownloadsServiceGetReportsDownloadByIdDefaultResponse = Awaited<ReturnType<typeof DownloadsService.getReportsDownloadById>>;
export type DownloadsServiceGetReportsDownloadByIdQueryResult<TData = DownloadsServiceGetReportsDownloadByIdDefaultResponse, TError = unknown> = UseQueryResult<TData, TError>;
export const useDownloadsServiceGetReportsDownloadByIdKey = "DownloadsServiceGetReportsDownloadById";
export const UseDownloadsServiceGetReportsDownloadByIdKeyFn = ({ id, inline }: {
  id: string;
  inline?: boolean;
}, queryKey?: Array<unknown>) => [useDownloadsServiceGetReportsDownloadByIdKey, ...(queryKey ?? [{ id, inline }])];
export type GenerationServicePostReportsGenerateMutationResult = Awaited<ReturnType<typeof GenerationService.postReportsGenerate>>;
export type ReportsServiceDeleteReportsByIdMutationResult = Awaited<ReturnType<typeof ReportsService.deleteReportsById>>;
