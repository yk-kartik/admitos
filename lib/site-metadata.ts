import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const siteMetadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "AdmitOS | Your admissions, in focus",
    template: "%s | AdmitOS",
  },
  description:
    "A thoughtful workspace for planning your international university journey.",
  applicationName: "AdmitOS",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    siteName: "AdmitOS",
    title: "AdmitOS | Your admissions, in focus",
    description:
      "A thoughtful workspace for planning your international university journey.",
  },
  robots: { index: true, follow: true },
};

export function noIndexMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}
