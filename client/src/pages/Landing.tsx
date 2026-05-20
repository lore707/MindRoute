import { useLocation } from "wouter";
import { LandingCinematic, DEFAULT_LANDING_DATA } from "@/components/LandingCinematic";

export default function Landing() {
  const [, navigate] = useLocation();
  return (
    <LandingCinematic
      data={{
        ...DEFAULT_LANDING_DATA,
        onStart: () => navigate("/profiling"),
      }}
    />
  );
}
