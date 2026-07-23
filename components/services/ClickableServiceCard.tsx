import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  meta?: ReactNode;
};

export function ClickableServiceCard({ href, title, description, icon: Icon, meta }: Props) {
  return (
    <Link
      href={href}
      className="browseCard"
      aria-label={`Explorar ${title}`}
    >
      <div className="browseCardIcon">
        <Icon size={22} />
      </div>
      <div className="browseCardBody">
        <h3>{title}</h3>
        <p>{description}</p>
        {meta}
      </div>
      <span className="browseCardAction" aria-hidden="true">
        <ArrowRight size={18} />
      </span>
    </Link>
  );
}
