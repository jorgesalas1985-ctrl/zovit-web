import { Suspense } from "react";
import MobileCapturePageClient from "./MobileCapturePageClient";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MobileCapturePage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  return (
    <Suspense fallback={null}>
      <MobileCapturePageClient searchParams={resolvedSearchParams} />
    </Suspense>
  );
}
