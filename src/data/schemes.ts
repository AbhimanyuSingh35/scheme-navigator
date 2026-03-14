// src/data/schemes.ts
// Curated dataset of Indian Government Schemes
// In production, replace/extend with data from myScheme API or data.gov.in

export interface Scheme {
  id: string;
  name: string;
  ministry: string;
  type: "central" | "state";
  state?: string;
  targetAudience: string[];
  eligibility: {
    minAge?: number;
    maxAge?: number;
    maxIncome?: number; // in rupees per year
    occupation?: string[];
    gender?: string[]; // "male" | "female" | "transgender" | "any"
    landOwnership?: boolean;
    bplCard?: boolean;
    disability?: boolean;
    statesAvailable?: string[]; // empty = all states
  };
  benefits: string;
  benefitAmount?: string;
  requiredDocuments: string[];
  applicationSteps: string[];
  applicationUrl: string;
  officialUrl: string;
  category: string[];
}

export const SCHEMES: Scheme[] = [
  // ─── AGRICULTURE ───────────────────────────────────────────────────────────
  {
    id: "PM-KISAN",
    name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    type: "central",
    targetAudience: ["farmers", "rural"],
    eligibility: {
      maxIncome: 200000,
      occupation: ["farmer"],
      landOwnership: true,
    },
    benefits: "Direct income support of ₹6,000 per year in 3 installments of ₹2,000",
    benefitAmount: "₹6,000/year",
    requiredDocuments: [
      "Aadhaar card",
      "Land ownership certificate / Khatauni",
      "Bank account passbook",
      "Mobile number linked to Aadhaar",
    ],
    applicationSteps: [
      "Visit pmkisan.gov.in",
      "Click 'Farmers Corner' → 'New Farmer Registration'",
      "Enter Aadhaar number and state",
      "Fill personal and land details",
      "Submit — verification by local Patwari/Revenue Officer",
    ],
    applicationUrl: "https://pmkisan.gov.in",
    officialUrl: "https://pmkisan.gov.in",
    category: ["agriculture", "income support", "rural"],
  },
  {
    id: "PM-FASAL-BIMA",
    name: "PM Fasal Bima Yojana (Crop Insurance)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    type: "central",
    targetAudience: ["farmers"],
    eligibility: {
      occupation: ["farmer"],
      landOwnership: true,
    },
    benefits: "Crop insurance covering natural calamities, pests, and diseases at very low premium",
    benefitAmount: "Up to full sum insured (varies by crop)",
    requiredDocuments: [
      "Aadhaar card",
      "Land records / Khasra-Khatoni",
      "Bank account details",
      "Sowing certificate",
    ],
    applicationSteps: [
      "Contact nearest bank or Common Service Centre (CSC)",
      "Fill PMFBY application form",
      "Submit land and crop details",
      "Pay nominal premium (1.5–5% depending on crop)",
    ],
    applicationUrl: "https://pmfby.gov.in",
    officialUrl: "https://pmfby.gov.in",
    category: ["agriculture", "insurance"],
  },
  {
    id: "SOIL-HEALTH-CARD",
    name: "Soil Health Card Scheme",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    type: "central",
    targetAudience: ["farmers"],
    eligibility: {
      occupation: ["farmer"],
    },
    benefits: "Free soil testing every 2 years with nutrient recommendations to improve yield",
    benefitAmount: "Free soil testing + expert fertilizer recommendations",
    requiredDocuments: ["Aadhaar card", "Land details"],
    applicationSteps: [
      "Visit nearest Krishi Vigyan Kendra or Agriculture office",
      "Submit soil sample from your field",
      "Receive Soil Health Card within 3 months",
    ],
    applicationUrl: "https://soilhealth.dac.gov.in",
    officialUrl: "https://soilhealth.dac.gov.in",
    category: ["agriculture", "free service"],
  },
  {
    id: "KISAN-CREDIT-CARD",
    name: "Kisan Credit Card (KCC)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    type: "central",
    targetAudience: ["farmers"],
    eligibility: {
      occupation: ["farmer"],
      landOwnership: true,
    },
    benefits: "Short-term credit up to ₹3 lakh at subsidized 4% interest rate for crop cultivation",
    benefitAmount: "Credit up to ₹3,00,000 at 4% p.a.",
    requiredDocuments: [
      "Aadhaar card",
      "Land records",
      "Passport-sized photographs",
      "Bank account",
    ],
    applicationSteps: [
      "Visit nearest bank branch",
      "Fill KCC application form",
      "Submit land documents for verification",
      "Card issued within 14 days",
    ],
    applicationUrl: "https://agricoop.nic.in",
    officialUrl: "https://agricoop.nic.in",
    category: ["agriculture", "credit", "loan"],
  },

  // ─── HOUSING ───────────────────────────────────────────────────────────────
  {
    id: "PMAY-GRAMIN",
    name: "PM Awas Yojana - Gramin (Rural Housing)",
    ministry: "Ministry of Rural Development",
    type: "central",
    targetAudience: ["rural", "bpl", "homeless"],
    eligibility: {
      bplCard: true,
      maxIncome: 200000,
    },
    benefits: "Financial assistance to construct pucca house — ₹1.20 lakh in plains, ₹1.30 lakh in hills/NE",
    benefitAmount: "₹1.20–1.30 lakh",
    requiredDocuments: [
      "Aadhaar card",
      "BPL ration card",
      "Bank account",
      "SECC-2011 registration",
    ],
    applicationSteps: [
      "Contact Gram Panchayat office",
      "Verify name in SECC-2011 beneficiary list",
      "Fill application at Gram Panchayat",
      "Funds transferred directly to bank account",
    ],
    applicationUrl: "https://pmayg.nic.in",
    officialUrl: "https://pmayg.nic.in",
    category: ["housing", "rural", "bpl"],
  },
  {
    id: "PMAY-URBAN",
    name: "PM Awas Yojana - Urban (Urban Housing)",
    ministry: "Ministry of Housing & Urban Affairs",
    type: "central",
    targetAudience: ["urban", "ews", "lig"],
    eligibility: {
      maxIncome: 1800000,
    },
    benefits: "Interest subsidy of 3–6.5% on home loans for EWS/LIG/MIG beneficiaries",
    benefitAmount: "Interest subsidy up to ₹2.67 lakh",
    requiredDocuments: [
      "Aadhaar card",
      "Income certificate",
      "Bank account",
      "Property documents",
    ],
    applicationSteps: [
      "Apply through bank/housing finance company",
      "Submit income proof and Aadhaar",
      "Loan sanctioned with subsidy applied",
    ],
    applicationUrl: "https://pmaymis.gov.in",
    officialUrl: "https://pmaymis.gov.in",
    category: ["housing", "urban", "loan", "subsidy"],
  },

  // ─── HEALTH ────────────────────────────────────────────────────────────────
  {
    id: "AYUSHMAN-BHARAT",
    name: "Ayushman Bharat - PM Jan Arogya Yojana",
    ministry: "Ministry of Health & Family Welfare",
    type: "central",
    targetAudience: ["bpl", "rural", "urban poor"],
    eligibility: {
      bplCard: true,
      maxIncome: 200000,
    },
    benefits: "Health insurance cover of ₹5 lakh per family per year for hospitalization",
    benefitAmount: "₹5,00,000/year health cover",
    requiredDocuments: ["Aadhaar card", "Ration card", "SECC 2011 registration"],
    applicationSteps: [
      "Check eligibility at pmjay.gov.in",
      "Visit empanelled hospital with Aadhaar",
      "Beneficiary receives Ayushman card",
      "Cashless treatment at 25,000+ hospitals",
    ],
    applicationUrl: "https://pmjay.gov.in",
    officialUrl: "https://pmjay.gov.in",
    category: ["health", "insurance", "bpl"],
  },

  // ─── EDUCATION / SCHOLARSHIPS ──────────────────────────────────────────────
  {
    id: "NSP-PRE-MATRIC",
    name: "National Scholarship - Pre-Matric (SC/ST/OBC/Minority)",
    ministry: "Ministry of Social Justice / Tribal Affairs / Minority Affairs",
    type: "central",
    targetAudience: ["students", "sc", "st", "obc", "minority"],
    eligibility: {
      minAge: 5,
      maxAge: 18,
      maxIncome: 250000,
    },
    benefits: "Annual scholarship for tuition fee and maintenance to SC/ST/OBC/minority students",
    benefitAmount: "₹1,000–₹3,500/year",
    requiredDocuments: [
      "Aadhaar card",
      "Caste certificate",
      "Income certificate",
      "Previous year marksheet",
      "Bank account",
    ],
    applicationSteps: [
      "Register at scholarships.gov.in (National Scholarship Portal)",
      "Fill application with personal and academic details",
      "Upload caste and income certificates",
      "Submit before deadline (usually October)",
    ],
    applicationUrl: "https://scholarships.gov.in",
    officialUrl: "https://scholarships.gov.in",
    category: ["education", "scholarship", "sc/st/obc"],
  },
  {
    id: "NSP-POST-MATRIC",
    name: "National Scholarship - Post-Matric (SC/ST/OBC/Minority)",
    ministry: "Ministry of Social Justice / Tribal Affairs / Minority Affairs",
    type: "central",
    targetAudience: ["students", "sc", "st", "obc", "minority"],
    eligibility: {
      minAge: 15,
      maxAge: 30,
      maxIncome: 250000,
    },
    benefits: "Scholarship covering tuition, maintenance, and study materials for Class 11 and above",
    benefitAmount: "₹3,000–₹12,000/year",
    requiredDocuments: [
      "Aadhaar card",
      "Caste certificate",
      "Income certificate",
      "Previous year marksheet",
      "Bank account",
      "Bonafide certificate from institution",
    ],
    applicationSteps: [
      "Register at scholarships.gov.in",
      "Select 'Post Matric Scholarship' scheme",
      "Fill details and upload documents",
      "Verify through institution",
    ],
    applicationUrl: "https://scholarships.gov.in",
    officialUrl: "https://scholarships.gov.in",
    category: ["education", "scholarship", "sc/st/obc", "higher education"],
  },
  {
    id: "BETI-BACHAO-SCHOLARSHIP",
    name: "Beti Bachao Beti Padhao - Girl Education Support",
    ministry: "Ministry of Women and Child Development",
    type: "central",
    targetAudience: ["students", "female", "girls"],
    eligibility: {
      gender: ["female"],
      maxIncome: 300000,
    },
    benefits: "Financial support and free education incentives for girl students",
    benefitAmount: "Varies by state (₹2,000–₹10,000)",
    requiredDocuments: [
      "Aadhaar card",
      "Birth certificate",
      "School enrollment proof",
      "Income certificate",
    ],
    applicationSteps: [
      "Contact nearest Anganwadi or school",
      "Submit enrollment form",
      "Benefits credited directly to girl child's bank account",
    ],
    applicationUrl: "https://wcd.nic.in",
    officialUrl: "https://wcd.nic.in",
    category: ["education", "women", "girls"],
  },
  {
    id: "CBSE-MERIT-SCHOLARSHIP",
    name: "Central Sector Scholarship for College Students",
    ministry: "Ministry of Education",
    type: "central",
    targetAudience: ["students", "college"],
    eligibility: {
      minAge: 17,
      maxAge: 25,
      maxIncome: 450000,
    },
    benefits: "₹10,000/year for first 3 years of graduation and ₹20,000/year for PG",
    benefitAmount: "₹10,000–₹20,000/year",
    requiredDocuments: [
      "Aadhaar card",
      "Class 12 marksheet",
      "Income certificate",
      "College admission proof",
    ],
    applicationSteps: [
      "Register at scholarships.gov.in",
      "Select Central Sector Scholarship",
      "Upload Class 12 marksheet and income proof",
      "Verify through college",
    ],
    applicationUrl: "https://scholarships.gov.in",
    officialUrl: "https://scholarships.gov.in",
    category: ["education", "scholarship", "college"],
  },

  // ─── WOMEN ENTREPRENEURSHIP ────────────────────────────────────────────────
  {
    id: "MUDRA-SHISHU",
    name: "PM MUDRA Yojana - Shishu (Micro Business Loan)",
    ministry: "Ministry of Finance",
    type: "central",
    targetAudience: ["entrepreneurs", "small business", "women"],
    eligibility: {
      occupation: ["entrepreneur", "self-employed", "small business"],
    },
    benefits: "Collateral-free loan up to ₹50,000 for micro businesses",
    benefitAmount: "Up to ₹50,000 loan",
    requiredDocuments: [
      "Aadhaar card",
      "PAN card",
      "Business plan/description",
      "Bank account",
      "Address proof",
    ],
    applicationSteps: [
      "Visit any bank, NBFC, or MFI",
      "Fill Mudra loan application",
      "Submit business details",
      "Loan disbursed within 7 days",
    ],
    applicationUrl: "https://mudra.org.in",
    officialUrl: "https://mudra.org.in",
    category: ["loan", "entrepreneurship", "business"],
  },
  {
    id: "MUDRA-KISHOR",
    name: "PM MUDRA Yojana - Kishor (Growth Business Loan)",
    ministry: "Ministry of Finance",
    type: "central",
    targetAudience: ["entrepreneurs", "small business", "women"],
    eligibility: {
      occupation: ["entrepreneur", "self-employed", "small business"],
    },
    benefits: "Collateral-free loan from ₹50,001 to ₹5 lakh for growing businesses",
    benefitAmount: "₹50,001 to ₹5,00,000 loan",
    requiredDocuments: [
      "Aadhaar card",
      "PAN card",
      "Business proof / 2-year ITR",
      "Bank statements (6 months)",
    ],
    applicationSteps: [
      "Visit bank with 2-year business track record",
      "Submit financial statements",
      "Business assessment by bank",
      "Loan sanctioned within 14 days",
    ],
    applicationUrl: "https://mudra.org.in",
    officialUrl: "https://mudra.org.in",
    category: ["loan", "entrepreneurship", "business"],
  },
  {
    id: "STANDUP-INDIA",
    name: "Stand-Up India Scheme",
    ministry: "Ministry of Finance",
    type: "central",
    targetAudience: ["entrepreneurs", "women", "sc", "st"],
    eligibility: {
      occupation: ["entrepreneur"],
      gender: ["female", "any"], // SC/ST can be any gender
    },
    benefits: "Bank loans from ₹10 lakh to ₹1 crore for greenfield enterprises for SC/ST/Women",
    benefitAmount: "₹10 lakh to ₹1 crore",
    requiredDocuments: [
      "Aadhaar card",
      "PAN card",
      "Business plan",
      "Caste certificate (if SC/ST)",
      "Project report",
    ],
    applicationSteps: [
      "Apply at standupmitra.in",
      "Or visit any Scheduled Commercial Bank branch",
      "Submit business plan and documents",
      "Loan sanctioned with margin money support",
    ],
    applicationUrl: "https://standupmitra.in",
    officialUrl: "https://standupmitra.in",
    category: ["loan", "entrepreneurship", "women", "sc/st"],
  },

  // ─── SKILL DEVELOPMENT ─────────────────────────────────────────────────────
  {
    id: "PMKVY",
    name: "PM Kaushal Vikas Yojana (PMKVY) - Skill India",
    ministry: "Ministry of Skill Development & Entrepreneurship",
    type: "central",
    targetAudience: ["youth", "students", "unemployed", "rural"],
    eligibility: {
      minAge: 15,
      maxAge: 45,
    },
    benefits: "Free skill training in 200+ courses with certification and placement assistance",
    benefitAmount: "Free training + ₹500 reward post certification",
    requiredDocuments: ["Aadhaar card", "Age proof", "Educational certificates"],
    applicationSteps: [
      "Visit skillindia.gov.in or pmkvyofficial.org",
      "Find nearest training center",
      "Enroll in chosen skill course",
      "Complete training and appear for assessment",
      "Receive NSQF-certified certificate",
    ],
    applicationUrl: "https://skillindia.gov.in",
    officialUrl: "https://pmkvyofficial.org",
    category: ["skill development", "employment", "youth"],
  },

  // ─── PENSION / ELDERLY ─────────────────────────────────────────────────────
  {
    id: "IGNOAPS",
    name: "Indira Gandhi National Old Age Pension Scheme",
    ministry: "Ministry of Rural Development",
    type: "central",
    targetAudience: ["elderly", "senior citizens", "bpl"],
    eligibility: {
      minAge: 60,
      bplCard: true,
      maxIncome: 100000,
    },
    benefits: "Monthly pension of ₹200 (60-79 years) or ₹500 (80+ years) from central government",
    benefitAmount: "₹200–₹500/month (more with state top-up)",
    requiredDocuments: [
      "Aadhaar card",
      "Age proof (birth certificate or school certificate)",
      "BPL card",
      "Bank account",
    ],
    applicationSteps: [
      "Apply at Gram Panchayat (rural) or Municipal office (urban)",
      "Submit age proof and BPL documents",
      "Verification by local officials",
      "Pension credited monthly to bank account",
    ],
    applicationUrl: "https://nsap.nic.in",
    officialUrl: "https://nsap.nic.in",
    category: ["pension", "elderly", "bpl", "social security"],
  },

  // ─── HIMACHAL PRADESH STATE SCHEMES ────────────────────────────────────────
  {
    id: "HP-SAHARA",
    name: "Himachal Pradesh Sahara Yojana",
    ministry: "Himachal Pradesh Government",
    type: "state",
    state: "himachal pradesh",
    targetAudience: ["bpl", "seriously ill"],
    eligibility: {
      maxIncome: 400000,
      bplCard: true,
    },
    benefits: "₹3,000/month financial assistance for patients with serious illnesses like cancer, kidney failure etc.",
    benefitAmount: "₹3,000/month",
    requiredDocuments: [
      "Aadhaar card",
      "Medical certificate from government hospital",
      "Income certificate",
      "BPL card",
      "Bank account",
    ],
    applicationSteps: [
      "Apply at nearest CHC/District Hospital",
      "Medical officer certifies condition",
      "Submit to District Welfare Officer",
      "Monthly benefit credited to account",
    ],
    applicationUrl: "https://himachal.nic.in",
    officialUrl: "https://himachal.nic.in",
    category: ["health", "bpl", "state scheme"],
  },
  {
    id: "HP-MUKHYAMANTRI-KHET-SANRAKSHAN",
    name: "HP Mukhyamantri Khet Sanrakshan Yojana",
    ministry: "Himachal Pradesh Agriculture Department",
    type: "state",
    state: "himachal pradesh",
    targetAudience: ["farmers"],
    eligibility: {
      occupation: ["farmer"],
      landOwnership: true,
    },
    benefits: "80% subsidy on fencing materials (barbed wire, iron angles) to protect crops from wild animals",
    benefitAmount: "80% subsidy on fencing",
    requiredDocuments: [
      "Aadhaar card",
      "Land ownership document",
      "HP domicile certificate",
    ],
    applicationSteps: [
      "Apply at nearest Agriculture Development Officer office",
      "Submit land documents",
      "Approval within 30 days",
      "Purchase fencing materials from approved vendors",
    ],
    applicationUrl: "https://himachal.nic.in/agriculture",
    officialUrl: "https://himachal.nic.in",
    category: ["agriculture", "subsidy", "state scheme"],
  },
  {
    id: "HP-BETI-HAI-ANMOL",
    name: "HP Beti Hai Anmol Yojana",
    ministry: "Himachal Pradesh Women & Child Development",
    type: "state",
    state: "himachal pradesh",
    targetAudience: ["girls", "female", "bpl"],
    eligibility: {
      gender: ["female"],
      bplCard: true,
    },
    benefits: "₹10,000 deposited in girl child's account at birth; additional scholarships from Class 1 to 12",
    benefitAmount: "₹10,000 at birth + ₹300–₹12,000 annual scholarship",
    requiredDocuments: [
      "Birth certificate",
      "BPL ration card",
      "Aadhaar card of mother",
      "Bank account in girl's name",
    ],
    applicationSteps: [
      "Apply at Anganwadi centre within 1 year of birth",
      "Submit birth certificate and BPL card",
      "Amount deposited in post office / bank account",
    ],
    applicationUrl: "https://himachal.nic.in/wcd",
    officialUrl: "https://himachal.nic.in",
    category: ["women", "girls", "education", "state scheme"],
  },
];

export function getAllSchemes(): Scheme[] {
  return SCHEMES;
}

export function searchSchemes(query: {
  state?: string;
  occupation?: string;
  income?: number;
  age?: number;
  gender?: string;
}): Scheme[] {
  return SCHEMES.filter((scheme) => {
    // Filter by state (central schemes are always included)
    if (scheme.type === "state" && query.state) {
      const schemeState = scheme.state?.toLowerCase() ?? "";
      const userState = query.state.toLowerCase();
      if (!schemeState.includes(userState) && !userState.includes(schemeState)) {
        return false;
      }
    }

    // Filter by income
    if (query.income && scheme.eligibility.maxIncome) {
      if (query.income > scheme.eligibility.maxIncome) return false;
    }

    // Filter by age
    if (query.age) {
      if (scheme.eligibility.minAge && query.age < scheme.eligibility.minAge) return false;
      if (scheme.eligibility.maxAge && query.age > scheme.eligibility.maxAge) return false;
    }

    return true;
  });
}
