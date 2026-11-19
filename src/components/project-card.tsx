import Link from "next/link";
import { ArrowIcon } from "@/components/icons";

type ProjectCardProps = {
  index: string;
  title: string;
  description: string;
  tags: string[];
  href: string;
};

export function ProjectCard({
  index,
  title,
  description,
  tags,
  href,
}: ProjectCardProps) {
  return (
    <Link className="project-card" href={href} aria-label={`Read ${title} case study`}>
      <span className="project-number">{index}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        <ul className="tag-list" aria-label="Project categories">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
      <span className="project-arrow" aria-hidden="true">
        <ArrowIcon />
      </span>
    </Link>
  );
}
