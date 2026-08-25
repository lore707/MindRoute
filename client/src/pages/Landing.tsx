import { useLocation } from "wouter";
import { LandingEditorial } from "@/components/LandingEditorial";
import { track } from "@/lib/analytics";

export default function Landing() {
  const [, navigate] = useLocation();

  return (
    <LandingEditorial
      // Il CTA misura il passaggio al gate di accesso prima dell'onboarding.
      onStart={() => {
        track("quiz_cta_click");
        navigate("/start");
      }}
    />
  );
}
