// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { UseMutationOptions, UseQueryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { DownloadsService, GenerationService, ReportsService } from "../requests/services.gen";
import { GenerateReportRequest, ReportFormat, ReportStatus, ReportType } from "../requests/types.gen";
import * as Common from "./common";
export const useReportsServiceGetReports = <TData = Common.ReportsServiceGetReportsDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ createdBy, endDate, format, limit, page, startDate, status, type }: {
  createdBy?: string;
  endDate?: string;
  format?: ReportFormat;
  limit?: number;
  page?: number;
  startDate?: string;
  status?: ReportStatus;
  type?: ReportType;
} = {}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseReportsServiceGetReportsKeyFn({ createdBy, endDate, format, limit, page, startDate, status, type }, queryKey), queryFn: () => ReportsService.getReports({ createdBy, endDate, format, limit, page, startDate, status, type }) as TData, ...options });
export const useReportsServiceGetReportsById = <TData = Common.ReportsServiceGetReportsByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id }: {
  id: string;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseReportsServiceGetReportsByIdKeyFn({ id }, queryKey), queryFn: () => ReportsService.getReportsById({ id }) as TData, ...options });
export const useDownloadsServiceGetReportsDownloadById = <TData = Common.DownloadsServiceGetReportsDownloadByIdDefaultResponse, TError = unknown, TQueryKey extends Array<unknown> = unknown[]>({ id, inline }: {
  id: string;
  inline?: boolean;
}, queryKey?: TQueryKey, options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">) => useQuery<TData, TError>({ queryKey: Common.UseDownloadsServiceGetReportsDownloadByIdKeyFn({ id, inline }, queryKey), queryFn: () => DownloadsService.getReportsDownloadById({ id, inline }) as TData, ...options });
export const useGenerationServicePostReportsGenerate = <TData = Common.GenerationServicePostReportsGenerateMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  requestBody: GenerateReportRequest;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  requestBody: GenerateReportRequest;
}, TContext>({ mutationFn: ({ requestBody }) => GenerationService.postReportsGenerate({ requestBody }) as unknown as Promise<TData>, ...options });
export const useReportsServiceDeleteReportsById = <TData = Common.ReportsServiceDeleteReportsByIdMutationResult, TError = unknown, TContext = unknown>(options?: Omit<UseMutationOptions<TData, TError, {
  id: string;
}, TContext>, "mutationFn">) => useMutation<TData, TError, {
  id: string;
}, TContext>({ mutationFn: ({ id }) => ReportsService.deleteReportsById({ id }) as unknown as Promise<TData>, ...options });
