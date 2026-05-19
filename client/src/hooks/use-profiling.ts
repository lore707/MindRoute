import { useMutation, useQuery } from "@tanstack/react-query";
import { api, buildUrl, type ProfilingInput } from "@shared/routes";

export function useSubmitProfiling() {
  return useMutation({
    mutationFn: async (data: ProfilingInput) => {
      const res = await fetch(api.profiling.submit.path, {
        method: api.profiling.submit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit profiling");
      }
      return api.profiling.submit.responses[200].parse(await res.json());
    },
  });
}

export function useItinerary(destinationId: number, disabled?: boolean) {
  return useQuery({
    queryKey: [api.itinerary.get.path, destinationId],
    queryFn: async () => {
      const url = buildUrl(api.itinerary.get.path, { destinationId });
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch itinerary");
      }
      return api.itinerary.get.responses[200].parse(await res.json());
    },
    enabled: !!destinationId && !isNaN(destinationId) && !disabled,
    retry: false,
  });
}

export function useMapPointsPolling(itineraryId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["mappoints", itineraryId],
    queryFn: async () => {
      const res = await fetch(`/api/itinerary/${itineraryId}/mappoints`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: enabled && !!itineraryId,
    refetchInterval: (query) => {
      if (query.state.data?.ready) return false;
      return 3000; // riprova ogni 3 secondi finché non sono pronti
    },
    staleTime: Infinity,
  });
}

export function getStoredDestinations() {
  try {
    const stored = sessionStorage.getItem("mind_destinations");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}
