// "use client";

// import React, { useEffect, useRef, useState } from "react";
// import { Calendar } from "lucide-react";
// import { Modal } from "./Modal";

// interface ExtendExpiryModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   /** Pre-formatted current expiry date, e.g. "Oct 04, 2024" — for display only. */
//   currentExpiryDateLabel: string;
//   /** ISO date (yyyy-mm-dd) of the current expiry — also the earliest allowed new date. */
//   currentExpiryDate: string;
//   onSet: (newExpiryDate: string) => void;
// }

// export const ExtendExpiryModal: React.FC<ExtendExpiryModalProps> = ({
//   isOpen,
//   onClose,
//   currentExpiryDateLabel,
//   currentExpiryDate,
//   onSet,
// }) => {
//   const [newExpiryDate, setNewExpiryDate] = useState(currentExpiryDate);
//   const [error, setError] = useState("");
//   const dateInputRef = useRef<HTMLInputElement>(null);

//   // Reset the field each time the modal is (re)opened.
//   useEffect(() => {
//     if (isOpen) {
//       setNewExpiryDate(currentExpiryDate);
//       setError("");
//     }
//   }, [isOpen, currentExpiryDate]);

//   const handleChangeDate = (value: string) => {
//     setNewExpiryDate(value);
//     if (error) setError("");
//   };

//   const handleSet = () => {
//     if (newExpiryDate < currentExpiryDate) {
//       setError("New expiry date can't be before the current expiry date.");
//       return;
//     }
//     onSet(newExpiryDate);
//     onClose();
//   };

//   const openNativePicker = () => {
//     // showPicker isn't supported in every browser — fall back to focusing
//     // the input, which still lets the user open the picker via keyboard/click.
//     try {
//       dateInputRef.current?.showPicker?.();
//     } catch {
//       dateInputRef.current?.focus();
//     }
//   };

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={onClose}
//       title="Extend expiry date"
//       footer={
//         <>
//           <button
//             type="button"
//             onClick={onClose}
//             className="text-xs font-medium text-slate-600 underline hover:text-slate-900 transition-colors"
//           >
//             Cancel
//           </button>
//           <span className="text-xs text-slate-400">or</span>
//           <button
//             type="button"
//             onClick={handleSet}
//             className="px-4 py-1.5 rounded-md bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
//           >
//             Set
//           </button>
//         </>
//       }
//     >
//       <div className="flex items-center justify-between gap-4">
//         <span className="text-xs font-medium text-slate-500">
//           Current expiry date
//         </span>
//         <span className="text-xs font-semibold text-slate-800">
//           {currentExpiryDateLabel}
//         </span>
//       </div>

//       <div className="space-y-1.5">
//         <div className="flex items-center justify-between gap-4">
//           <label
//             htmlFor="new-expiry-date"
//             className="text-xs font-medium text-slate-500 shrink-0"
//           >
//             New expiry date
//           </label>
//           <div className="relative w-40">
//             <input
//               ref={dateInputRef}
//               id="new-expiry-date"
//               type="date"
//               value={newExpiryDate}
//               min={currentExpiryDate}
//               onChange={(e) => handleChangeDate(e.target.value)}
//               className={`w-full pl-3 pr-8 py-1.5 rounded-md border text-xs text-slate-700 bg-transparent focus:outline-none focus:ring-2 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
//                 error
//                   ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
//                   : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500"
//               }`}
//             />
//             <button
//               type="button"
//               tabIndex={-1}
//               onClick={openNativePicker}
//               className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 pointer-events-none"
//             >
//               <Calendar className="w-3.5 h-3.5" />
//             </button>
//           </div>
//         </div>
//         {error && (
//           <p className="text-[11px] text-rose-500 text-right">{error}</p>
//         )}
//       </div>
//     </Modal>
//   );
// };

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { Modal } from "./Modal";

interface ExtendExpiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-formatted current expiry date, e.g. "Oct 04, 2024" — for display only. */
  currentExpiryDateLabel: string;
  /** ISO date (yyyy-mm-dd) of the current expiry — also the earliest allowed new date. */
  currentExpiryDate: string;
  onSet: (newExpiryDate: string) => void;
}

export const ExtendExpiryModal: React.FC<ExtendExpiryModalProps> = ({
  isOpen,
  onClose,
  currentExpiryDateLabel,
  currentExpiryDate,
  onSet,
}) => {
  const [newExpiryDate, setNewExpiryDate] = useState(currentExpiryDate ?? "");
  const [error, setError] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Reset the field each time the modal is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setNewExpiryDate(currentExpiryDate ?? "");
      setError("");
    }
  }, [isOpen, currentExpiryDate]);

  const handleChangeDate = (value: string) => {
    setNewExpiryDate(value);
    if (error) setError("");
  };

  const handleSet = () => {
    if (newExpiryDate < currentExpiryDate) {
      setError("New expiry date can't be before the current expiry date.");
      return;
    }
    onSet(newExpiryDate);
    onClose();
  };

  const openNativePicker = () => {
    try {
      dateInputRef.current?.showPicker?.();
    } catch {
      dateInputRef.current?.focus();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Extend expiry date"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-600 underline hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <span className="text-xs text-slate-400">or</span>
          <button
            type="button"
            onClick={handleSet}
            className="px-4 py-1.5 rounded-md bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
          >
            Set
          </button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-slate-500">
          Current expiry date
        </span>
        <span className="text-xs font-semibold text-slate-800">
          {currentExpiryDateLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="new-expiry-date"
            className="text-xs font-medium text-slate-500 shrink-0"
          >
            New expiry date
          </label>
          <div className="relative w-40">
            <input
              ref={dateInputRef}
              id="new-expiry-date"
              type="date"
              value={newExpiryDate || ""}
              min={currentExpiryDate}
              onChange={(e) => handleChangeDate(e.target.value)}
              className={`w-full pl-3 pr-8 py-1.5 rounded-md border text-xs text-slate-700 bg-transparent focus:outline-none focus:ring-2 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                error
                  ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                  : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500"
              }`}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={openNativePicker}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 pointer-events-none"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {error && (
          <p className="text-[11px] text-rose-500 text-right">{error}</p>
        )}
      </div>
    </Modal>
  );
};
