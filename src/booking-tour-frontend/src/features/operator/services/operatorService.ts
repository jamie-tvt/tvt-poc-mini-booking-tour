import { api } from "@/lib/api/client";
import type { PageResponse } from "@/types/api";
import type { DepartureDto, DepartureStatus, GuideDepartureDetail } from "@/types/domain";

export const operatorService = {
  departures: (status?: DepartureStatus) =>
    api.get<DepartureDto[] | PageResponse<DepartureDto>>("/guide/departures", { status }),
  departure: (id: number | string) => api.get<GuideDepartureDetail>(`/guide/departures/${id}`),
  start: (id: number) => api.post<unknown>(`/guide/departures/${id}/start`),
  finish: (id: number) => api.post<unknown>(`/guide/departures/${id}/finish`),
};
