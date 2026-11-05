import type { LayoutProps } from "../types.js";

/** People: a round portrait (or the name's first letter), the name, the role, and a line of text. */
export function TeamLayout({ slide }: LayoutProps<"team">) {
  return <ul className="sf-team" data-count={slide.members.length}>{slide.members.map((member, index) => <li className="sf-member" key={index}>
    {member.image === undefined
      ? <span className="sf-avatar" aria-hidden="true">{Array.from(member.name)[0]?.toUpperCase()}</span>
      : <img className="sf-avatar" src={member.image} alt={member.name} />}
    <span className="sf-member-name">{member.name}</span>
    {member.role && <span className="sf-member-role">{member.role}</span>}
    {member.text && <span className="sf-member-text">{member.text}</span>}
  </li>)}</ul>;
}
