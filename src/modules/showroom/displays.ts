import { defaultSlotRecords, recordsToSlots } from "./slots";

/** The shipped fixture layout. The live layout comes from the database (see the admin showroom editor); this is its seed and the test baseline. */
export const SLOTS = recordsToSlots(defaultSlotRecords());
