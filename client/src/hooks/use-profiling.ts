import { useMutation, useQuery } from "@tanstack/react-query";
import { api, buildUrl, type ProfilingInput } from "@shared/routes";
import { useLocation } from "wouter";

// Submit profiling data to get destinations
export function useSubmitProfiling() {
  const [, setLocation] = useLocation();

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
    onSuccess: (data) => {
      // Store destinations in session storage or state management to pass to next page
      // For simplicity in this demo, we might store in sessionStorage
      sessionStorage.setItem("mind_destinations", JSON.stringify(data));
      setLocation("/destinations");
    },
  });
}

// Get itinerary for a specific destination
export function useItinerary(destinationId: number) {
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
    enabled: !!destinationId && !isNaN(destinationId),
  });
}

// Helper to get stored destinations (client-side only helper, not a hook)
export function getStoredDestinations() {
  try {
    const stored = sessionStorage.getItem("mind_destinations");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}
