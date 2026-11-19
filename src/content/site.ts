type ProfileLink = {
  label: string;
  href: string;
  external: boolean;
};

export const profileLinks: ProfileLink[] = [
  { label: "GitHub", href: "https://github.com/thuliovs", external: true },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/thuliovs/",
    external: true,
  },
  { label: "Email", href: "mailto:contact@thulio.tech", external: false },
];
