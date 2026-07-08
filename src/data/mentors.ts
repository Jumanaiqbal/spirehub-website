export interface Mentor {
  name: string;
  role: string;
  image: string;
  profileUrl?: string;
}

export const mentors: Mentor[] = [
  {
    name: "Ahmed Al Tattan",
    role: "Founder and Creative Director at Brandin' You",
    image: "/mentors/ahmed-al-tattan.png",
  },
  {
    name: "Husain Al Hesabi",
    role: "Founder of Beyond Business Consultancy",
    image: "/mentors/husain-al-hesabi.png",
  },
  {
    name: "Hamed Al Mahari",
    role: "Growth & Communication Expert — Driving Strategic Digital Success",
    image: "/mentors/hamad-al-mahari.png",
  },
  {
    name: "Mohamed Isa",
    role: "Transformative Leader | Strategic CFO & Board Member",
    image: "/mentors/mohamed-isa.png",
    profileUrl: "https://www.linkedin.com/in/mohdisa/",
  },
  {
    name: "Ameera Hashem",
    role: "Founder of Arima Journey|The Mindful Business Owner: Leading with Clarity & Calm" ,
    image: "/mentors/ameera-hashem.jpeg",
  },
];
