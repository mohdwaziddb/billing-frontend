// Customer form + Create Invoice (naya customer) dono yahi rules use karte hain.

export const MOBILE_VALIDATION_MESSAGE = "Enter a 10-digit mobile number.";
export const EMAIL_VALIDATION_MESSAGE = "Enter a valid email address.";
export const GSTIN_VALIDATION_MESSAGE = "Enter a valid 15-character GSTIN (e.g. 07ABCDE1234F1Z5).";
export const PINCODE_VALIDATION_MESSAGE = "Enter a 6-digit pincode.";

// "+91 98765-43210" -> "9876543210"
export const normalizeMobileNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
};

export const isValidMobileNumber = (value: string) => /^\d{10}$/.test(normalizeMobileNumber(value));

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const normalizeGstin = (value: string) => value.replace(/\s/g, "").toUpperCase();

// 2 digit state code + PAN (5 letters, 4 digits, 1 letter) + entity no + Z + checksum.
export const isValidGstin = (value: string) =>
  /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalizeGstin(value));

export const isValidPincode = (value: string) => /^[1-9]\d{5}$/.test(value.trim());
