// generated with @7nohe/openapi-react-query-codegen@1.6.2 

import { type QueryClient } from "@tanstack/react-query";
import { DownloadsService, ReportsService } from "../requests/services.gen";
import { ReportFormat, ReportStatus, ReportType } from "../requests/types.gen";
import * as Common from "./common";
export const ensureUseReportsServiceGetReportsData = (queryClient: QueryClient, { createdBy, endDate, format, limit, page, startDate, status, type }: {
  createdBy?: string;
  endDate?: string;
  format?: ReportFormat;
  limit?: number;
  page?: number;
  startDate?: string;
  status?: ReportStatus;
  type?: ReportType;
} = {}) => queryClient.ensureQueryData({ queryKey: Common.UseReportsServiceGetReportsKeyFn({ createdBy, endDate, format, limit, page, startDate, status, type }), queryFn: () => ReportsService.getReports({ createdBy, endDate, format, limit, page, startDate, status, type }) });
export const ensureUseReportsServiceGetReportsByIdData = (queryClient: QueryClient, { id }: {
  id: string;
}) => queryClient.ensureQueryData({ queryKey: Common.UseReportsServiceGetReportsByIdKeyFn({ id }), queryFn: () => ReportsService.getReportsById({ id }) });
export const ensureUseDownloadsServiceGetReportsDownloadByIdData = (queryClient: QueryClient, { id, inline }: {
  id: string;
  inline?: boolean;
}) => queryClient.ensureQueryData({ queryKey: Common.UseDownloadsServiceGetReportsDownloadByIdKeyFn({ id, inline }), queryFn: () => DownloadsService.getReportsDownloadById({ id, inline }) });
