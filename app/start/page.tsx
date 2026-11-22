import type { Metadata } from "next";
import { PageTransition } from "../../components/PageTransition";
import { WorkspaceChrome } from "../../components/WorkspaceChrome";
import { listSamples } from "../../lib/samples";
import { StartClient } from "./StartClient";

export const metadata: Metadata = { title: "Start with a bill" };

export default function StartPage() {
  return (
    <WorkspaceChrome>
      <PageTransition>
        <main id="main" tabIndex={-1} className="wrap workspace">
          <StartClient samples={listSamples()} />
        </main>
      </PageTransition>
    </WorkspaceChrome>
  );
}
