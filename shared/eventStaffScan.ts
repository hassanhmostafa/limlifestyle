/** Camera scans are identifiers, never navigable URLs or session/login tokens. */
export function parseEventStaffScan(raw:string):string|null {
 const value=raw.trim().replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
 if(/^LIM-[A-Z0-9]+(?:-[A-Z0-9]+)*$/i.test(value)&&value.length<=80)return value.toUpperCase();
 if(/^P\d+-V\d+$/i.test(value)&&value.length<=80)return value.toUpperCase();
 // Existing kiosk ID is decimal; server lookup is responsible for exact visit binding and track scope.
 if(/^\d{4,20}$/.test(value))return value;
 return null;
}
