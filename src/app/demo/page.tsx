import type { Metadata } from "next";
import { ReferenceDemoClient } from "@/components/demo/reference-demo-client";

export const metadata: Metadata = {
  title: "Foundation Engine Demo — CST505 Simulation Suite",
};

export default function DemoPage() {
  return <ReferenceDemoClient />;
}
