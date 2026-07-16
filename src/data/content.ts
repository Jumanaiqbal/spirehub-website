export const navLinks = [
  { label: "Events", href: "#events" },
  { label: "Mentors", href: "#mentors" },
  { label: "Membership", href: "#membership" },
  { label: "Meeting Rooms", href: "#meeting-rooms" },
];

interface Stat {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export const stats: Stat[] = [
  { value: 300, suffix: "+", label: "Startups Supported" },
  { value: 10, suffix: "+", label: "Industry Mentors" },
  { value: 5000, suffix: "+", label: "Event Attendees" },
  { value: 500, suffix: "+", label: "Events Hosted" },
];

export const features = [
  {
    title: "Expert Mentors",
    description: "Personalized guidance from industry leaders.",
    icon: "users",
  },
  {
    title: "Scale Faster",
    description: "Programs and resources designed for growth.",
    icon: "trending",
  },
  {
    title: "Premium Space",
    description: "Work, meet, and connect in inspiring environments.",
    icon: "building",
  },
  {
    title: "Lead the Future",
    description: "Join a community of bold founders and innovators.",
    icon: "sparkles",
  },
];


export const membershipPlans = {
  standard: [
    {
      name: "Flex",
      description: "Shared Workspace Membership for one person.",
      monthly: 35,
      yearly: 350,
      icon: "plane",
      features: [
        "Shared workspace access (1 person)",
        "Limited meeting room access",
        "Free tea and water",
        "Free internet",
        "50% discount on workshop room",
        "No extra or hidden charges",
      ],
      popular: true,
    },
    {
      name: "Base",
      description: "Fixed Desk in Shared Space for one person.",
      monthly: 60,
      yearly: 600,
      icon: "rocket",
      features: [
        "Fixed desk in shared space (1 person)",
        "Limited meeting room access",
        "Free tea and water",
        "Free internet",
        "50% discount on workshop room",
        "No extra or hidden charges",
      ],
      popular: false,
    },
    {
      name: "Solo",
      description: "Private Office for 1 person.",
      monthly: 100,
      yearly: 1000,
      icon: "chart",
      features: [
        "Private office (1 person)",
        "Limited meeting room access",
        "Free tea and water",
        "Free internet",
        "50% discount on workshop room",
        "No extra or hidden charges",
      ],
      popular: false,
    },
    {
      name: "Team",
      description: "Private Office for 3 people.",
      monthly: 150,
      yearly: 1500,
      icon: "building",
      features: [
        "Private office (3 people)",
        "Limited meeting room access",
        "Free tea and water",
        "Free internet",
        "50% discount on workshop room",
        "No extra or hidden charges",
      ],
      popular: false,
    },
  ],
  plus: [
    {
      name: "Flex+",
      description: "Shared Workspace Membership with CR address.",
      monthly: 100,
      yearly: 1000,
      icon: "plane",
      features: [
        "Shared workspace access (1 person)",
        "CR address included (EWA & municipality)",
        "Unlimited meeting room access",
        "Free tea and water",
        "Free internet",
        "50% discount on workshop room",
        "No extra or hidden charges",
      ],
      popular: true,
    },
    {
      name: "Base+",
      description: "Fixed Desk in Shared Space with CR address.",
      monthly: 125,
      yearly: 1200,
      icon: "rocket",
      features: [
        "Fixed desk in shared space (1 person)",
        "CR address included (EWA & municipality)",
        "Unlimited meeting room access",
        "Free tea and water",
        "Free internet",
        "50% discount on workshop room",
        "No extra or hidden charges",
      ],
      popular: false,
    },
    {
      name: "Solo+",
      description: "Private Office with CR address.",
      monthly: 165,
      yearly: 1650,
      icon: "chart",
      features: [
        "Private office for 1 person",
        "CR address included (EWA & municipality)",
        "Unlimited meeting room access",
        "Free tea and water",
        "Free internet",
        "50% discount on workshop room",
        "No extra or hidden charges",
      ],
      popular: false,
    },
    {
      name: "Team+",
      description: "Private Office for 3 persons with CR address.",
      monthly: 250,
      yearly: 2500,
      icon: "building",
      features: [
        "Private office for up to 3 people",
        "CR address included (EWA & municipality)",
        "Unlimited meeting room access",
        "Free tea and water",
        "Free internet",
        "50% discount on workshop room",
        "No extra or hidden charges",
      ],
      popular: false,
    },
  ],
};

export const testimonials = [
  {
    quote:
      "Spire Hub is full of energy! I'm completely satisfied with the place and team—it was the perfect spot at the perfect time.",
    name: "Ameera Hashem",
    role: "Founder of Arima Journey",
  },
  {
    quote:
      "Working alone felt different—now, I enjoy more interaction and networking, essential for any startup. Spire truly feels like my second home.",
    name: "Hussain Al Hesabi",
    role: "Founder of Beyond Management",
  },
  {
    quote:
      "Spire's innovation is felt from the moment you walk in—plus the aroma of fresh specialty coffee.",
    name: "Moez",
    role: "Founder of Sonar Innovation",
  },
];

export const footerLinks = {
  explore: [
    { label: "Events", href: "#events" },
    { label: "Mentors", href: "#mentors" },
    { label: "Membership", href: "#membership" },
  ],
};
