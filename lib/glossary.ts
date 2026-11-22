// Plain-language notes written for Second Opinion. They are summaries, not official code descriptors,
// and cover only codes we are confident about. Unknown codes get no note rather than a guess.

export type CodeSystem = "CPT" | "HCPCS" | "Revenue code";

export interface CodeNote {
  system: CodeSystem;
  name: string;
  plain: string;
}

const NOTES: Record<string, CodeNote> = {
  "99283": { system: "CPT", name: "Emergency visit, level 3 of 5", plain: "For a clinician's charge, this level reflects relatively limited medical decision-making. A hospital's facility charge uses its own resource guidelines. Ask which type of charge this is and how its level was assigned." },
  "99284": { system: "CPT", name: "Emergency visit, level 4 of 5", plain: "For a clinician's charge, this level reflects moderate medical decision-making. A hospital's facility charge uses its own resource guidelines. Ask how this level was assigned." },
  "99285": { system: "CPT", name: "Emergency visit, level 5 of 5", plain: "For a clinician's charge, this level reflects high medical decision-making. A hospital's facility charge uses its own resource guidelines. Ask what supported level 5 for this charge." },
  "99223": { system: "CPT", name: "Initial hospital care, highest level", plain: "An initial evaluation during inpatient or observation care, at the highest of three levels. Initial care does not always fall on the day of admission; ask which clinician or specialty provided it." },
  "99232": { system: "CPT", name: "Follow-up hospital care", plain: "A follow-up evaluation during inpatient or observation care, at the middle of three levels. Ask which clinician or specialty provided it." },
  "99238": { system: "CPT", name: "Discharge day management", plain: "The physician's work on the day you leave: final exam, instructions and paperwork." },
  "85025": { system: "CPT", name: "Complete blood count (CBC)", plain: "A common blood test that counts red cells, white cells by type, and platelets." },
  "80048": { system: "CPT", name: "Basic metabolic panel", plain: "A group of blood tests for kidney function, electrolytes and blood sugar." },
  "80053": { system: "CPT", name: "Comprehensive metabolic panel", plain: "A wider group of blood chemistry tests: kidney and liver function, electrolytes, proteins and blood sugar." },
  "84484": { system: "CPT", name: "Troponin test", plain: "A blood test for a protein released when heart muscle is strained or damaged. Often repeated a few hours apart." },
  "85610": { system: "CPT", name: "Prothrombin time (PT)", plain: "A blood test that measures how quickly your blood clots." },
  "36415": { system: "CPT", name: "Blood draw", plain: "The fee for drawing blood from a vein with a needle, separate from the lab tests run on the sample." },
  "81001": { system: "CPT", name: "Urinalysis", plain: "An automated urine test that includes a microscope review." },
  "71046": { system: "CPT", name: "Chest X-ray, two views", plain: "A chest X-ray taken from two angles." },
  "74177": { system: "CPT", name: "CT of abdomen and pelvis, with contrast", plain: "A CT scan of the belly and pelvis using contrast dye. The dye itself is usually billed on a separate line." },
  "93005": { system: "CPT", name: "ECG recording", plain: "Recording an electrocardiogram (heart tracing). The physician's reading of it is often billed separately." },
  "96360": { system: "CPT", name: "IV fluids, first hour", plain: "Giving fluids through an IV for the first 31 minutes to one hour." },
  "96374": { system: "CPT", name: "IV push, first drug", plain: "Injecting a medication directly into an IV line over a short time. This code is for the first drug." },
  "96375": { system: "CPT", name: "IV push, each additional drug", plain: "Each additional, different medication pushed through the IV after the first." },
  J1885: { system: "HCPCS", name: "Ketorolac, per 15 mg", plain: "A non-opioid pain reliever given by injection. Quantity counts 15 mg units, so a 30 mg dose is billed as 2." },
  J2405: { system: "HCPCS", name: "Ondansetron, per 1 mg", plain: "An anti-nausea medication. Quantity counts 1 mg units, so a 4 mg dose is billed as 4." },
  J7030: { system: "HCPCS", name: "Saline, 1,000 cc", plain: "One liter bag of salt-water IV fluid." },
  Q9967: { system: "HCPCS", name: "Contrast dye, per ml", plain: "Low-osmolar contrast used to make CT images clearer. Quantity is in milliliters." },
  "0110": { system: "Revenue code", name: "Private room", plain: "Room and board in a private room, billed per day." },
  "0120": { system: "Revenue code", name: "Semi-private room", plain: "Room and board in a two-bed room, billed per day." },
  "0250": { system: "Revenue code", name: "Pharmacy, general", plain: "A general pharmacy category. It doesn't say which drugs, doses or dates; you can ask for that detail." },
  "0270": { system: "Revenue code", name: "Medical and surgical supplies, general", plain: "A general supplies category. It doesn't say what was used; you can ask for an itemized list." },
};

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function lookupCode(code: string): CodeNote | null {
  return NOTES[normalizeCode(code)] ?? null;
}

/** Room-and-board revenue categories, excluding 018x leave-of-absence / room-holding charges. */
export function isRoomAndBoardCode(code: string): boolean {
  const normalized = normalizeCode(code);
  // Spreadsheets commonly drop a revenue code's leading zero.
  if (!/^0?\d{3}$/.test(normalized)) return false;
  const value = Number(normalized);
  return value >= 110 && value <= 219 && !(value >= 180 && value <= 189);
}

export const NOTE_SOURCE = "Plain-language summary written for Second Opinion. Not an official code description; confirm with the billing office.";
