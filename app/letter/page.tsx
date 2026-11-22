import type { Metadata } from "next";
import { PageTransition } from "../../components/PageTransition";
import { WorkspaceChrome } from "../../components/WorkspaceChrome";
import { LetterClient } from "./LetterClient";

export const metadata: Metadata = { title: "Draft the letter" };

export default function LetterPage() {
  return (
    <WorkspaceChrome caseDependent>
      <PageTransition>
        <main id="main" tabIndex={-1} className="wrap workspace">
          <LetterClient />
        </main>
      </PageTransition>
    </WorkspaceChrome>
  );
}
