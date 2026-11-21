import type { Metadata } from "next";
import { RegistrationPage } from "@/components/registration/registration-page";

export const metadata: Metadata = {
  title: "Gala registration",
};

export default function GalaRegistration() {
  return <RegistrationPage ticket="gala" />;
}
