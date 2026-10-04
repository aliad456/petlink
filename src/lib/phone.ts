// Phone formats a business may list. A regular Israeli number (03-…, 050-…, +972…),
// a star number (*3703) or a 1-700 / 1-800 / 1-599 line. Personal numbers (sign-up,
// bookings, claims) and WhatsApp stay regular numbers only (PERSONAL_PHONE).
export const PERSONAL_PHONE = /^(\+972|0)[\d\s-]{8,13}$/;
export const BUSINESS_PHONE = /^(?:(?:\+972|0)[\d\s-]{8,13}|\*\d{2,6}|1-?[5789]00[\d\s-]{6,8})$/;
export const BUSINESS_PHONE_HINT = "מספר טלפון לא תקין (אפשר גם כוכבית כמו *3703, או 1-700 / 1-800)";
