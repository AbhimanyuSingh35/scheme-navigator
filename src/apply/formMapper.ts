// src/apply/formMapper.ts
// Maps a UserProfile to pre-filled form data for each scheme portal.

import type { UserProfile } from "../agents/profileAgent.js";

export interface FormField {
  fieldLabel: string;
  value: string;
  needsUserInput: boolean; // true = agent cannot fill this, user must
}

export interface SchemeFormMap {
  schemeId: string;
  portalName: string;
  loginUrl: string;
  loginMethod: "aadhaar_otp" | "username_password" | "mobile_otp";
  loginInstructions: string;
  fields: FormField[];
  postLoginSteps: string[];
}

function field(label: string, value: string, needsUser = false): FormField {
  return { fieldLabel: label, value, needsUserInput: needsUser };
}

function baseFields(profile: UserProfile): FormField[] {
  return [
    field("Full Name", "— enter your name as on Aadhaar", true),
    field("Aadhaar Number", "— enter your 12-digit Aadhaar", true),
    field("Mobile Number", "— enter Aadhaar-linked mobile", true),
    field("Gender", profile.gender === "unknown" ? "— please select" : profile.gender),
    field("State", profile.state === "unknown" ? "— please select" : titleCase(profile.state)),
  ];
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mapProfileToForm(schemeId: string, profile: UserProfile): SchemeFormMap | null {
  switch (schemeId) {
    case "PM-KISAN":
      return {
        schemeId,
        portalName: "PM-KISAN Portal",
        loginUrl: "https://pmkisan.gov.in/FarmerRegistration.aspx",
        loginMethod: "aadhaar_otp",
        loginInstructions:
          "Enter your 12-digit Aadhaar number → click Get OTP → enter the OTP sent to your Aadhaar-linked mobile number.",
        fields: [
          ...baseFields(profile),
          field("State", titleCase(profile.state)),
          field("District", "— please fill your district", true),
          field("Sub-District / Taluka", "— please fill", true),
          field("Village", "— please fill", true),
          field("Land in Hectares", "— 1 acre = 0.4 hectares", true),
          field("Khasra / Survey Number", "— from your land documents", true),
          field("Bank Account Number", "— savings account", true),
          field("IFSC Code", "— from bank passbook", true),
        ],
        postLoginSteps: [
          "Click 'Farmers Corner' → 'New Farmer Registration'",
          "Select Rural Farmer or Urban Farmer",
          "Enter Aadhaar and click Search",
          "Fill all highlighted fields using the values above",
          "Upload: Aadhaar copy + land ownership document",
          "Click Submit and note the Registration Number",
        ],
      };

    case "NSP-POST-MATRIC":
    case "NSP-PRE-MATRIC":
    case "CBSE-MERIT-SCHOLARSHIP":
      return {
        schemeId,
        portalName: "National Scholarship Portal",
        loginUrl: "https://scholarships.gov.in/fresh/newstudentRegisration",
        loginMethod: "mobile_otp",
        loginInstructions:
          "Click 'New Registration' → enter mobile number + email → enter OTP sent to your mobile.",
        fields: [
          ...baseFields(profile),
          field("Date of Birth", "— DD/MM/YYYY", true),
          field("Category", titleCase(profile.category)),
          field("Annual Family Income", `₹${profile.annualIncome.toLocaleString("en-IN")}`),
          field("State of Domicile", titleCase(profile.state)),
          field("Institute Name", "— your college or school name", true),
          field("Course / Class", "— e.g. B.Sc First Year", true),
          field("Previous Year Marks %", "— from marksheet", true),
          field("Bank Account Number", "— your own account", true),
          field("IFSC Code", "— from passbook", true),
        ],
        postLoginSteps: [
          "Click 'Application Form 2024-25' from dashboard",
          "Select your scholarship scheme from the dropdown",
          "Fill sections: Personal → Academic → Bank → Documents",
          "Upload: Aadhaar, income certificate, caste certificate, last marksheet",
          "Preview form carefully then click Final Submit",
          "Note the Application ID shown on confirmation page",
        ],
      };

    case "MUDRA-SHISHU":
    case "MUDRA-KISHOR":
      return {
        schemeId,
        portalName: "Udyami Mitra Portal",
        loginUrl: "https://udyamimitra.in/page/MudraLoans",
        loginMethod: "mobile_otp",
        loginInstructions:
          "Click 'Apply Now' under Mudra Loans → Register with mobile number → enter OTP.",
        fields: [
          ...baseFields(profile),
          field("Business Name", "— your business/shop name", true),
          field("Business Activity", "— e.g. Food stall, Tailoring, Repair shop", true),
          field("Loan Amount Required", schemeId === "MUDRA-SHISHU" ? "Up to ₹50,000" : "₹50,001 to ₹5,00,000"),
          field("Business Address", "— your shop/business address", true),
          field("Bank Name", "— preferred bank for loan", true),
          field("Annual Turnover", `₹${profile.annualIncome.toLocaleString("en-IN")} (approximate)`),
        ],
        postLoginSteps: [
          "Select 'Shishu' (up to ₹50k) or 'Kishor' (₹50k–₹5L) scheme",
          "Fill business details and loan requirement",
          "Upload: Aadhaar, PAN card, business proof, address proof",
          "Select nearest bank branch for loan processing",
          "Submit and note Application Reference Number",
        ],
      };

    case "AYUSHMAN-BHARAT":
      return {
        schemeId,
        portalName: "PM-JAY Portal",
        loginUrl: "https://beneficiary.nha.gov.in",
        loginMethod: "mobile_otp",
        loginInstructions:
          "Enter your mobile number → enter OTP → check if your family is already listed.",
        fields: [
          ...baseFields(profile),
          field("Ration Card Number", "— from your ration card", true),
          field("Head of Family Name", "— as on ration card", true),
        ],
        postLoginSteps: [
          "Search your name using Aadhaar or ration card number",
          "If found, click 'Get Ayushman Card'",
          "Verify with OTP",
          "Download or collect Ayushman Bharat card",
          "Use card at any empanelled hospital for cashless treatment",
        ],
      };

    case "PMAY-GRAMIN":
      return {
        schemeId,
        portalName: "PMAY-G Portal",
        loginUrl: "https://pmayg.nic.in",
        loginMethod: "aadhaar_otp",
        loginInstructions:
          "This scheme is applied through your Gram Panchayat. Visit GP office with documents.",
        fields: [
          ...baseFields(profile),
          field("BPL Registration Number", "— from BPL card", true),
          field("Panchayat Name", "— your Gram Panchayat", true),
          field("Block / Tehsil", "— your block name", true),
          field("Bank Account Number", "— for fund transfer", true),
          field("IFSC Code", "— from passbook", true),
        ],
        postLoginSteps: [
          "Visit your Gram Panchayat office with all documents",
          "Ask for PMAY-G application form",
          "Submit filled form with BPL card copy and Aadhaar",
          "Panchayat Secretary verifies and registers in system",
          "Track status at pmayg.nic.in using your registration number",
        ],
      };

    default:
      return null;
  }
}
