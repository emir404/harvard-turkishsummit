import type { Metadata } from "next";
import { RegistrationPage } from "@/components/registration/registration-page";

export const metadata: Metadata = {
  title: "Summit registration",
};

export default function SummitRegistration() {
  return <RegistrationPage ticket="summit" />;
}
