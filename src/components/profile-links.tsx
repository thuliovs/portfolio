import { ExternalIcon } from "@/components/icons";
import { profileLinks } from "@/content/site";

type ProfileLinksProps = {
  compact?: boolean;
};

export function ProfileLinks({ compact = false }: ProfileLinksProps) {
  return (
    <nav
      className={`profile-links${compact ? " compact" : ""}`}
      aria-label="Professional profiles"
    >
      {profileLinks.map((link) => (
        <a
          className="profile-link"
          href={link.href}
          key={link.label}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
        >
          {link.label}
          <ExternalIcon />
        </a>
      ))}
    </nav>
  );
}
