import type { Metadata } from "next";
import { SessionWorkspace } from "@/components/session/SessionWorkspace";

export const metadata: Metadata = {
  title: "COUNCIL Session Workspace",
  description: "Multi-agent editorial boardroom debate and synthesis workspace.",
};

export default function SessionPage() {
  return <SessionWorkspace />;
}
