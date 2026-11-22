import type { Metadata } from "next";
import { PageTransition } from "../../components/PageTransition";
import { WorkspaceChrome } from "../../components/WorkspaceChrome";
import { ReviewClient } from "./ReviewClient";

export const metadata: Metadata = { title: "Review the bill" };

export default function ReviewPage() {
  return (
    <WorkspaceChrome caseDependent>
      <PageTransition>
        <main id="main" tabIndex={-1} className="wrap workspace">
          <ReviewClient />
        </main>
      </PageTransition>
    </WorkspaceChrome>
  );
}
