import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

/** The last slide: the title and subtitle as the farewell, and optional contact lines. */
export function ClosingLayout({ slide, variant }: LayoutProps<"closing">) {
  return <>
    {variant === "default" && <div className="sf-closing-rail" aria-hidden="true" />}
    {slide.contacts && slide.contacts.length > 0 && <ul className="sf-contacts">{slide.contacts.map((contact, index) => <li key={index}>
      <span className="sf-contact-label"><DisplayTextContent value={contact.label} size={variant === "centered" ? "card-body" : "author"} /></span><span className="sf-contact-value"><DisplayTextContent value={contact.value} size="author" /></span>
    </li>)}</ul>}
  </>;
}
